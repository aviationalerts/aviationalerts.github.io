import type { LucideIcon } from 'lucide-react'

export type CategoryId = 'gpws' | 'warnings' | 'landing' | 'altitude'

export type Tone = 'danger' | 'caution' | 'tcas' | 'info'

export type AudioOrigin = 'authentic' | 'community' | 'synthetic'

export interface SoundSource {
  name: string
  url?: string
  license?: string
  author?: string
  note?: string
}

export interface Sound {
  id: string
  label: string
  spoken: string
  categories: CategoryId[]
  tone: Tone
  origin: AudioOrigin
  source: SoundSource
  icon: LucideIcon
}

export interface CategoryDef {
  id: CategoryId
  label: string
  short: string
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'gpws', label: 'GPWS / Terrain', short: 'GPWS' },
  { id: 'warnings', label: 'Aircraft Warnings', short: 'Warnings' },
  { id: 'landing', label: 'Landing Callouts', short: 'Landing' },
  { id: 'altitude', label: 'Altitude Callouts', short: 'Altitude' },
]

export const ORIGIN_LABEL: Record<AudioOrigin, string> = {
  authentic: 'Authentic',
  community: 'Community',
  synthetic: 'Synthetic',
}

export const ORIGIN_DESCRIPTION: Record<AudioOrigin, string> = {
  authentic:
    'Real cockpit recording from a Creative Commons / public-domain archive, verified by offline speech analysis.',
  community:
    'Real cockpit-style recording from a public soundboard upload. Content was machine-verified, but the original rights holder could not be confirmed — personal use only.',
  synthetic:
    'Generated locally with Windows text-to-speech and processed with a cockpit-style radio filter. Not a real aircraft recording.',
}
