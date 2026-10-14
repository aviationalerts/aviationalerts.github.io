import { Square, Waves, Volume2 } from 'lucide-react'
import type { Soundboard } from '../hooks/useSoundboard'

function fmt(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function PlayerWave({ data }: { data: Uint8Array | null }) {
  return (
    <div className="player-wave">
      {Array.from({ length: 12 }, (_, i) => {
        const v = data ? Math.round(((data[i * 2] ?? 0) / 255) * 100) : 0
        return <span key={i} style={{ height: `${Math.max(6, v)}%` }} />
      })}
    </div>
  )
}

export function PlayerBar({ sb }: { sb: Soundboard }) {
  const live = Boolean(sb.playingId)
  const { t, d } = sb.progress
  const pct = d > 0 ? Math.min(100, (t / d) * 100) : 0

  return (
    <div className="player" data-live={live} data-testid="player" role="region" aria-label="Player">
      <div className="player-status">
        <span className="player-led" aria-hidden="true" />
        <div style={{ minWidth: 0 }}>
          <div className="player-state">{live ? 'ON AIR' : 'STANDBY'}</div>
          <div className="player-label">
            {sb.currentSound?.label ?? (sb.ambienceOn ? 'CABIN AMBIENCE' : '—')}
          </div>
        </div>
      </div>

      <div className="player-progress">
        <PlayerWave data={sb.waveform} />
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${live ? pct : 0}%` }} />
        </div>
        <span className="progress-time">
          {live ? `${fmt(t)} / ${fmt(d)}` : '--:-- / --:--'}
        </span>
      </div>

      <div className="player-controls">
        <button
          type="button"
          className="ctl-btn"
          data-active={sb.ambienceOn}
          onClick={() => sb.setAmbienceOn(!sb.ambienceOn)}
          aria-pressed={sb.ambienceOn}
          aria-label="Toggle cabin ambience"
        >
          <Waves size={12} />
          <span className="ctl-label">Ambience</span>
        </button>

        <label className="vol" title="Volume">
          <Volume2 size={13} aria-hidden="true" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={sb.volume}
            onChange={(e) => sb.setVolume(Number(e.target.value))}
            aria-label="Volume"
          />
        </label>

        <button
          type="button"
          className="ctl-btn danger"
          onClick={sb.stopAll}
          disabled={!live && !sb.ambienceOn}
          aria-label="Stop all"
        >
          <Square size={11} fill="currentColor" />
          <span className="ctl-label">Stop</span>
        </button>
      </div>
    </div>
  )
}
