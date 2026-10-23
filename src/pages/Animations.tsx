import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ArrowLeft, Play, Square } from 'lucide-react'
import { PillNav } from '../components/PillNav'
import { SOUNDS } from '../data/sounds'
import { loadGLTF, visibleBox } from '../lib/gltf'
import { AudioEngine, preloadSounds } from '../lib/audio'
import { createEffect, effectForSound, mfrForSound, EFFECT_LABEL, preloadCity } from '../three/failureEffects'
import type { EffectKind } from '../three/failureEffects'

const A320 = {
  model: '/models/Airbus%20A320.glb',
  scale: 16,
  position: [0, 5, 0] as [number, number, number],
  rotation: [0, Math.PI * 1.7, 0] as [number, number, number],
}

const SIM_SOUNDS = SOUNDS.filter((s) => {
  const effect = effectForSound(s.id)
  if (effect === 'none') return false
  const m = mfrForSound(s.id)
  return m === 'airbus' || m === 'shared'
})

export default function Animations() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const engineRef = useRef<AudioEngine | null>(null)
  const aircraftRef = useRef<THREE.Group | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const effectRef = useRef<{ update(t: number): void; dispose(): void } | null>(null)
  const effectKindRef = useRef<EffectKind>('none')
  const controlsRef = useRef<{ target: THREE.Vector3 } | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const followActiveRef = useRef(false)

  if (!engineRef.current) {
    engineRef.current = new AudioEngine({
      onPlay: (id) => setPlayingId(id),
      onEnded: () => setPlayingId(null),
      onError: () => setPlayingId(null),
    })
    // Real GPWS warnings repeat continuously until the condition clears
    engineRef.current.setLoop(true)
  }

  const togglePlay = (id: string) => {
    engineRef.current?.play(id)
  }

  const stopAll = () => {
    engineRef.current?.stop()
    setPlayingId(null)
  }

  const currentEffect: EffectKind = playingId ? effectForSound(playingId) : 'none'
  const currentSound = playingId ? SIM_SOUNDS.find((s) => s.id === playingId) : null

  const grouped = useMemo(() => {
    const map = new Map<EffectKind, typeof SIM_SOUNDS>()
    for (const s of SIM_SOUNDS) {
      const k = effectForSound(s.id)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(s)
    }
    return map
  }, [])

  // Update effect when playing changes — each alert runs 25s then auto-stops
  useEffect(() => {
    const kind = playingId ? effectForSound(playingId) : 'none'
    effectKindRef.current = kind

    let timer: number | undefined
    if (playingId) {
      timer = window.setTimeout(() => {
        engineRef.current?.stop()
        setPlayingId(null)
      }, 25000)
    }

    const scene = sceneRef.current
    const aircraft = aircraftRef.current
    effectRef.current?.dispose()
    effectRef.current = null
    if (kind !== 'none' && scene && aircraft) {
      followActiveRef.current = true
      effectRef.current = createEffect(kind, scene, aircraft, 'airbus')
    } else {
      followActiveRef.current = false
    }

    return () => {
      if (timer !== undefined) window.clearTimeout(timer)
      effectRef.current?.dispose()
      effectRef.current = null
      followActiveRef.current = false
    }
  }, [playingId])

  // When playback stops, plane resets to center — bring camera back with it
  useEffect(() => {
    if (!playingId && controlsRef.current && aircraftRef.current && cameraRef.current) {
      const delta = aircraftRef.current.position.clone().sub(controlsRef.current.target)
      controlsRef.current.target.copy(aircraftRef.current.position)
      cameraRef.current.position.add(delta)
    }
  }, [playingId])

  // Preload all sounds on mount for instant playback
  useEffect(() => {
    preloadSounds(SIM_SOUNDS.map((s) => s.id))
  }, [])

  // 3D scene
  useEffect(() => {
    preloadCity()
    const mount = mountRef.current
    if (!mount) return
    const w = mount.clientWidth
    const h = mount.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b1018)
    scene.fog = new THREE.FogExp2(0x0b1018, 0.012)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 300)
    camera.position.set(14, 6, 18)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(w, h)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.35
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    mount.appendChild(renderer.domElement)

    const pmrem = new THREE.PMREMGenerator(renderer)
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTex
    scene.environmentIntensity = 0.22

    scene.add(new THREE.AmbientLight(0x122030, 0.55))
    const key = new THREE.SpotLight(0xf0f6ff, 6, 60, Math.PI / 4, 0.4, 1)
    key.position.set(4, 16, 4)
    key.target.position.set(0, 2, 0)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    scene.add(key, key.target)
    const fill = new THREE.DirectionalLight(0x6888b8, 0.5)
    fill.position.set(-10, 8, 10)
    scene.add(fill)

    // Map ground under the aircraft (3:2 image, covers full flight path)
    const mapTex = new THREE.TextureLoader().load('/models/map.jpg')
    mapTex.colorSpace = THREE.SRGBColorSpace
    mapTex.anisotropy = renderer.capabilities.getMaxAnisotropy()
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 160),
      new THREE.MeshStandardMaterial({ map: mapTex, metalness: 0.1, roughness: 0.85 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -4.01
    floor.receiveShadow = true
    scene.add(floor)

    const controls = new OrbitControls(camera, renderer.domElement)
    controlsRef.current = controls
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.minDistance = 10
    controls.maxDistance = 40
    controls.minPolarAngle = 0.2
    controls.maxPolarAngle = Math.PI * 0.48
    controls.target.set(0, 2, 0)

    let cancelled = false

    loadGLTF(A320.model).then((gltf) => {
      if (cancelled) return
      const aircraft = gltf.scene.clone(true)
      const box = visibleBox(aircraft)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = A320.scale / maxDim
      aircraft.scale.setScalar(scale)
      aircraft.position.sub(center.multiplyScalar(scale))

      // Materials are shared through the GLB cache — clone before tuning so
      // this scene can't bleed env/metal changes into other pages
      const matMap = new Map<THREE.Material, THREE.Material>()
      aircraft.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          c.castShadow = true
          c.receiveShadow = true
          const src = Array.isArray(c.material) ? c.material : [c.material]
          const owned = src.map((m): THREE.Material => {
            const existing = matMap.get(m)
            if (existing) return existing
            const clone: THREE.Material = m.clone()
            matMap.set(m, clone)
            return clone
          })
          c.material = Array.isArray(c.material) ? owned : owned[0]
          for (const m of owned) {
            const mat = m as THREE.MeshStandardMaterial
            if (mat?.isMeshStandardMaterial) {
              mat.envMapIntensity = 0.9
              mat.metalness = Math.max(mat.metalness, 0.35)
              mat.roughness = Math.min(mat.roughness, 0.45)
              mat.needsUpdate = true
            }
          }
        }
      })

      aircraft.position.set(A320.position[0], A320.position[1], A320.position[2])
      aircraft.rotation.set(A320.rotation[0], A320.rotation[1], A320.rotation[2])
      aircraft.updateMatrixWorld(true)
      const b3 = visibleBox(aircraft)
      const c3 = b3.getCenter(new THREE.Vector3())
      aircraft.position.x -= c3.x - A320.position[0]
      aircraft.position.z -= c3.z - A320.position[2]

      scene.add(aircraft)
      aircraftRef.current = aircraft

      if (effectKindRef.current !== 'none') {
        followActiveRef.current = true
        effectRef.current = createEffect(effectKindRef.current, scene, aircraft, 'airbus')
      }
    }).catch((e) => { console.error('[plane] load failed', e) })

    const onResize = () => {
      const nw = mount.clientWidth
      const nh = mount.clientHeight
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)

    let raf = 0
    let lastT = performance.now()
    const trackPos = new THREE.Vector3()
    const lastTarget = new THREE.Vector3()
    const frameDelta = new THREE.Vector3()
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const now = performance.now()
      const dt = Math.min((now - lastT) / 1000, 0.05)
      lastT = now
      effectRef.current?.update(dt)
      // Fly the camera alongside the aircraft while an effect is running
      if (aircraftRef.current && effectRef.current && followActiveRef.current) {
        trackPos.copy(aircraftRef.current.position)
        lastTarget.copy(controls.target)
        controls.target.lerp(trackPos, 1 - Math.exp(-dt * 5))
        frameDelta.subVectors(controls.target, lastTarget)
        camera.position.add(frameDelta)
      }
      controls.update()
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      effectRef.current?.dispose()
      effectRef.current = null
      aircraftRef.current = null
      followActiveRef.current = false
      controls.dispose()
      controlsRef.current = null
      cameraRef.current = null

      // Free GPU resources built for this page (env map, floor, textures)
      envTex.dispose()
      pmrem.dispose()
      floor.geometry.dispose()
      const floorMat = floor.material as THREE.MeshStandardMaterial
      floorMat.map?.dispose()
      floorMat.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  useEffect(() => {
    return () => engineRef.current?.destroy()
  }, [])

  let channelIndex = 0

  return (
    <div className="anim-page">
      <aside className="anim-rail">
        <div className="anim-rail-head">
          <a href="/" className="pilots-back anim-back">
            <ArrowLeft size={14} />
            Home
          </a>
          <h1 className="anim-title">
            Failure<span>SIM</span>
          </h1>
          <div className="anim-craft">
            <div className="anim-craft-top">
              <span className="anim-craft-name">Airbus A320</span>
              <span className={`anim-craft-state${playingId ? ' live' : ''}`}>
                <i />
                {playingId ? 'LIVE' : 'READY'}
              </span>
            </div>
            <div className="anim-craft-meta">NARROW-BODY · TWIN-ENGINE · SIM AIRFRAME 01</div>
          </div>
        </div>

        <PillNav />

        {playingId && (
          <button type="button" className="anim-stop" onClick={stopAll}>
            <Square size={11} />
            Abort scenario
          </button>
        )}

        <div className="anim-sound-list">
          {[...grouped.entries()].map(([kind, sounds]) => (
            <div key={kind} className="anim-group">
              <h3 className="anim-group-title">
                <span>{EFFECT_LABEL[kind]}</span>
                <em>{String(sounds.length).padStart(2, '0')}</em>
              </h3>
              {sounds.map((s) => {
                channelIndex += 1
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`anim-sound-btn${playingId === s.id ? ' active' : ''}`}
                    onClick={() => togglePlay(s.id)}
                  >
                    <span className="anim-ch-num">{String(channelIndex).padStart(2, '0')}</span>
                    <span className="anim-ch-label">{s.label}</span>
                    {playingId === s.id ? (
                      <span className="anim-eq" aria-hidden>
                        <i /><i /><i />
                      </span>
                    ) : (
                      <Play size={10} className="anim-ch-play" />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <footer className="anim-rail-foot">
          DRAG ORBIT · SCROLL ZOOM · ALERTS AUTO-RESET AFTER 25S
        </footer>
      </aside>

      <div className="anim-stage">
        <div ref={mountRef} className="anim-canvas" />
        <div className="anim-frame" aria-hidden>
          <span className="anim-tick tl" /><span className="anim-tick tr" />
          <span className="anim-tick bl" /><span className="anim-tick br" />
        </div>
        {currentSound && currentEffect !== 'none' && (
          <div className="anim-live">
            <div className="anim-live-row">
              <span className="anim-live-dot" />
              SIMULATION ACTIVE
            </div>
            <div className="anim-live-name">{EFFECT_LABEL[currentEffect]}</div>
            <div className="anim-live-sound">{currentSound.label}</div>
          </div>
        )}
      </div>
    </div>
  )
}
