import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

let cache: Map<string, Promise<GLTF>> | null = null

// Lazy import so three.js isn't in the main bundle
function loadGLTF(url: string): Promise<GLTF> {
  if (!cache) cache = new Map()
  let p = cache.get(url)
  if (!p) {
    p = import('../lib/gltf').then((m) => m.loadGLTF(url))
    cache.set(url, p)
  }
  return p
}

export interface PlaneCamera {
  distMult: number
  yMult: number
  selectorDist?: number
  selectorHeight?: number
}

export interface PlaneDef {
  id: string
  name: string
  model: string
  scale: number
  position: [number, number, number]
  rotation: [number, number, number]
  grounded: boolean
  category: string
  detail: string
  camera?: PlaneCamera
}

export const PLANES: PlaneDef[] = [
  {
    id: 'a320',
    name: 'Airbus A320',
    model: '/models/Airbus%20A320.glb',
    scale: 16,
    position: [0, 5, 0],
    rotation:  [0, Math.PI * 1.7, 0],
    grounded: false,
    category: 'Commercial',
    detail: 'Narrow-body · Twin-engine · V2500 / CFM56',
 camera: { distMult: 0.7, yMult: 0.7, selectorDist: 21, selectorHeight: 3.7 },
  },
  {
    id: 'b747',
    name: 'Boeing 747',
    model: '/models/american_airlines_747_123_boeing.glb',
    scale: 19,
    position: [0, 0, 0],
    rotation: [0, Math.PI * 0.2, 0],
    grounded: true,
    category: 'Commercial',
    detail: 'Wide-body · Quad-engine · The Queen of the Skies',
 camera: { distMult: 0.7, yMult: 0.5, selectorDist: 23.9, selectorHeight: 2.2 },

  },
  {
    id: 'helicopter',
    name: 'Heavy Helicopter',
    model: '/models/large_helicopter.glb',
    scale: 14,
   position: [0, 0, 0],
rotation: [0, Math.PI * 1.7, 0],
    grounded: true,
    category: 'Rotorcraft',
    detail: 'Heavy-lift · Twin-rotor · Vertical operations',
    camera: { distMult: 0.7, yMult: 0.7, selectorDist: 21.5, selectorHeight: 2.2 },
      },
  {
    id: 'f2',
    name: 'Mitsubishi F-2',
    model: '/models/mitsubishi-f2-fighter-jet.glb',
    scale: 12,
    position: [0, 0, 0],
    rotation: [0, Math.PI * 1.65, 0],
    grounded: true,
    category: 'Fighter',
    detail: 'Multirole · supersonic · Japan Air Self-Defense Force',
  },
  {
    id: 'su34',
    name: 'Sukhoi Su-34',
    model: '/models/sukhoi-su-34-figther-jet.glb',
    scale: 13,
    position: [0, 0, 0],
    rotation: [0, Math.PI * 1.65, 0],
    grounded: true,
    category: 'Fighter',
    detail: 'Strike fighter · Twin-engine · Russian Aerospace Forces',
  },
  {
    id: 'b2',
    name: 'B-2 Spirit',
    model: '/models/northrop_grumman_b-2_spirit_-_free.glb',
    scale: 18,
    position: [0, 5, 0],
    rotation: [0, Math.PI * 1.6, 0],
    grounded: true,
    category: 'Bomber',
    detail: 'Stealth · Flying wing · Northrop Grumman',
camera: { distMult: 0.64, yMult: 0.4, selectorDist: 17.7, selectorHeight: 1.6 },
  },
  {
    id: 'ch53e',
    name: 'CH-53E Sea Stallion',
    model: '/models/sikorsky_ch-53e_sea_stallion.glb',
    scale: 14,
    position: [0, 0, 0],
    rotation:  [0, Math.PI * 1.1, 0],
    grounded: true,
    category: 'Rotorcraft',
    detail: 'Heavy-lift · Tri-engine · U.S. Marine Corps',
 camera: { distMult: 0.7, yMult: 0.7, selectorDist: 17.9, selectorHeight: 0.9 },

  },
]

const STORAGE_KEY = 'aviation-alerts-plane'

export function getSelectedPlaneId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && PLANES.some((p) => p.id === stored)) return stored
  } catch { /* ignore */ }
  return PLANES[0].id
}

export function setSelectedPlaneId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch { /* ignore */ }
}

export function getPlaneById(id: string): PlaneDef {
  return PLANES.find((p) => p.id === id) || PLANES[0]
}

// Warm the GLTF cache in the background so the selector opens instantly
export function preloadPlaneModels() {
  for (const p of PLANES) {
    loadGLTF(p.model).catch(() => { /* ignore */ })
  }
}
