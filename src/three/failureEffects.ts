import * as THREE from 'three'
import { loadGLTF } from '../lib/gltf'

export type EffectKind =
  | 'pull-up'
  | 'sink-rate'
  | 'glide-slope'
  | 'dont-sink'
  | 'terrain'
  | 'obstacle'
  | 'too-low-terrain'
  | 'too-low-gear'
  | 'too-low-flaps'
  | 'config-warning'
  | 'windshear'
  | 'stall'
  | 'bank-angle'
  | 'master-warning'
  | 'ap-disconnect'
  | 'altitude-alert'
  | 'none'

const SOUND_EFFECTS: Record<string, EffectKind> = {
  'pull-up': 'pull-up',
  'terrain-pullup': 'pull-up',
  'sink-rate': 'sink-rate',
  'glideslope': 'glide-slope',
  "dont-sink": 'dont-sink',
  'terrain': 'terrain',
  'terrain-ahead': 'terrain',
  'obstacle-ahead': 'obstacle',
  'caution-obstacle': 'obstacle',
  'too-low-terrain': 'too-low-terrain',
  'too-low-gear': 'too-low-gear',
  'too-low-flaps': 'too-low-flaps',
  'config-warning-airbus': 'config-warning',
  'config-warning-boeing': 'config-warning',
  'windshear-airbus': 'windshear',
  'windshear-boeing': 'windshear',
  'stall-airbus': 'stall',
  'stall-boeing': 'stall',
  'bank-angle': 'bank-angle',
  'master-warning-airbus': 'master-warning',
  'ap-disconnect-airbus': 'ap-disconnect',
  'ap-disconnect-boeing': 'ap-disconnect',
  'altitude-alert-boeing': 'altitude-alert',
  'altitude-alert-airbus': 'altitude-alert',
}

const SOUND_MFR: Record<string, 'airbus' | 'boeing' | 'shared'> = {
  'pull-up': 'shared', 'terrain': 'shared', 'terrain-ahead': 'shared',
  'terrain-pullup': 'shared', 'sink-rate': 'shared', 'too-low-terrain': 'shared',
  'obstacle-ahead': 'shared', 'caution-obstacle': 'shared', 'glideslope': 'shared',
  "dont-sink": 'shared', 'bank-angle': 'shared', 'too-low-gear': 'shared', 'too-low-flaps': 'shared',
  'stall-airbus': 'airbus', 'windshear-airbus': 'airbus', 'master-warning-airbus': 'airbus',
  'ap-disconnect-airbus': 'airbus', 'altitude-alert-airbus': 'airbus', 'config-warning-airbus': 'airbus',
  'stall-boeing': 'boeing', 'windshear-boeing': 'boeing',
  'altitude-alert-boeing': 'boeing', 'ap-disconnect-boeing': 'boeing',
  'config-warning-boeing': 'boeing',
}

export function effectForSound(id: string): EffectKind {
  return SOUND_EFFECTS[id] ?? 'none'
}

export function mfrForSound(id: string): 'airbus' | 'boeing' | 'shared' | null {
  return SOUND_MFR[id] ?? null
}

export const EFFECT_LABEL: Record<EffectKind, string> = {
  'pull-up': 'Pull up', 'sink-rate': 'Sink rate',
  'glide-slope': 'Glide slope', 'dont-sink': "Don't sink", terrain: 'Terrain',
  obstacle: 'Obstacle', 'too-low-terrain': 'Too low terrain', 'too-low-gear': 'Gear not down',
  'too-low-flaps': 'Flaps not set', 'config-warning': 'Config warning', windshear: 'Windshear',
  stall: 'Aerodynamic stall', 'bank-angle': 'Excessive bank',
  'master-warning': 'Master warning', 'ap-disconnect': 'Autopilot disconnect',
  'altitude-alert': 'Altitude alert', none: 'Standby',
}

interface ActiveEffect {
  update(dt: number): void
  dispose(): void
}

// ---- City cache ----
let cityTemplate: THREE.Group | null = null
let cityLoading = false

export function preloadCity() {
  if (cityTemplate || cityLoading) return
  cityLoading = true
  loadGLTF('/models/city.glb').then((gltf) => {
    cityTemplate = gltf.scene
    cityLoading = false
  }).catch(() => { cityLoading = false })
}

function cloneCity(): THREE.Group | null {
  if (!cityTemplate) return null
  const c = cityTemplate.clone(true)
  const box = new THREE.Box3().setFromObject(c)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const s = 60 / Math.max(size.x, size.y, size.z)
  c.scale.setScalar(s)
  c.position.set(-center.x * s, -4 - box.min.y * s, -center.z * s)
  return c
}

// ---- Visual helpers ----
function radialTex(inner: string, outer: string): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = cv.height = 128
  const ctx = cv.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(cv)
}

function glow(color: string, size: number): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTex(color, 'rgba(0,0,0,0)'),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }))
  s.scale.setScalar(size)
  return s
}

function aircraftCenter(a: THREE.Group): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(a)
  return box.getCenter(new THREE.Vector3())
}

function engineWorldPositions(a: THREE.Group): THREE.Vector3[] {
  const box = new THREE.Box3().setFromObject(a)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const xOff = size.x * 0.24 // between inboard/outboard on 4-engine jets, wing station on twins
  return [
    new THREE.Vector3(center.x - xOff, center.y - size.y * 0.08, center.z + size.z * 0.02),
    new THREE.Vector3(center.x + xOff, center.y - size.y * 0.08, center.z + size.z * 0.02),
  ]
}

function makeParticles(count: number, color: number, size: number, opts?: { additive?: boolean; opacity?: number }): THREE.Points {
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  // Soft circular sprite so particles don't render as hard squares
  const cv = document.createElement('canvas')
  cv.width = cv.height = 64
  const ctx = cv.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.6)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const additive = opts?.additive !== false
  const mat = new THREE.PointsMaterial({
    color, size, map: new THREE.CanvasTexture(cv),
    transparent: true, opacity: opts?.opacity ?? 0.5, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, alphaTest: 0.01,
  })
  const p = new THREE.Points(geo, mat)
  p.userData = { count, ages: new Float32Array(count).fill(0).map(() => Math.random() * 2) }
  return p
}

function resetParticle(p: THREE.Points, i: number, spread = 0.3) {
  const pos = p.geometry.getAttribute('position') as THREE.BufferAttribute
  pos.array[i * 3] = (Math.random() - 0.5) * spread
  pos.array[i * 3 + 1] = (Math.random() - 0.5) * spread
  pos.array[i * 3 + 2] = (Math.random() - 0.5) * spread
}

function findByName(a: THREE.Group, re: RegExp): THREE.Object3D[] {
  const r: THREE.Object3D[] = []
  a.traverse((c) => { if (re.test(c.name)) r.push(c) })
  return r
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

// ============================================================
// FLIGHT DYNAMICS
// Based on real transport-category aircraft behavior:
//  - Pitch rate 3°/s (GPWS pull-up, Airbus FCOM)
//  - Pull-up target 15-20° nose up to stick shaker
//  - Windshear escape: TOGA + constant 15-20° pitch, path changes with energy
//  - Stall: buffet → break (sharp pitch drop + wing drop) → nose-down recovery
//  - Engine failure: yaw into dead engine ~1.5°/s, rudder arrest, bank into live engine
//  - Bank recovery: ~5-8°/s roll to level
// ============================================================

const DEG = Math.PI / 180

interface FlightState {
  pitch: number          // deg, nose-up positive
  roll: number           // deg, right-wing-down positive
  yaw: number            // deg, nose-right positive (relative offset)
  pitchRate: number      // deg/s
  rollRate: number       // deg/s
  yawRate: number        // deg/s
  targetPitch: number
  targetRoll: number
  targetYawRate: number
  maxPitchRate: number   // deg/s
  maxRollRate: number    // deg/s
  speed: number          // scene units/s along flight path (horizontal comp uses cos gamma)
  alpha: number          // deg, approx angle of attack for flight-path calculation
  vsOverride: number | null // vertical speed units/s; overrides pitch-derived path (windshear energy model)
  pos: THREE.Vector3     // offset from base position
}

function createFlight(overrides: Partial<FlightState> = {}): FlightState {
  return {
    pitch: 0, roll: 0, yaw: 0,
    pitchRate: 0, rollRate: 0, yawRate: 0,
    targetPitch: 0, targetRoll: 0, targetYawRate: 0,
    maxPitchRate: 3, maxRollRate: 6,
    speed: 4, alpha: 5,
    vsOverride: null,
    pos: new THREE.Vector3(),
    ...overrides,
  }
}

// Attitude step: rate-limited first-order approach (pilot/FCS response)
function stepAxis(
  current: number, target: number, rate: number,
  maxRate: number, tau: number, dt: number,
): [number, number] {
  const err = target - current
  const desiredRate = clamp(err / Math.max(tau, 0.01), -maxRate, maxRate)
  const newRate = rate + (desiredRate - rate) * Math.min(1, dt * 6)
  const newCurrent = current + newRate * dt
  return [newCurrent, newRate]
}

function stepFlight(fs: FlightState, dt: number, pitchTau = 1.5, rollTau = 1.0) {
  ;[fs.pitch, fs.pitchRate] = stepAxis(fs.pitch, fs.targetPitch, fs.pitchRate, fs.maxPitchRate, pitchTau, dt)
  ;[fs.roll, fs.rollRate] = stepAxis(fs.roll, fs.targetRoll, fs.rollRate, fs.maxRollRate, rollTau, dt)
  fs.yawRate += (fs.targetYawRate - fs.yawRate) * Math.min(1, dt * 3)
  fs.yaw += fs.yawRate * dt
}

function integrateFlight(fs: FlightState, dt: number, baseRot?: THREE.Euler) {
  const gamma = (fs.pitch - fs.alpha) * DEG
  const horiz = Math.cos(gamma) * fs.speed
  const vert = fs.vsOverride !== null ? fs.vsOverride : Math.sin(gamma) * fs.speed
  // World heading = model base yaw + relative yaw from maneuvers
  const yaw = (baseRot ? baseRot.y : 0) + fs.yaw * DEG
  fs.pos.x += Math.sin(yaw) * horiz * dt
  fs.pos.z += Math.cos(yaw) * horiz * dt
  fs.pos.y += vert * dt
}

function applyFlight(fs: FlightState, aircraft: THREE.Group, basePos: THREE.Vector3, baseRot: THREE.Euler) {
  // pitch nose-up = -rotation.x; right bank = -rotation.z; nose-right = +rotation.y (for +Z forward)
  aircraft.rotation.set(
    baseRot.x - fs.pitch * DEG,
    baseRot.y + fs.yaw * DEG,
    baseRot.z - fs.roll * DEG,
  )
  aircraft.position.set(basePos.x + fs.pos.x, basePos.y + fs.pos.y, basePos.z + fs.pos.z)
}

// Phugoid: light decaying pitch oscillation (period ~V*2π/g), applied as visual overlay
function phugoid(t: number, amp: number, period: number): number {
  return Math.sin((t * Math.PI * 2) / period) * amp * Math.exp(-t * 0.08)
}

// Buffet: high-frequency small-amplitude oscillation (pre-stall / overspeed)
function buffet(t: number, pitchHz: number, pitchAmp: number, rollHz: number, rollAmp: number): [number, number] {
  return [
    Math.sin(t * pitchHz * Math.PI * 2) * pitchAmp,
    Math.sin(t * rollHz * Math.PI * 2) * rollAmp,
  ]
}

export function createEffect(
  kind: EffectKind,
  scene: THREE.Scene,
  aircraft: THREE.Group,
  mfr: 'airbus' | 'boeing' = 'airbus',
): ActiveEffect | null {
  if (kind === 'none' || !aircraft) return null

  const cleanupFns: Array<() => void> = []
  const basePos = aircraft.position.clone()
  const baseRot = aircraft.rotation.clone()
  let vt = 0 // visual time

  const addLight = (color: number, intensity: number, dist: number) => {
    const l = new THREE.PointLight(color, intensity, dist)
    scene.add(l)
    cleanupFns.push(() => scene.remove(l))
    return l
  }

  const addSprite = (s: THREE.Sprite) => {
    scene.add(s)
    cleanupFns.push(() => { scene.remove(s); s.material.dispose() })
    return s
  }

  const addPoints = (p: THREE.Points) => {
    scene.add(p)
    cleanupFns.push(() => { scene.remove(p); p.geometry.dispose(); (p.material as THREE.Material).dispose() })
    return p
  }

  let cityDist = 0 // requested distance; 0 = no city wanted
  let cityPlaced = false
  const tryCity = (): THREE.Group | null => {
    if (!cityDist || cityPlaced) return null
    const c = cloneCity()
    if (!c) return null // still loading — retried every update
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(aircraft.quaternion)
    fwd.y = 0
    fwd.normalize()
    c.position.x = aircraft.position.x + fwd.x * cityDist
    c.position.z = aircraft.position.z + fwd.z * cityDist
    c.lookAt(aircraft.position.x, c.position.y, aircraft.position.z)
    scene.add(c)
    cleanupFns.push(() => {
      scene.remove(c)
      c.traverse((m) => {
        if (m instanceof THREE.Mesh) {
          m.geometry.dispose()
          const mats = Array.isArray(m.material) ? m.material : [m.material]
          for (const mt of mats) mt.dispose()
        }
      })
    })
    cityPlaced = true
    return c
  }
  const addCity = (dist: number): THREE.Group | null => {
    cityDist = dist
    return tryCity()
  }

  // Master warning strobe: real master warning is steady red (fire) or flashing (others)
  const strobe = (light: THREE.PointLight, sprite: THREE.Sprite | null, hz: number, on: number, off: number, duty = 0.5) => {
    const phase = (vt * hz) % 1
    const active = phase < duty
    light.intensity = active ? on : off
    if (sprite) (sprite.material as THREE.SpriteMaterial).opacity = active ? on * 0.25 : off * 0.25
  }

  const cleanup = () => {
    for (const fn of cleanupFns) fn()
    aircraft.position.copy(basePos)
    aircraft.rotation.copy(baseRot)
  }

  switch (kind) {
    // ===== PULL UP (GPWS Mode 1/2) =====
    // Real: 0.3-1s pilot reaction, then firm pitch-up (≈3-5°/s) to 15-20° (Airbus
    // alpha-prot 15°, Boeing to shaker ~18°), TOGA thrust (spools ~2s), climb at
    // max performance until warning clears. Clean up config during climb.
    // Start: descending on approach, terrain ahead.
    case 'pull-up':
    case 'terrain': {
      const targetPitch = mfr === 'airbus' ? 24 : 27
      const fs = createFlight({ pitch: -8, alpha: 9, speed: 4.4, maxPitchRate: 9 })
      const red = addLight(0xff2020, 0, 30)
      const rg = addSprite(glow('rgba(255,40,40,0.8)', 4))
      const exhausts = [0, 1].map(() => addPoints(makeParticles(40, 0xffaa44, 0.35)))
      const engGlows = [0, 1].map(() => addSprite(glow('rgba(255,180,60,0.9)', 1.8)))
      let thrust = 0 // 0 idle  1 TOGA
      addCity(80)

      return {
        update(dt) {
          vt += dt
          tryCity()
          // Red master warning: solid GPWS pull-up (continuous once in envelope)
          red.intensity = 3
          rg.material.opacity = 0.85
          rg.position.copy(aircraftCenter(aircraft))

          // t < 0.35: pilot reaction delay - still descending toward terrain
          // t >= 0.35: firm pitch-up to target, TOGA, clean up drag
          if (vt >= 0.35) {
            fs.targetPitch = targetPitch
            thrust = Math.min(1, thrust + dt * 0.8) // TOGA spool ~1.25s
            fs.speed = Math.min(7.5, fs.speed + dt * 0.55) // TOGA acceleration
            // Clean up (gear/flaps) once climbing - alpha drops, flight path follows pitch
            fs.alpha += (2.2 - fs.alpha) * Math.min(1, dt * 1.4)
          }
          // Stabilized climb: ease pitch back slightly after capture
          if (vt > 7) {
            fs.targetPitch = targetPitch - 3
          }

          stepFlight(fs, dt, 2.2) // urgent response
          integrateFlight(fs, dt, baseRot)
          applyFlight(fs, aircraft, basePos, baseRot)

          // Exhaust: intensity follows thrust; particles stream aft
          const positions = engineWorldPositions(aircraft)
          positions.forEach((wp, i) => {
            exhausts[i].position.copy(wp)
            engGlows[i].position.copy(wp)
            engGlows[i].scale.setScalar(0.8 + thrust * 1.6)
            const pos = exhausts[i].geometry.getAttribute('position') as THREE.BufferAttribute
            const ages = exhausts[i].userData.ages as Float32Array
            for (let j = 0; j < ages.length; j++) {
              ages[j] -= dt
              if (ages[j] <= 0) { ages[j] = 0.4 + Math.random() * 0.3; resetParticle(exhausts[i], j, 0.4) }
              pos.array[j * 3 + 2] += (0.03 + thrust * 0.1)
              pos.array[j * 3 + 1] += 0.005
            }
            pos.needsUpdate = true
            ;(exhausts[i].material as THREE.PointsMaterial).opacity = 0.15 + thrust * 0.5
          })
        },
        dispose: cleanup,
      }
    }

    // ===== SINK RATE (GPWS Mode 1) =====
    // Excessive descent rate: pull up (similar to terrain but triggered by V/S alone).
    // Arrest descent, establish climb. Less extreme than terrain pull-up.
    case 'sink-rate': {
      const fs = createFlight({ pitch: -7, alpha: 8, speed: 4.0, maxPitchRate: 3.5 })
      const red = addLight(0xff2020, 0, 30)
      const rg = addSprite(glow('rgba(255,40,40,0.8)', 4))
      let thrust = 0

      return {
        update(dt) {
          vt += dt
          red.intensity = Math.sin(vt * 4) > 0 ? 2.5 : 0
          rg.material.opacity = Math.sin(vt * 4) > 0 ? 0.7 : 0.1
          rg.position.copy(aircraftCenter(aircraft))

          if (vt >= 0.5) {
            fs.targetPitch = mfr === 'airbus' ? 13 : 15
            thrust = Math.min(1, thrust + dt * 0.5)
            fs.alpha += (4 - fs.alpha) * Math.min(1, dt * 0.5)
          }
          stepFlight(fs, dt, 1.2)
          integrateFlight(fs, dt, baseRot)
          applyFlight(fs, aircraft, basePos, baseRot)
        },
        dispose: cleanup,
      }
    }

    // ===== GLIDE SLOPE (GPWS Mode 5) =====
    // Excessive below glide-slope deviation. Initially continues; if excessive,
    // reduce descent and pitch up slightly; if persists → go around.
    case 'glide-slope': {
      const fs = createFlight({ pitch: -3, alpha: 9, speed: 3.8, maxPitchRate: 2 })
      const amber = addLight(0xffaa00, 0, 25)
      const ag = addSprite(glow('rgba(255,170,0,0.6)', 3))

      return {
        update(dt) {
          vt += dt
          strobe(amber, ag, 1.2, 2.2, 0)

          // Below glide slope: initially maintain; if warning persists, correct
          if (vt < 2) {
            fs.targetPitch = -3 // continue approach, slightly low
          } else if (vt < 6) {
            fs.targetPitch = 4 // reduce descent, pitch up to recapture
          } else {
            fs.targetPitch = mfr === 'airbus' ? 8 : 9 // go-around attitude
          }
          stepFlight(fs, dt)
          integrateFlight(fs, dt, baseRot)
          applyFlight(fs, aircraft, basePos, baseRot)
          ag.position.copy(aircraftCenter(aircraft))
        },
        dispose: cleanup,
      }
    }

    // ===== DON'T SINK (GPWS Mode 3) =====
    // Altitude loss after takeoff / go-around. Pitch up, climb away.
    case 'dont-sink': {
      const fs = createFlight({ pitch: 2, alpha: 6, speed: 4.2, maxPitchRate: 2.5 })
      const amber = addLight(0xffaa00, 0, 25)

      return {
        update(dt) {
          vt += dt
          strobe(amber, null, 1.5, 2.2, 0)

          // Start with slight descent (the condition), then pitch up
          if (vt < 0.8) fs.targetPitch = -2 // altitude loss developing
          else fs.targetPitch = mfr === 'airbus' ? 12 : 13

          stepFlight(fs, dt)
          integrateFlight(fs, dt, baseRot)
          applyFlight(fs, aircraft, basePos, baseRot)
        },
        dispose: cleanup,
      }
    }

    // ===== OBSTACLE (predictive TAWS) =====
    // Terrain/obstacle look-ahead: immediate maximum climb, may add slight bank to avoid.
    case 'obstacle': {
      const fs = createFlight({ pitch: -2, alpha: 6, speed: 4.2, maxPitchRate: 3 })
      const red = addLight(0xff2020, 0, 30)
      addCity(34)

      return {
        update(dt) {
          vt += dt
          tryCity()
          strobe(red, null, 1.5, 2.8, 0)

          if (vt >= 0.5) {
            fs.targetPitch = 16
            fs.targetRoll = 8 // slight bank to avoid obstacle
            fs.targetYawRate = 0.8 // gentle turn
          }
          stepFlight(fs, dt)
          integrateFlight(fs, dt, baseRot)
          applyFlight(fs, aircraft, basePos, baseRot)
        },
        dispose: cleanup,
      }
    }

    // ===== TOO LOW TERRAIN (Mode 4A) =====
    // Unsafe terrain clearance in approach config not set for landing.
    // Pitch up, go around.
    case 'too-low-terrain': {
      const fs = createFlight({ pitch: -2, alpha: 8, speed: 3.8, maxPitchRate: 2.5 })
      const amber = addLight(0xffaa00, 0, 25)

      return {
        update(dt) {
          vt += dt
          strobe(amber, null, 1.5, 2.2, 0)

          if (vt >= 0.5) fs.targetPitch = 10
          stepFlight(fs, dt)
          integrateFlight(fs, dt, baseRot)
          applyFlight(fs, aircraft, basePos, baseRot)
        },
        dispose: cleanup,
      }
    }

    // ===== TOO LOW GEAR (Mode 4B) =====
    // Gear not down near terrain. Go around, extend gear.
    case 'too-low-gear': {
      const fs = createFlight({ pitch: -2, alpha: 8, speed: 3.8, maxPitchRate: 2.5 })
      const red = addLight(0xff2020, 0, 20)
      const gear = findByName(aircraft, /gear|wheel|tire|tyre|strut|lg\b|landing/i)
      const gearSaved = gear.map((g) => ({ obj: g, vis: g.visible, y: g.position.y }))
      gearSaved.forEach((g) => { g.obj.visible = false })
      let gearExt = 0

      return {
        update(dt) {
          vt += dt
          strobe(red, null, 1.5, 2.8, 0)

          if (vt >= 0.5) fs.targetPitch = 8
          gearExt = Math.min(1, gearExt + dt * 0.7) // gear extends over ~1.5s
          gearSaved.forEach((g) => {
            g.obj.visible = true
            g.obj.position.y = g.y - gearExt * 0.5
          })

          stepFlight(fs, dt)
          integrateFlight(fs, dt, baseRot)
          applyFlight(fs, aircraft, basePos, baseRot)
        },
        dispose() {
          gearSaved.forEach((g) => { g.obj.visible = g.vis; g.obj.position.y = g.y })
          cleanup()
        },
      }
    }

    // ===== TOO LOW FLAPS (Mode 4C) =====
    // Flaps not set for approach near terrain. Pitch up, configure.
    case 'too-low-flaps': {
      const fs = createFlight({ pitch: -2, alpha: 8, speed: 3.8, maxPitchRate: 2.5 })
      const amber = addLight(0xffaa00, 0, 20)

      return {
        update(dt) {
          vt += dt
          strobe(amber, null, 1.5, 2.2, 0)
          if (vt >= 0.5) fs.targetPitch = 8
          stepFlight(fs, dt)
          integrateFlight(fs, dt, baseRot)
          applyFlight(fs, aircraft, basePos, baseRot)
        },
        dispose: cleanup,
      }
    }

    // ===== CONFIG WARNING =====
    // Landing config unsafe (e.g. flaps asymmetry, gear not locked). Go around.
    case 'config-warning': {
      const fs = createFlight({ pitch: 0, alpha: 7, speed: 4.0, maxPitchRate: 2.5 })
      const red = addLight(0xff2020, 0, 25)
      const spoilers = findByName(aircraft, /spoiler|panel|speedbrake|airbrake/i)
      const spSaved = spoilers.map((s) => ({ obj: s, rx: s.rotation.x }))
      let spDeploy = 0

      return {
        update(dt) {
          vt += dt
          strobe(red, null, 2, 3, 0)

          // Retract speedbrakes, go around
          spDeploy = Math.max(0, spDeploy - dt * 2)
          spSaved.forEach((s) => { s.obj.rotation.x = s.rx - spDeploy * 0.5 })
          if (vt >= 0.4) fs.targetPitch = 10

          stepFlight(fs, dt)
          integrateFlight(fs, dt, baseRot)
          applyFlight(fs, aircraft, basePos, baseRot)
        },
        dispose() {
          spSaved.forEach((s) => { s.obj.rotation.x = s.rx })
          cleanup()
        },
      }
    }

    // ===== WINDSHEAR =====
    // Real escape: TOGA immediately, pitch to 15° (Boeing) / 15-20° (Airbus FD),
    // HOLD constant pitch — path changes with energy (initially sinks as airspeed
    // decays in tailwind shear, then climbs as TOGA accelerates).
    case 'windshear': {
      const targetPitch = 15
      const fs = createFlight({ pitch: 3, alpha: 8, speed: 4.0, maxPitchRate: 3 })
      const green = addLight(0x00ff40, 0, 20)
      const red = addLight(0xff2020, 0, 20)
      const vapor = addPoints(makeParticles(30, 0xaaddff, 0.2))
      let thrust = 0

      return {
        update(dt) {
          vt += dt
          // Reactive windshear aural: rapid green/red alternation
          const phase = Math.sin(vt * 10)
          green.intensity = phase > 0 ? 3 : 0
          red.intensity = phase < 0 ? 3 : 0

          // Energy model: vsOverride from shear-induced sink to TOGA climb
          // Phase 1 (0-1.5s): performance loss, sink develops, speed decays
          // Phase 2 (1.5s+): TOGA, pitch constant at target, energy builds, climb
          if (vt < 1.5) {
            fs.vsOverride = -vt * 0.25 // increasing sink up to ~-0.4
            fs.speed = Math.max(3.0, 4.0 - vt * 0.5) // airspeed decays
            fs.targetPitch = 3 // initial attitude before escape
          } else {
            fs.targetPitch = targetPitch
            thrust = Math.min(1, thrust + dt * 0.5)
            // vs transitions from sink to climb as energy builds (pitch held constant)
            const sink = -0.4
            const climb = 0.55
            const p = clamp((vt - 1.5) / 5, 0, 1)
            fs.vsOverride = sink + (climb - sink) * (p * p * (3 - 2 * p)) // smoothstep
            fs.speed = Math.min(4.5, fs.speed + dt * 0.25) // speed rebuilds
          }

          stepFlight(fs, dt)
          integrateFlight(fs, dt, baseRot)
          applyFlight(fs, aircraft, basePos, baseRot)

          // Shear buffet: light turbulence throughout
          const [bp, br] = buffet(vt, 3, 0.35 * DEG, 2.5, 0.8 * DEG)
          aircraft.rotation.x -= bp
          aircraft.rotation.z -= br

          vapor.position.copy(aircraftCenter(aircraft))
          const vp = vapor.geometry.getAttribute('position') as THREE.BufferAttribute
          for (let i = 0; i < 30; i++) {
            vp.array[i * 3] = (Math.random() - 0.5) * 8
            vp.array[i * 3 + 1] = (Math.random() - 0.5) * 3
            vp.array[i * 3 + 2] = (Math.random() - 0.5) * 4
          }
          vp.needsUpdate = true
        },
        dispose: cleanup,
      }
    }

    // ===== STALL =====
    // FAA recovery template: disconnect AP → nose down until stall clears →
    // wings level → adjust thrust → pull out. Real break: sudden pitch drop
    // 5-10°, possible wing drop 15-25°, heavy buffet before.
    case 'stall': {
      // Airbus FBW: alpha protection limits; Boeing: deeper break, stick shaker/pusher
      const breakPitchDrop = mfr === 'airbus' ? 6 : 9
      const wingDropDeg = mfr === 'airbus' ? 12 : 20
      const fs = createFlight({ pitch: 12, alpha: 12, speed: 2.8, maxPitchRate: 4, maxRollRate: 8 })
      const red = addLight(0xff1010, 0, 25)
      const amber = addLight(0xffaa00, 0, 20)
      const vapor = addPoints(makeParticles(60, 0xddeeff, 0.3))
      let buffetAmp = 0
      let wingDropSide = Math.random() < 0.5 ? -1 : 1

      return {
        update(dt) {
          vt += dt
          strobe(red, null, 2, 3, 0)
          amber.intensity = 2

          if (vt < 3) {
            // Approach to stall: high alpha, slow decay, buffet builds
            fs.targetPitch = 13
            fs.speed = Math.max(2.4, 2.8 - vt * 0.12)
            buffetAmp = Math.min(1, vt / 3)
          } else if (vt < 4.2) {
            // Stall break: sudden nose drop + wing drop
            fs.targetPitch = 12 - breakPitchDrop
            fs.targetRoll = wingDropSide * wingDropDeg
            buffetAmp = 1
            fs.speed = 2.4
          } else if (vt < 8) {
            // Recovery: push nose down, level wings, accelerate
            fs.targetPitch = mfr === 'airbus' ? 0 : -2
            fs.targetRoll = 0
            buffetAmp = Math.max(0, 1 - (vt - 4.2) / 2)
            fs.speed = Math.min(4.0, fs.speed + dt * 0.4)
            fs.alpha = Math.max(5, fs.alpha - dt * 1.5)
          } else {
            // Pull out: establish climb at recovered speed
            fs.targetPitch = 6
            fs.targetRoll = 0
            buffetAmp = 0
            fs.speed = Math.min(4.2, fs.speed + dt * 0.2)
            fs.alpha = 5
          }

          stepFlight(fs, dt, 1.0) // faster pitch response in upset
          integrateFlight(fs, dt, baseRot)
          applyFlight(fs, aircraft, basePos, baseRot)

          // Buffet overlay (pre-stall shake + wing rock)
          if (buffetAmp > 0.05) {
            const rock = Math.sin(vt * 2.2 * Math.PI * 2) * 2.5 * buffetAmp * DEG
            const shake = Math.sin(vt * 9 * Math.PI * 2) * 0.5 * buffetAmp * DEG
            aircraft.rotation.z -= rock
            aircraft.rotation.x -= shake
          }

          // Stall vapor over wings at high alpha
          vapor.position.copy(aircraftCenter(aircraft))
          const vp = vapor.geometry.getAttribute('position') as THREE.BufferAttribute
          const n = 60
          for (let i = 0; i < n; i++) {
            if (fs.alpha > 8) {
              vp.array[i * 3] = (Math.random() - 0.5) * 10
              vp.array[i * 3 + 1] = (Math.random() - 0.5) * 2 + 0.5
              vp.array[i * 3 + 2] = (Math.random() - 0.5) * 3
            }
          }
          vp.needsUpdate = true
          ;(vapor.material as THREE.PointsMaterial).opacity = clamp((fs.alpha - 7) / 5, 0, 0.6)
        },
        dispose: cleanup,
      }
    }

    // ===== BANK ANGLE =====
    // Excessive bank (>45° transport). Roll to level at ~6-8°/s, slight back-pressure.
    case 'bank-angle': {
      const fs = createFlight({ roll: 55, pitch: 4, alpha: 5, speed: 4.5, maxRollRate: 7, maxPitchRate: 2 })
      const amber = addLight(0xffaa00, 0, 30)

      return {
        update(dt) {
          vt += dt
          strobe(amber, null, 1.5, 2.5, 0)

          // Roll toward level; slight pitch up to hold altitude in the bank
          fs.targetRoll = 0
          fs.targetPitch = fs.roll > 15 ? 5 : 2 // back-pressure while banked

          stepFlight(fs, dt)
          integrateFlight(fs, dt, baseRot)
          applyFlight(fs, aircraft, basePos, baseRot)
        },
        dispose: cleanup,
      }
    }

    // ===== MASTER WARNING =====
    // Generic master warning (e.g. engine fire w/o motion, hydraulics, etc).
    // Aircraft holds attitude; crew response begins (slight pitch trim release).
    case 'master-warning': {
      const red = addLight(0xff0000, 0, 30)
      const amber = addLight(0xffaa00, 0, 25)
      const fs = createFlight({ pitch: 2, alpha: 4, speed: 4.5, maxPitchRate: 1.5 })

      return {
        update(dt) {
          vt += dt
          // Master warning: red flashing at ~1Hz (attention-getter)
          const rw = Math.sin(vt * 2 * Math.PI) > 0
          red.intensity = rw ? 3.5 : 0
          amber.intensity = !rw && Math.sin(vt * 2 * Math.PI + Math.PI / 2) > 0 ? 2 : 0

          // Aircraft maintains attitude, tiny phugoid from trim
          fs.targetPitch = 2
          stepFlight(fs, dt, 2.5)
          integrateFlight(fs, dt, baseRot)
          applyFlight(fs, aircraft, basePos, baseRot)
          aircraft.rotation.x -= phugoid(vt, 0.3 * DEG, 14)
        },
        dispose: cleanup,
      }
    }

    // ===== AP DISCONNECT =====
    // Real: possible small pitch transient if out of trim; then hand-fly, roughly level.
    case 'ap-disconnect': {
      const fs = createFlight({ pitch: 2, alpha: 4, speed: 4.5, maxPitchRate: 3 })
      const caution = addLight(0xff8800, 0, 20)
      // Autopilot disconnect cavalry charge: triple-chime visual ~0.5s
      let trimmed = false

      return {
        update(dt) {
          vt += dt
          // Disconnect chime: three short flashes in first 0.6s, then steady caution
          if (vt < 0.6) {
            caution.intensity = vt % 0.2 < 0.1 ? 3 : 0
          } else {
            caution.intensity = 1.5 + Math.sin(vt * 3) * 0.5
          }

          // Pitch transient: out-of-trim release, then settle
          if (!trimmed) {
            fs.targetPitch = 3.5 // slight nose-up trim release
            if (vt > 0.8) { fs.targetPitch = 2; trimmed = true }
          }
          stepFlight(fs, dt, 1.2)
          integrateFlight(fs, dt, baseRot)
          applyFlight(fs, aircraft, basePos, baseRot)
        },
        dispose: cleanup,
      }
    }

    // ===== ALTITUDE ALERT =====
    // Passing assigned altitude: flight crew pitches to level off.
    // Smooth deceleration in climb/descent to capture altitude.
    case 'altitude-alert': {
      const fs = createFlight({ pitch: 6, alpha: 4, speed: 5.0, maxPitchRate: 2 })
      const amber = addLight(0xffaa00, 0, 20)

      return {
        update(dt) {
          vt += dt
          amber.intensity = 1.5 + Math.sin(vt * 4 * Math.PI) * 1

          // Climb captured: bleed pitch to ~2°
          if (vt > 1) fs.targetPitch = 2

          stepFlight(fs, dt, 2.0)
          integrateFlight(fs, dt, baseRot)
          applyFlight(fs, aircraft, basePos, baseRot)
          // Level-off phugoid
          if (vt > 2) aircraft.rotation.x -= phugoid(vt - 2, 0.35 * DEG, 11)
        },
        dispose: cleanup,
      }
    }

    default:
      return null
  }
}
