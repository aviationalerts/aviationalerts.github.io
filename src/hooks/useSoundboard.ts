import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SOUNDS } from '../data/sounds'
import { AudioEngine, WAVE_BARS, preloadSounds } from '../lib/audio'
import type { CategoryId } from '../types'
import { useLocalStorage } from './useLocalStorage'

export interface ManifestEntry {
  origin: string
  duration: number
  bytes: number
}

export function useSoundboard() {
  const [volume, setVolume] = useLocalStorage('aa:volume', 0.85)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryId | 'all'>('all')
  const [ambienceOn, setAmbienceOn] = useState(false)
  const [loopOn, setLoopOn] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [progress, setProgress] = useState({ t: 0, d: 0 })
  const [manifest, setManifest] = useState<Record<string, ManifestEntry> | null>(null)
  const [waveform, setWaveform] = useState<Uint8Array | null>(null)
  const [sharedId, setSharedId] = useState<string | null>(() => {
    const s = new URLSearchParams(window.location.search).get('s')
    return s && SOUNDS.some((x) => x.id === s) ? s : null
  })

  const engineRef = useRef<AudioEngine | null>(null)
  if (!engineRef.current) {
    engineRef.current = new AudioEngine({
      onPlay: (id) => {
        setPlayingId(id)
      },
      onEnded: () => {
        setPlayingId(null)
        setWaveform(null)
      },
      onError: (_id, message) => {
        setPlayingId(null)
        setErrorMessage(message)
      },
      onProgress: (t, d) => setProgress({ t, d }),
      onAmbienceError: (message) => {
        setAmbienceOn(false)
        setErrorMessage(message)
      },
    })
  }

  // Warm the audio cache in the background so first play is instant.
  // Start shortly after mount — waiting for the full window load event (plus
  // an idle callback) meant an early first click hit an empty audio cache.
  useEffect(() => {
    const t = window.setTimeout(() => {
      preloadSounds(SOUNDS.map((s) => s.id))
    }, 500)
    return () => window.clearTimeout(t)
  }, [])

  // Waveform rAF loop — ONLY while something plays (throttled to ~30fps).
  // An always-on per-frame setState re-rendered the entire app 60×/sec
  // even when idle; the tile bars don't need more than 30fps anyway.
  useEffect(() => {
    if (!playingId) return
    let raf = 0
    let last = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (now - last < 32) return
      last = now
      const data = engineRef.current?.getWaveform()
      setWaveform(data ? new Uint8Array(data) : null)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playingId])

  useEffect(() => {
    engineRef.current?.setVolume(volume)
  }, [volume])

  useEffect(() => {
    let cancelled = false
    fetch('/audio/manifest.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { files?: Record<string, ManifestEntry> } | null) => {
        if (!cancelled && data?.files) setManifest(data.files)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    engineRef.current?.setAmbience(ambienceOn)
  }, [ambienceOn])

  useEffect(() => {
    engineRef.current?.setLoop(loopOn)
  }, [loopOn])

  useEffect(() => {
    const eng = engineRef.current
    return () => {
      eng?.stop()
      eng?.destroy()
    }
  }, [])

  const togglePlay = useCallback((id: string) => {
    setErrorMessage(null)
    const engine = engineRef.current
    // Clicking the playing sound stops it — so the share param must go too,
    // otherwise ?s= keeps pointing at silence
    const togglingOff = engine?.playingId === id
    engine?.play(id)
    const url = new URL(window.location.href)
    if (togglingOff) url.searchParams.delete('s')
    else url.searchParams.set('s', id)
    window.history.replaceState(null, '', url)
  }, [])

  const stopAll = useCallback(() => {
    engineRef.current?.stop()
    // Stop button means stop: silence cabin ambience too, not just the sound
    setAmbienceOn(false)
    engineRef.current?.setAmbience(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('s')
    window.history.replaceState(null, '', url)
  }, [])

  // Shared link (?s=id): App opens the board overlay; the sound is cued above

  const toggleLoop = useCallback(() => setLoopOn((v) => !v), [])

  const availability = useCallback(
    (id: string): 'available' | 'missing' | 'unknown' => {
      if (!manifest) return 'unknown'
      return manifest[id] ? 'available' : 'missing'
    },
    [manifest],
  )

  const filtered = useMemo(() => {
    return SOUNDS.filter((s) => {
      if (category !== 'all' && !s.categories.includes(category)) return false
      if (query.trim()) {
        const q = query.trim().toLowerCase()
        const haystack = `${s.label} ${s.spoken} ${s.categories.join(' ')}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [category, query])

  const counts = useMemo(() => ({ total: SOUNDS.length }), [])

  const currentSound = playingId
    ? SOUNDS.find((s) => s.id === playingId) ?? null
    : null

  return {
    volume, setVolume,
    query, setQuery,
    category, setCategory,
    ambienceOn, setAmbienceOn,
    loopOn, toggleLoop,
    playingId, errorMessage,
    progress, waveform,
    manifest, filtered, counts, availability,
    togglePlay, stopAll, currentSound,
    sharedId, clearSharedId: () => setSharedId(null),
  }
}

export type Soundboard = ReturnType<typeof useSoundboard>
export { WAVE_BARS }
