import { Search, Square } from 'lucide-react'
import type { Soundboard } from '../hooks/useSoundboard'
import { LogoMark } from './LogoMark'

export function Header({ sb }: { sb: Soundboard }) {
  const live = Boolean(sb.playingId)

  return (
    <header className="site-header">
      <a className="brand" href="#top">
        <LogoMark />
        <span>
          <span className="brand-name">Aviation Alerts</span>
          <br />
          <span className="brand-sub">Warning Soundboard</span>
        </span>
      </a>

      <div className="header-search">
        <Search size={13} className="search-icon" aria-hidden="true" />
        <input
          type="search"
          value={sb.query}
          onChange={(e) => sb.setQuery(e.target.value)}
          placeholder="Search callouts…"
          aria-label="Search callouts"
        />
      </div>

      <span className="header-status" data-testid="load-status">
        {sb.counts.available}/{sb.counts.total} loaded
      </span>

      <button
        type="button"
        className="ctl-btn danger"
        onClick={sb.stopAll}
        disabled={!live && !sb.ambienceOn}
        aria-label="Stop all audio"
        style={{
          background: live ? 'rgba(212,43,30,0.1)' : 'transparent',
          borderColor: live ? 'rgba(212,43,30,0.4)' : 'var(--color-line2)',
          color: live ? 'var(--color-danger)' : 'var(--color-ink3)',
        }}
      >
        <Square size={11} fill="currentColor" />
        <span className="ctl-label">Stop</span>
      </button>
    </header>
  )
}
