import { useEffect } from 'react'
import { PILOTS, type Pilot } from '../data/pilots'
import { ArrowLeft } from 'lucide-react'
import { PillNav } from '../components/PillNav'
import { SiteFooter } from '../components/SiteFooter'
import { Frame3D, preloadFrameAssets } from '../components/Frame3D'

function PilotEntry({ pilot }: { pilot: Pilot }) {
  return (
    <div className="pilot-entry">
      <div className="pilot-frame-wrap">
        <Frame3D photoUrl={pilot.image} className="frame3d-container" />
      </div>
      <div className="pilot-info-panel">
        {pilot.callsign && <span className="pilot-callsign">// {pilot.callsign}</span>}
        <h2 className="pilot-name">{pilot.name}</h2>
        <div className="pilot-meta">
          <span>{pilot.years}</span>
          <span className="pilot-dot">·</span>
          <span>{pilot.nationality}</span>
        </div>
        <div className="pilot-tags">
          {pilot.tags.map((t) => (
            <span key={t} className="pilot-tag">{t}</span>
          ))}
        </div>
        <p className="pilot-bio">{pilot.bio}</p>
        {pilot.quote && (
          <blockquote className="pilot-quote">"{pilot.quote}"</blockquote>
        )}
      </div>
    </div>
  )
}

export default function HistoricalPilots() {
  useEffect(() => {
    preloadFrameAssets(PILOTS.map((p) => p.image))
  }, [])

  return (
    <div className="pilots-page">
      <PillNav />
      <header className="pilots-header">
        <a href="/" className="pilots-back">
          <ArrowLeft size={14} />
          <span>Home</span>
        </a>
        <div className="pilots-title-block">
          <p className="pilots-kicker">// Aviation Legends</p>
          <h1 className="pilots-h1">Historical Pilots</h1>
          <p className="pilots-lede">
            The men and women who pushed the boundaries of flight — pioneers, record-breakers,
            and heroes whose courage shaped modern aviation.
          </p>
        </div>
      </header>

      <div className="pilots-list">
        {PILOTS.map((p) => (
          <PilotEntry key={p.id} pilot={p} />
        ))}
      </div>

      <SiteFooter />
    </div>
  )
}
