import { useState, useMemo } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { ACCIDENTS } from '../data/accidents'

export default function Accidents() {
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const allTags = useMemo(() => {
    const set = new Set<string>()
    ACCIDENTS.forEach((a) => a.tags.forEach((t) => set.add(t)))
    return Array.from(set).sort()
  }, [])

  const filtered = useMemo(() => {
    return ACCIDENTS.filter((a) => {
      const matchesQuery =
        !query ||
        a.flight.toLowerCase().includes(query.toLowerCase()) ||
        a.aircraft.toLowerCase().includes(query.toLowerCase()) ||
        a.location.toLowerCase().includes(query.toLowerCase()) ||
        a.summary.toLowerCase().includes(query.toLowerCase())
      const matchesTag = !activeTag || a.tags.includes(activeTag)
      return matchesQuery && matchesTag
    })
  }, [query, activeTag])

  return (
    <div className="pilots-page">
      <header className="pilots-header">
        <a href="/" className="pilots-back">
          <ArrowLeft size={14} />
          <span>Back to Soundboard</span>
        </a>
        <div className="pilots-title-block">
          <p className="pilots-kicker">// When things go wrong</p>
          <h1 className="pilots-h1">Notable Accidents</h1>
          <p className="pilots-lede">
            The accidents that changed aviation forever — every disaster taught a lesson that
            makes flying safer today.
          </p>
        </div>
      </header>

      <div className="accidents-controls">
        <div className="accidents-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search flight, aircraft, location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="accidents-tags">
          <button
            className={`accidents-tag-btn ${!activeTag ? 'active' : ''}`}
            onClick={() => setActiveTag(null)}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`accidents-tag-btn ${activeTag === tag ? 'active' : ''}`}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="accidents-grid">
        {filtered.map((a) => (
          <a key={a.id} href={`/notable-accidents/${a.id}`} className="accident-card">
            <div className="accident-card-header">
              <span className="accident-date">{a.date}</span>
              <span className="accident-fatality-count">{a.fatalities}</span>
            </div>
            <h2 className="accident-flight">{a.flight}</h2>
            <p className="accident-aircraft">{a.aircraft}</p>
            <p className="accident-summary">{a.summary}</p>
            <div className="accident-card-footer">
              <span className="accident-location">{a.location}</span>
              <span className="accident-cta">Read more →</span>
            </div>
          </a>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="accidents-empty">
          <p>No accidents match your search.</p>
        </div>
      )}

      <footer className="pilots-footer">
        <span>Aviation Alerts</span>
      </footer>
    </div>
  )
}
