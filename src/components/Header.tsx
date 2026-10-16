import { useState, useRef, useEffect } from 'react'
import { Search, Repeat } from 'lucide-react'
import type { Soundboard } from '../hooks/useSoundboard'
import { LogoMark } from './LogoMark'

export function Header({ sb }: { sb: Soundboard }) {
  const loop = sb.loopOn
  const [searchOpen, setSearchOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  return (
    <header className="site-header">
      <nav className="header-capsule">
        <a className="header-link" href="/cockpit-360/">Cockpit</a>
        <a className="header-link" href="/Historical-Pilots/">Pilots</a>

        <a className="header-logo" href="/" aria-label="Aviation Alerts home">
          <LogoMark size={30} />
        </a>

        <a className="header-link" href="/notable-accidents/">Crashes</a>
        <a className="header-link" href="/animations/">Sim</a>

        <span className="header-actions">
          <button
            type="button"
            className="header-icon-btn"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search callouts"
            aria-expanded={searchOpen}
            data-tooltip="Search"
          >
            <Search size={15} />
          </button>
          <button
            type="button"
            className={`header-icon-btn ${loop ? 'header-icon-btn-on' : ''}`}
            onClick={sb.toggleLoop}
            aria-label={loop ? 'Disable loop' : 'Enable loop'}
            aria-pressed={loop}
            data-tooltip={loop ? 'Loop on' : 'Loop off'}
          >
            <Repeat size={15} />
          </button>
        </span>

        {searchOpen && (
          <input
            ref={inputRef}
            className="header-capsule-search"
            type="search"
            value={sb.query}
            onChange={(e) => sb.setQuery(e.target.value)}
            placeholder="Search…"
            aria-label="Search callouts"
            onBlur={() => { if (!sb.query) setSearchOpen(false) }}
          />
        )}
      </nav>
    </header>
  )
}
