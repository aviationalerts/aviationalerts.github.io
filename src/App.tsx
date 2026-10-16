import { lazy, Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { Header } from './components/Header'
import { PlayerBar } from './components/PlayerBar'
import { Soundboard } from './components/Soundboard'
import { useSoundboard } from './hooks/useSoundboard'
import { playSwitchClick } from './lib/audio'
import { getSelectedPlaneId, setSelectedPlaneId, getPlaneById, preloadPlaneModels } from './data/planes'

const Experience = lazy(() => import('./three/Experience').then((m) => ({ default: m.Experience })))
const PlaneSelector = lazy(() => import('./components/PlaneSelector').then((m) => ({ default: m.PlaneSelector })))

function useScrollProgress() {
  const [p, setP] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      setP(max > 0 ? window.scrollY / max : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return p
}

function useReducedMotion() {
  const [r, setR] = useState(false)
  useEffect(() => {
    setR(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])
  return r
}

export default function App() {
  const sb = useSoundboard()
  const progress = useScrollProgress()
  const reducedMotion = useReducedMotion()

  const [planeId, setPlaneId] = useState(getSelectedPlaneId)
  const [showSelector, setShowSelector] = useState(false)
  const [showTapHint, setShowTapHint] = useState(false)

  const dismissTapHint = useCallback(() => {
    setShowTapHint(false)
    try {
      localStorage.setItem('aviation-alerts-tap-hint', '1')
    } catch { /* ignore */ }
  }, [])

  const handlePlaneLoaded = useCallback(() => {
    try {
      if (localStorage.getItem('aviation-alerts-tap-hint')) return
    } catch { return }
    setShowTapHint(true)
  }, [])

  useEffect(() => {
    if (!showTapHint) return
    const t = window.setTimeout(dismissTapHint, 5000)
    return () => window.clearTimeout(t)
  }, [showTapHint, dismissTapHint])

  useEffect(() => {
    preloadPlaneModels()
  }, [])

  // When the user starts searching, glide down to the soundboard
  const scrolledForSearchRef = useRef(false)
  useEffect(() => {
    if (sb.query && !scrolledForSearchRef.current) {
      scrolledForSearchRef.current = true
      document.getElementById('board')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else if (!sb.query) {
      scrolledForSearchRef.current = false
    }
  }, [sb.query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]')
      ) {
        playSwitchClick()
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const handlePlaneSelect = useCallback((id: string) => {
    setPlaneId(id)
    setSelectedPlaneId(id)
  }, [])

  const handlePlaneClick = useCallback(() => {
    setShowSelector(true)
    dismissTapHint()
  }, [dismissTapHint])

  const plane = getPlaneById(planeId)

  // section visibility based on scroll
  const showTitle = progress < 0.18
  const showAircraft = progress >= 0.12 && progress < 0.35
  const showSystems = progress >= 0.28 && progress < 0.68

  return (
    <>
      <Header sb={sb} />
      <Suspense fallback={null}>
        <Experience
          planeId={planeId}
          playingId={sb.playingId}
          reducedMotion={reducedMotion}
          onPlaneClick={handlePlaneClick}
          onPlaneLoaded={handlePlaneLoaded}
        />

        {/* Mount always (hidden) so its WebGL scene is ready before first click */}
        <PlaneSelector
          currentId={planeId}
          open={showSelector}
          onSelect={handlePlaneSelect}
          onClose={() => setShowSelector(false)}
        />
      </Suspense>

      {/* Scroll space — total height drives the 3D camera journey */}
      <div className="scroll-journey">
        {/* Scene 1: Title / Arrival */}
        <div className="scene-overlay scene-title" data-visible={showTitle}>
          <p className="hero-kicker">Cockpit warning sound library</p>
          <h1 className="scene-h1">
            <span className="line1">Aviation</span>
            <span className="line2">Alerts</span>
          </h1>
          <p className="scene-lede">
            {sb.counts.total} real GPWS, stall, windshear and radio-altimeter
            callouts — the voices that keep crews alive.
          </p>
          <div className="scene-cta-row">
            <a className="btn-primary" href="#board" data-testid="open-board">
              Enter soundboard ↓
            </a>
            <div className="hero-stats">
              <span>{sb.counts.total} channels</span>
              <span>Local audio</span>
              <span>Interactive 3D</span>
            </div>
          </div>
        </div>

        {/* Scene 2: Aircraft label */}
        <div className="scene-overlay scene-aircraft-label" data-visible={showAircraft}>
          <button className="ac-label ac-label-link" onClick={handlePlaneClick}>
            <span className="ac-label-tag">// Aircraft</span>
            <span className="ac-label-name">{plane.name}</span>
            <span className="ac-label-detail">{plane.detail}</span>
            <span className="ac-label-cta">Click to change aircraft →</span>
          </button>
        </div>

        {/* First-visit tap hint */}
        {showTapHint && (
          <button className="tap-hint" onClick={handlePlaneClick} aria-label="Tap the aircraft to switch model">
            <span className="tap-hint-core" aria-hidden="true">
              <span className="tap-ring" />
              <span className="tap-ring" />
              <span className="tap-finger" />
              <span className="tap-hint-dot" />
            </span>
            <span className="tap-hint-label">tap the aircraft to switch model</span>
          </button>
        )}

        {/* Scene 3: Systems prompt */}
        <div className="scene-overlay scene-systems" data-visible={showSystems}>
          <div className="sys-prompt">
            <span className="ac-label-tag">// Warning systems</span>
            <h2 className="sys-title">Select a system to trigger</h2>
            <p className="sys-sub">Click any illuminated panel to play its authentic cockpit recording</p>
          </div>
        </div>

        {/* Scene 4: Soundboard section */}
        <div className="scene-board-section" id="board">
          <div className="board-inner">
            <Soundboard sb={sb} />
          </div>
        </div>
      </div>

      <PlayerBar sb={sb} />
    </>
  )
}
