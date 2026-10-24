import { useCallback, useEffect, useState } from 'react'
import { Download, RefreshCw as Refresh, WifiOff } from 'lucide-react'
import { audio } from '../lib/audio'
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
  window.addEventListener('beforeinstallprompt', handler, { once: true })
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

export interface InstallButtonProps {
  onInstalled?: () => void
}

export function InstallButton({ onInstalled }: InstallButtonProps = {}) {
  const [show, setShow] = useState(false)
  const [installed, setInstalled] = useState(isInstalled())
  const [promptAvailable, setPromptAvailable] = useState(false)

  useEffect(() => {
    setInstalled(isInstalled())
    if (installed) {
      onInstalled?.()
      return
    }
    const unsubscribe = captureBeforeInstallPrompt()
    return unsubscribe
  }, [installed, onInstalled])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (deferredPrompt) {
      setPromptAvailable(true)
      return
    }
    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt = e
      setPromptAvailable(true)
    }
    window.addEventListener('beforeinstallprompt', handler, { once: true })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return
    clickSfx()
    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setPromptAvailable(false)
        setInstalled(true)
        onInstalled?.()
      }
    } catch {
      /* install dismissed or failed — silently continue */
    }
    deferredPrompt = null
  }, [onInstalled])

  if (installed) return null
  if (!promptAvailable) return null

  return (
    <button
      type="button"
      className="install-btn"
      onClick={install}
      aria-label="Install Cartoon Car Adventure"
    >
      <Download size={17} />
      <span>Install Game</span>
    </button>
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
