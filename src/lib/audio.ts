export interface AudioEngineCallbacks {
  onPlay: (id: string) => void
  onEnded: (id: string) => void
  onError: (id: string, message: string) => void
  onProgress?: (time: number, duration: number) => void
  onAmbienceError?: (message: string) => void
}

let switchPool: HTMLAudioElement[] = []
let switchIdx = 0

// Warm switch click immediately
if (typeof Audio !== 'undefined') {
  for (let i = 0; i < 3; i++) {
    const a = new Audio('/audio/switch.m4a')
    a.volume = 0.22
    a.preload = 'auto'
    switchPool.push(a)
  }
}

const SWITCH_BASE_VOLUME = 0.22

function setSwitchVolume(v: number) {
  const vol = Math.min(1, Math.max(0, v)) * SWITCH_BASE_VOLUME
  for (const a of switchPool) a.volume = vol
}

function playSwitchClick() {
  if (switchPool.length === 0) return
  const a = switchPool[switchIdx]
  switchIdx = (switchIdx + 1) % switchPool.length
  a.currentTime = 0
  a.play().catch(() => {})
}

export { playSwitchClick, setSwitchVolume }

const WAVE_BARS = 24

// Shared audio graph — createMediaElementSource can only run once per element,
// and closing the context would mute the element forever (StrictMode double-mount).
let sharedCtx: AudioContext | null = null
let sharedAnalyser: AnalyserNode | null = null
const sourceMap = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>()

function getAnalyserFor(el: HTMLAudioElement): { ctx: AudioContext; analyser: AnalyserNode } | null {
  try {
    if (!sharedCtx || sharedCtx.state === 'closed') {
      sharedCtx = new AudioContext()
      sharedAnalyser = sharedCtx.createAnalyser()
      sharedAnalyser.fftSize = 128
      sharedAnalyser.smoothingTimeConstant = 0.75
      sharedAnalyser.connect(sharedCtx.destination)
    }
    if (!sharedAnalyser || !sharedCtx) return null
    if (!sourceMap.has(el)) {
      const src = sharedCtx.createMediaElementSource(el)
      src.connect(sharedAnalyser)
      sourceMap.set(el, src)
    }
    if (sharedCtx.state === 'suspended') sharedCtx.resume().catch(() => {})
    return { ctx: sharedCtx, analyser: sharedAnalyser }
  } catch {
    return null
  }
}

// Background preload pool — fetches files ahead of time so play() is instant
const preloadPool = new Map<string, HTMLAudioElement>()

export function preloadSound(id: string) {
  if (preloadPool.has(id)) return
  const a = new Audio()
  a.preload = 'auto'
  a.src = `/audio/${id}.mp3`
  preloadPool.set(id, a)
}

export function preloadSounds(ids: string[], concurrency = 6) {
  let i = 0
  const next = () => {
    while (i < ids.length) {
      const id = ids[i++]
      if (!preloadPool.has(id)) {
        preloadSound(id)
        // stagger to avoid network contention
        setTimeout(next, 120)
        return
      }
    }
  }
  for (let k = 0; k < concurrency; k++) setTimeout(next, k * 80)
}

export class AudioEngine {
  private audio = new Audio()
  private currentId: string | null = null
  private volume = 1
  private loopOn = false
  private callbacks: AudioEngineCallbacks

  private ambience = new Audio('/audio/ambience.mp3')
  private ambienceOn = false

  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private waveData = new Uint8Array(WAVE_BARS)

  constructor(callbacks: AudioEngineCallbacks) {
    this.callbacks = callbacks
    this.audio.preload = 'auto'
    this.audio.loop = false
    this.audio.addEventListener('ended', () => {
      const id = this.currentId
      this.currentId = null
      document.title = 'Aviation Alerts — Warning Soundboard'
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
      document.title = 'Aviation Alerts — Warning Soundboard'
      if (id) {
        this.callbacks.onError(id, 'Audio file failed to load.')
      }
    })
    this.ambience.loop = true
    this.ambience.volume = 0.35
    this.ambience.preload = 'auto'
  }

  private ensureAnalyser() {
    const g = getAnalyserFor(this.audio)
    if (g) {
      this.ctx = g.ctx
      this.analyser = g.analyser
      this.waveData = new Uint8Array(g.analyser.frequencyBinCount)
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
    this.ambience.volume = this.volume * 0.35
    setSwitchVolume(this.volume)
  }

  setLoop(on: boolean) {
    this.loopOn = on
    this.audio.loop = on
  }

  get isLoopOn() {
    return this.loopOn
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
    // Reuse preloaded element if available — avoids a network wait
    const pre = preloadPool.get(id)
    if (pre && pre.readyState >= 2) {
      this.audio.src = pre.src
    } else {
      this.audio.src = `/audio/${id}.mp3`
    }
    this.audio.volume = this.volume
    document.title = `▶ ${id.replace(/-/g, ' ').toUpperCase()} · AVIATION ALERTS`
    // Fire onPlay immediately for instant UI feedback
    this.callbacks.onPlay(id)
    this.audio
      .play()
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
    this.stop()
    this.setAmbience(false)
    // Do NOT close the shared AudioContext — the audio element stays
    // permanently routed through it and would go silent forever.
  }
}

export { WAVE_BARS }
