/* ------------------------------------------------------------------ */
/*  AudioManager — original synthesized SFX + music via Web Audio.   */
/*  No audio files required; everything degrades gracefully.         */
/* ------------------------------------------------------------------ */

type OscType = OscillatorType

class AudioManager {
  private ctx: AudioContext | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private musicVol = 0.55
  private sfxVol = 0.85
  private muted = false

  private musicTimer: number | null = null
  private nextNoteTime = 0
  private step = 0

  private engineOsc: OscillatorNode | null = null
  private engineOsc2: OscillatorNode | null = null
  private engineGain: GainNode | null = null
  private engineFilter: BiquadFilterNode | null = null

  /** Must be called from a user gesture at least once. Safe to call often. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AC) return
        this.ctx = new AC()
        this.musicGain = this.ctx.createGain()
        this.sfxGain = this.ctx.createGain()
        this.musicGain.connect(this.ctx.destination)
        this.sfxGain.connect(this.ctx.destination)
        this.applyVolumes()
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume()
    } catch {
      /* audio unavailable — stay silent */
    }
  }

  setVolumes(music: number, sfx: number, muted: boolean): void {
    this.musicVol = music
    this.sfxVol = sfx
    this.muted = muted
    this.applyVolumes()
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.musicGain || !this.sfxGain) return
    const t = this.ctx.currentTime
    this.musicGain.gain.setTargetAtTime(this.muted ? 0 : this.musicVol * 0.5, t, 0.05)
    this.sfxGain.gain.setTargetAtTime(this.muted ? 0 : this.sfxVol, t, 0.05)
  }

  private tone(
    freq: number,
    dur: number,
    opts: { type?: OscType; vol?: number; delay?: number; slideTo?: number; dest?: GainNode | null } = {},
  ): void {
    if (!this.ctx || !this.sfxGain) return
    try {
      const { type = 'sine', vol = 0.25, delay = 0, slideTo, dest } = opts
      const t0 = this.ctx.currentTime + delay
      const osc = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, t0)
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
      g.gain.setValueAtTime(0, t0)
      g.gain.linearRampToValueAtTime(vol, t0 + 0.012)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
      osc.connect(g)
      g.connect(dest ?? this.sfxGain)
      osc.start(t0)
      osc.stop(t0 + dur + 0.05)
    } catch {
      /* ignore */
    }
  }

  private noise(dur: number, vol: number, filterFreq: number, delay = 0): void {
    if (!this.ctx || !this.sfxGain) return
    try {
      const t0 = this.ctx.currentTime + delay
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur))
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
      const src = this.ctx.createBufferSource()
      src.buffer = buffer
      const filter = this.ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = filterFreq
      const g = this.ctx.createGain()
      g.gain.setValueAtTime(vol, t0)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
      src.connect(filter)
      filter.connect(g)
      g.connect(this.sfxGain)
      src.start(t0)
    } catch {
      /* ignore */
    }
  }

  /* ------------------------------ SFX ------------------------------ */
  click(): void {
    this.tone(620, 0.07, { type: 'square', vol: 0.08, slideTo: 840 })
  }
  pop(): void {
    this.tone(340, 0.09, { type: 'sine', vol: 0.18, slideTo: 620 })
  }
  coin(): void {
    this.tone(988, 0.09, { type: 'sine', vol: 0.16 })
    this.tone(1319, 0.16, { type: 'sine', vol: 0.16, delay: 0.06 })
  }
  crash(): void {
    this.noise(0.28, 0.4, 900)
    this.tone(120, 0.3, { type: 'sawtooth', vol: 0.22, slideTo: 45 })
  }
  bump(): void {
    this.noise(0.14, 0.22, 1400)
    this.tone(200, 0.14, { type: 'triangle', vol: 0.16, slideTo: 110 })
  }
  shieldPop(): void {
    this.tone(520, 0.12, { type: 'triangle', vol: 0.2, slideTo: 260 })
    this.noise(0.12, 0.12, 2400)
  }
  whoosh(): void {
    this.noise(0.16, 0.08, 3200)
  }
  beep(final = false): void {
    this.tone(final ? 880 : 440, final ? 0.35 : 0.14, { type: 'square', vol: 0.12 })
  }
  win(): void {
    ;[523, 659, 784, 1047].forEach((f, i) =>
      this.tone(f, 0.22, { type: 'triangle', vol: 0.2, delay: i * 0.11 }),
    )
    this.tone(1319, 0.4, { type: 'triangle', vol: 0.18, delay: 0.46 })
  }
  lose(): void {
    ;[392, 330, 262, 196].forEach((f, i) =>
      this.tone(f, 0.24, { type: 'triangle', vol: 0.18, delay: i * 0.14 }),
    )
  }
  reward(): void {
    ;[784, 988, 1175, 1568].forEach((f, i) =>
      this.tone(f, 0.18, { type: 'sine', vol: 0.16, delay: i * 0.07 }),
    )
  }
  denied(): void {
    this.tone(180, 0.16, { type: 'square', vol: 0.1 })
    this.tone(150, 0.2, { type: 'square', vol: 0.1, delay: 0.1 })
  }

  /* ----------------------------- Engine ----------------------------- */
  startEngine(): void {
    if (!this.ctx || !this.sfxGain || this.engineOsc) return
    try {
      this.engineFilter = this.ctx.createBiquadFilter()
      this.engineFilter.type = 'lowpass'
      this.engineFilter.frequency.value = 420
      this.engineGain = this.ctx.createGain()
      this.engineGain.gain.value = 0
      this.engineOsc = this.ctx.createOscillator()
      this.engineOsc.type = 'sawtooth'
      this.engineOsc.frequency.value = 58
      this.engineOsc2 = this.ctx.createOscillator()
      this.engineOsc2.type = 'square'
      this.engineOsc2.frequency.value = 29
      const g2 = this.ctx.createGain()
      g2.gain.value = 0.5
      this.engineOsc.connect(this.engineFilter)
      this.engineOsc2.connect(g2)
      g2.connect(this.engineFilter)
      this.engineFilter.connect(this.engineGain)
      this.engineGain.connect(this.sfxGain)
      this.engineGain.gain.setTargetAtTime(0.05, this.ctx.currentTime, 0.2)
      this.engineOsc.start()
      this.engineOsc2.start()
    } catch {
      /* ignore */
    }
  }

  /** norm: 0 (stopped) .. 1 (top speed) */
  setEngine(norm: number): void {
    if (!this.ctx || !this.engineOsc || !this.engineOsc2 || !this.engineFilter || !this.engineGain) return
    const n = Math.max(0, Math.min(1, norm))
    const t = this.ctx.currentTime
    this.engineOsc.frequency.setTargetAtTime(58 + n * 110, t, 0.08)
    this.engineOsc2.frequency.setTargetAtTime(29 + n * 55, t, 0.08)
    this.engineFilter.frequency.setTargetAtTime(360 + n * 700, t, 0.1)
    this.engineGain.gain.setTargetAtTime(0.035 + n * 0.045, t, 0.1)
  }

  stopEngine(): void {
    try {
      if (this.ctx && this.engineGain) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08)
      }
      const osc = this.engineOsc
      const osc2 = this.engineOsc2
      window.setTimeout(() => {
        try { osc?.stop() } catch { /* noop */ }
        try { osc2?.stop() } catch { /* noop */ }
      }, 350)
    } catch {
      /* ignore */
    }
    this.engineOsc = null
    this.engineOsc2 = null
    this.engineGain = null
    this.engineFilter = null
  }

  /* ------------------------------ Music ------------------------------ */
  startMusic(): void {
    if (!this.ctx || this.musicTimer !== null) return
    this.step = 0
    this.nextNoteTime = this.ctx.currentTime + 0.08
    const tick = () => this.scheduleMusic()
    tick()
    this.musicTimer = window.setInterval(tick, 120)
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer)
      this.musicTimer = null
    }
  }

  private scheduleMusic(): void {
    if (!this.ctx || !this.musicGain) return
    const spb = 60 / 116 / 2 // 116 BPM, eighth notes
    // Cheerful C-major loop: C  G  Am F (2 bars of eighths each chord pair)
    const bassLine = [131, 98, 110, 87, 131, 98, 110, 87, 131, 98, 110, 87, 131, 98, 110, 87]
    const melody = [
      523, 0, 659, 0, 784, 0, 659, 0,
      587, 0, 523, 0, 440, 0, 523, 0,
      523, 0, 659, 0, 784, 0, 880, 0,
      784, 0, 659, 0, 523, 0, 0, 0,
    ]
    while (this.nextNoteTime < this.ctx.currentTime + 0.35) {
      const idx = this.step % 32
      const delay = Math.max(0, this.nextNoteTime - this.ctx.currentTime)
      const bass = bassLine[Math.floor(idx / 2) % 16]
      if (idx % 2 === 0) {
        this.tone(bass, spb * 1.8, { type: 'sine', vol: 0.22, delay, dest: this.musicGain })
      }
      const note = melody[idx]
      if (note > 0) {
        this.tone(note, spb * 1.6, { type: 'triangle', vol: 0.13, delay, dest: this.musicGain })
      }
      this.nextNoteTime += spb
      this.step += 1
    }
  }
}

export const audio = new AudioManager()
