import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Soundboard } from '../components/Soundboard'
import { PlayerBar } from '../components/PlayerBar'
import { PillNav } from '../components/PillNav'
import { useSoundboard } from '../hooks/useSoundboard'
import { playSwitchClick } from '../lib/audio'

export default function SoundboardPage() {
  const sb = useSoundboard()

  useEffect(() => {
    const handler = (e: globalThis.MouseEvent) => {
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

  return (
    <div className="soundboard-page">
      <PillNav />
      <a className="pilots-back" href="/">
        <ArrowLeft size={14} />
        Home
      </a>
      <div className="board-inner soundboard-page-board">
        <Soundboard sb={sb} />
      </div>
      <PlayerBar sb={sb} />
    </div>
  )
}
