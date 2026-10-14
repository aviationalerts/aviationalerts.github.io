import { Star } from 'lucide-react'
import { SOUNDS } from '../data/sounds'
import { CATEGORIES } from '../types'
import type { Sound, Tone } from '../types'
import type { Soundboard } from '../hooks/useSoundboard'
import { WAVE_BARS } from '../lib/audio'

const TONE_VAR: Record<Tone, string> = {
  danger: 'var(--color-danger)',
  caution: 'var(--color-caution)',
  tcas: 'var(--color-tcas)',
  info: 'var(--color-callout)',
}

const CAT_SHORT: Record<string, string> = {
  gpws: 'GPWS',
  warnings: 'WARN',
  landing: 'LDG',
  altitude: 'ALT',
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function fmtDur(sec?: number) {
  if (!sec || !Number.isFinite(sec)) return ''
  return `${sec.toFixed(1)}s`
}

function TileWave({ data }: { data: Uint8Array | null }) {
  const bars = Array.from({ length: WAVE_BARS }, (_, i) => {
    const v = data ? Math.round(((data[i] ?? 0) / 255) * 100) : 0
    return <span key={i} style={{ height: `${Math.max(4, v)}%` }} />
  })
  return <div className="tile-wave">{bars}</div>
}

function SoundTile({ sound, sb, index }: { sound: Sound; sb: Soundboard; index: number }) {
  const playing = sb.playingId === sound.id
  const avail = sb.availability(sound.id)
  const fav = sb.favorites.includes(sound.id)
  const duration = sb.manifest?.[sound.id]?.duration
  const cat = sound.categories[0] ?? 'gpws'
  const gi = SOUNDS.findIndex((s) => s.id === sound.id)

  return (
    <div
      className="tile"
      role="button"
      tabIndex={avail === 'missing' ? -1 : 0}
      data-playing={playing}
      data-avail={avail === 'missing' ? 'missing' : 'ok'}
      data-sound={sound.id}
      style={{
        ['--accent']: TONE_VAR[sound.tone],
        ['--i']: String(index),
      } as React.CSSProperties}
      onClick={() => avail !== 'missing' && sb.togglePlay(sound.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (avail !== 'missing') sb.togglePlay(sound.id)
        }
      }}
      aria-pressed={playing}
      aria-label={`Play ${sound.label}`}
    >
      <span className="tile-bar" aria-hidden="true" />
      <span className="tile-top">
        <span className="tile-code">{CAT_SHORT[cat] ?? 'SYS'}-{pad(gi + 1)}</span>
        {playing && <span className="tile-onair">ON AIR</span>}
      </span>

      <button
        type="button"
        className="tile-fav"
        aria-label={fav ? 'Remove favorite' : 'Add favorite'}
        aria-pressed={fav}
        onClick={(e) => {
          e.stopPropagation()
          sb.toggleFavorite(sound.id)
        }}
      >
        <Star size={12} fill={fav ? 'currentColor' : 'none'} />
      </button>

      <span className="tile-label">{sound.label}</span>
      <span className="tile-meta">
        <span>{avail === 'missing' ? 'N/A' : (CAT_SHORT[cat] ?? 'SYS')}</span>
        <span>{fmtDur(duration)}</span>
      </span>

      {playing && <TileWave data={sb.waveform} />}
    </div>
  )
}

export function Soundboard({ sb }: { sb: Soundboard }) {
  const filters = [
    { id: 'all', label: 'All' },
    ...CATEGORIES.map((c) => ({ id: c.id, label: c.short })),
  ]

  return (
    <main className="board" id="board">
      <div className="board-head">
        <div>
          <p className="hero-kicker">// Select channel</p>
          <h2 className="board-title">Soundboard</h2>
          <p className="board-sub">{sb.filtered.length} channels available</p>
        </div>
        <button
          type="button"
          className="fav-toggle"
          aria-pressed={sb.favoritesOnly}
          onClick={() => sb.setFavoritesOnly((v) => !v)}
        >
          <Star size={11} fill={sb.favoritesOnly ? 'currentColor' : 'none'} />
          Favorites
        </button>
      </div>

      <div className="filters" role="group" aria-label="Filter by category">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            className="filter-btn"
            aria-pressed={sb.category === f.id}
            onClick={() => sb.setCategory(f.id as never)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="board-grid" data-testid="board-grid">
        {sb.filtered.length === 0 ? (
          <div className="board-empty">No match — try another callsign</div>
        ) : (
          sb.filtered.map((sound, i) => (
            <SoundTile key={sound.id} sound={sound} sb={sb} index={i} />
          ))
        )}
      </div>

      {sb.errorMessage && (
        <p role="alert" style={{ marginTop: 16, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-danger)', fontFamily: 'var(--font-mono)' }}>
          {sb.errorMessage}
        </p>
      )}
    </main>
  )
}
