import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SOUNDS } from '../data/sounds'
import { AudioEngine, WAVE_BARS } from '../lib/audio'
import type { CategoryId } from '../types'
import { useLocalStorage } from './useLocalStorage'

export interface ManifestEntry {
  origin: string
  duration: number
  bytes: number
}

export function useSoundboard() {
  const [volume, setVolume] = useLocalStorage('aa:volume', 0.85)
  const [favorites, setFavorites] = useLocalStorage<string[]>('aa:favorites', [])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryId | 'all'>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [ambienceOn, setAmbienceOn] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [progress, setProgress] = useState({ t: 0, d: 0 })
  const [manifest, setManifest] = useState<Record<string, ManifestEntry> | null>(null)
  const [waveform, setWaveform] = useState<Uint8Array | null>(null)

  const engineRef = useRef<AudioEngine | null>(null)
  if (!engineRef.current) {
    engineRef.current = new AudioEngine({
      onPlay: (id) => {
        setPlayingId(id)
        setErrorId(null)
      },
      onEnded: () => {
        setPlayingId(null)
        setWaveform(null)
      },
      onError: (id, message) => {
        setPlayingId(null)
        setErrorId(id)
        setErrorMessage(message)
      },
      onProgress: (t, d) => setProgress({ t, d }),
      onAmbienceError: (message) => {
        setAmbienceOn(false)
        setErrorMessage(message)
      },
    })
  }

  // waveform rAF loop
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const data = engineRef.current?.getWaveform()
      if (data) setWaveform(new Uint8Array(data))
      else setWaveform(null)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

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
    const eng = engineRef.current
    return () => {
      eng?.stop()
      eng?.destroy()
    }
  }, [])

  const togglePlay = useCallback((id: string) => {
    setErrorId(null)
    setErrorMessage(null)
    engineRef.current?.play(id)
  }, [])

  const stopAll = useCallback(() => engineRef.current?.stop(), [])

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavorites((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      )
    },
    [setFavorites],
  )

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
      if (favoritesOnly && !favorites.includes(s.id)) return false
      if (query.trim()) {
        const q = query.trim().toLowerCase()
        const haystack = `${s.label} ${s.spoken} ${s.categories.join(' ')}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [category, favoritesOnly, favorites, query])

  const counts = useMemo(() => {
    const total = SOUNDS.length
    let available = 0
    for (const s of SOUNDS) {
      if (availability(s.id) === 'available') available += 1
    }
    return { total, available }
  }, [availability])

  const currentSound = playingId
    ? SOUNDS.find((s) => s.id === playingId) ?? null
    : null

  return {
    volume, setVolume,
    favorites, toggleFavorite,
    query, setQuery,
    category, setCategory,
    favoritesOnly, setFavoritesOnly,
    ambienceOn, setAmbienceOn,
    playingId, errorId, errorMessage,
    progress, waveform,
    manifest, filtered, counts, availability,
    togglePlay, stopAll, currentSound,
  }
}

export type Soundboard = ReturnType<typeof useSoundboard>
export { WAVE_BARS }
