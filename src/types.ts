export type CategoryId = 'gpws' | 'warnings' | 'landing' | 'altitude'

export type Tone = 'danger' | 'caution' | 'tcas' | 'info'

export interface Sound {
  id: string
  label: string
  spoken: string
  categories: CategoryId[]
  tone: Tone
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
