import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, RefreshCw as Refresh, WifiOff, X } from 'lucide-react'
import { clickSfx } from './ui'

/* ------------------------------------------------------------------ */
/*  Install prompt                                                    */
/* ------------------------------------------------------------------ */

let deferredPrompt: any = null

export function captureBeforeInstallPrompt() {
  if (typeof window === 'undefined') return
  const handler = (e: Event) => {
    e.preventDefault()
    deferredPrompt = e
  }
  // Persistent listener: the event can arrive late (after SW registration),
  // and the automatic popup checks for it during its retry window.
  window.addEventListener('beforeinstallprompt', handler)
  return () => window.removeEventListener('beforeinstallprompt', handler)
}

/**
 * Returns true if the app is already installed (running in standalone mode).
 */
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/* ------------------------------------------------------------------ */
/*  Automatic install popup (replaces the old permanent home button)  */
/* ------------------------------------------------------------------ */

const INSTALL_DISMISSED_KEY = 'cca-install-popup-dismissed'

function wasInstallDismissed(): boolean {
  try {
    return sessionStorage.getItem(INSTALL_DISMISSED_KEY) === '1'
  } catch {
    return true // storage unavailable — stay quiet rather than nag
  }
}

function markInstallDismissed(): void {
  try {
    sessionStorage.setItem(INSTALL_DISMISSED_KEY, '1')
  } catch {
    /* ignore */
  }
}

export interface InstallPopupProps {
  /** True while gameplay or another modal is active — the popup waits instead of interrupting. */
  busy?: boolean
}

export function InstallPopup({ busy = false }: InstallPopupProps) {
  const [visible, setVisible] = useState(false)
  const [installed, setInstalled] = useState(() => isInstalled())
  const busyRef = useRef(busy)
  busyRef.current = busy

  /* Single 10-second timer (no duplicates; cleared on unmount). */
  useEffect(() => {
    if (typeof window === 'undefined') return
    let cancelled = false
    let timer: number | null = null

    const attempt = (n: number) => {
      if (cancelled) return
      if (isInstalled() || wasInstallDismissed()) return
      if (busyRef.current) {
        // Never interrupt gameplay or another modal — retry briefly, then give up.
        if (n < 60) timer = window.setTimeout(() => attempt(n + 1), 2000)
        return
      }
      if (!deferredPrompt) {
        // Installation unsupported (or event not yet delivered) — never show a dead popup.
        if (n < 30) timer = window.setTimeout(() => attempt(n + 1), 2000)
        return
      }
      setVisible(true)
    }

    timer = window.setTimeout(() => attempt(0), 10_000)

    const onInstalled = () => {
      setInstalled(true)
      setVisible(false)
    }
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      cancelled = true
      if (timer !== null) window.clearTimeout(timer)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = useCallback(() => {
    clickSfx()
    markInstallDismissed()
    setVisible(false)
  }, [])

  const install = useCallback(async () => {
    clickSfx()
    if (!deferredPrompt) {
      // Installation became unavailable — close instead of showing a dead button.
      markInstallDismissed()
      setVisible(false)
      return
    }
    try {
      void deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice?.outcome !== 'accepted') markInstallDismissed()
    } catch {
      /* install dismissed or failed — silently continue */
    } finally {
      deferredPrompt = null
      setVisible(false)
    }
  }, [])

  // Derived: never sit on top of gameplay or another modal (waits until free).
  if (installed || !visible || busy) return null

  return (
    <div className="install-backdrop" role="dialog" aria-modal="true" aria-label="Install Cartoon Car Adventure">
      <div className="install-popup">
        <button type="button" className="modal-close" onClick={dismiss} aria-label="Close install prompt">
          <X size={18} strokeWidth={3.2} />
        </button>
        <img className="install-popup-icon" src="/icons/icon-192x192.png" alt="" draggable={false} />
        <h2>Install Cartoon Car Adventure</h2>
        <p>Install the game for quick access and an app-like experience.</p>
        <div className="install-popup-actions">
          <button type="button" className="big-btn green" onClick={install}>
            <Download size={19} />
            Install Now
          </button>
          <button type="button" className="big-btn neutral" onClick={dismiss}>
            Not Now
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Offline status indicator                                          */
/* ------------------------------------------------------------------ */

export interface OfflineIndicatorProps {
  className?: string
}

export function OfflineIndicator({ className }: OfflineIndicatorProps = {}) {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' && !navigator.onLine
  )
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onOnline = () => {
      setOffline(false)
      setShown(false)
    }
    const onOffline = () => {
      setOffline(true)
      setShown(true)
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (!offline || !shown) return null

  return (
    <div className={`offline-banner ${className ?? ''}`} role="status" aria-label="Offline — playing with cached data">
      <WifiOff size={16} strokeWidth={2} />
      <span>Offline — cached game data</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Service worker update prompt                                      */
/* ------------------------------------------------------------------ */

export interface UpdatePromptProps {
  needRefresh: boolean
  updateServiceWorker: () => void
}

export function UpdatePrompt({ needRefresh, updateServiceWorker }: UpdatePromptProps) {
  const [shown, setShown] = useState(needRefresh)

  const dismiss = useCallback(() => setShown(false), [])

  const applyUpdate = useCallback(() => {
    clickSfx()
    updateServiceWorker()
  }, [updateServiceWorker])

  if (!shown) return null

  return (
    <div className="update-banner" role="status" aria-label="App update available">
      <span>A new version of Cartoon Car Adventure is ready.</span>
      <div className="update-actions">
        <button type="button" className="big-btn blue" onClick={applyUpdate} aria-label="Update and reload">
          <Refresh size={18} />
          Update
        </button>
        <button type="button" className="big-btn neutral" onClick={dismiss} aria-label="Dismiss update">
          Later
        </button>
      </div>
    </div>
  )
}
