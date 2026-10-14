export interface AudioEngineCallbacks {
  onPlay: (id: string) => void
  onEnded: (id: string) => void
  onError: (id: string, message: string) => void
  onProgress?: (time: number, duration: number) => void
  onAmbienceError?: (message: string) => void
}

let switchPool: HTMLAudioElement[] = []
let switchIdx = 0

function playSwitchClick() {
  if (switchPool.length === 0) {
    for (let i = 0; i < 3; i++) {
      const a = new Audio('/audio/switch.m4a')
      a.volume = 0.22
      a.preload = 'auto'
      switchPool.push(a)
    }
  }
  const a = switchPool[switchIdx]
  switchIdx = (switchIdx + 1) % switchPool.length
  a.currentTime = 0
  a.play().catch(() => {})
}

export { playSwitchClick }

const WAVE_BARS = 24

export class AudioEngine {
  private audio = new Audio()
  private currentId: string | null = null
  private volume = 1
  private callbacks: AudioEngineCallbacks

  private ambience = new Audio('/audio/ambience.mp3')
  private ambienceOn = false

  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaElementAudioSourceNode | null = null
  private waveData = new Uint8Array(WAVE_BARS)
  private rafId = 0

  constructor(callbacks: AudioEngineCallbacks) {
    this.callbacks = callbacks
    this.audio.preload = 'auto'
    this.audio.addEventListener('ended', () => {
      const id = this.currentId
      this.currentId = null
      if (id) {
        this.callbacks.onProgress?.(0, this.audio.duration || 0)
        this.callbacks.onEnded(id)
      }
    })
    this.audio.addEventListener('timeupdate', () => {
      if (!this.currentId) return
      const d = this.audio.duration
      this.callbacks.onProgress?.(this.audio.currentTime, Number.isFinite(d) ? d : 0)
    })
    this.audio.addEventListener('error', () => {
      const id = this.currentId
      this.currentId = null
      if (id) {
        this.callbacks.onError(id, 'Audio file failed to load.')
      }
    })
    this.ambience.loop = true
    this.ambience.volume = 0.35
    this.ambience.preload = 'auto'
  }

  private ensureAnalyser() {
    if (this.ctx) return
    try {
      this.ctx = new AudioContext()
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 128
      this.analyser.smoothingTimeConstant = 0.75
      this.source = this.ctx.createMediaElementSource(this.audio)
      this.source.connect(this.analyser)
      this.analyser.connect(this.ctx.destination)
      this.waveData = new Uint8Array(this.analyser.frequencyBinCount)
    } catch {
      this.ctx = null
      this.analyser = null
    }
  }

  getWaveform(): Uint8Array | null {
    if (!this.analyser || !this.currentId || this.audio.paused) return null
    this.analyser.getByteFrequencyData(this.waveData)
    return this.waveData
  }

  get playingId() {
    return this.currentId
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v))
    this.audio.volume = this.volume
  }

  play(id: string) {
    if (this.currentId === id && !this.audio.paused) {
      this.stop()
      return
    }
    this.stop()
    this.ensureAnalyser()
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {})
    this.currentId = id
    this.audio.src = `/audio/${id}.mp3`
    this.audio.volume = this.volume
    document.title = `▶ ${id.replace(/-/g, ' ')} · Aviation Alerts`
    this.audio
      .play()
      .then(() => this.callbacks.onPlay(id))
      .catch((err: unknown) => {
        this.currentId = null
        document.title = 'Aviation Alerts — Warning Soundboard'
        const message =
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Playback was blocked by the browser. Click a card again.'
            : 'Audio file failed to play.'
        this.callbacks.onError(id, message)
      })
  }

  stop() {
    if (!this.audio.paused) this.audio.pause()
    this.audio.currentTime = 0
    const id = this.currentId
    this.currentId = null
    document.title = 'Aviation Alerts — Warning Soundboard'
    if (id) {
      this.callbacks.onProgress?.(0, 0)
      this.callbacks.onEnded(id)
    }
  }

  setAmbience(on: boolean) {
    this.ambienceOn = on
    if (on) {
      this.ambience.play().catch(() => {
        this.ambienceOn = false
        this.callbacks.onAmbienceError?.('Cabin ambience failed to load.')
      })
    } else {
      this.ambience.pause()
      this.ambience.currentTime = 0
    }
  }

  get isAmbienceOn() {
    return this.ambienceOn
  }

  destroy() {
    cancelAnimationFrame(this.rafId)
    this.ctx?.close().catch(() => {})
  }
}

export { WAVE_BARS }
