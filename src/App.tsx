import { useEffect, useState, useCallback } from 'react'
import { Header } from './components/Header'
import { PlayerBar } from './components/PlayerBar'
import { Soundboard } from './components/Soundboard'
import { Experience } from './three/Experience'
import { useSoundboard } from './hooks/useSoundboard'
import { playSwitchClick } from './lib/audio'

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

  const handlePanelClick = useCallback(
    (id: string) => {
      sb.togglePlay(id)
    },
    [sb],
  )

  // section visibility based on scroll
  const showTitle = progress < 0.18
  const showAircraft = progress < 0.35
  const showSystems = progress >= 0.28 && progress < 0.68

  return (
    <>
      <Header sb={sb} />
      <Experience
        onPanelClick={handlePanelClick}
        playingId={sb.playingId}
        reducedMotion={reducedMotion}
      />

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
          <div className="ac-label">
            <span className="ac-label-tag">// Aircraft</span>
            <span className="ac-label-name">Airbus A320</span>
            <span className="ac-label-detail">Narrow-body · Twin-engine · V2500 / CFM56</span>
          </div>
        </div>

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

      <footer className="site-footer">
        <span>Aviation Alerts · {sb.counts.total} recordings</span>
        <span>Local playback · No streaming · No accounts</span>
      </footer>
      <PlayerBar sb={sb} />
      <div className="focus-hint" aria-hidden="true">Drag to orbit · Scroll to zoom · Esc or click away to exit</div>
    </>
  )
}
