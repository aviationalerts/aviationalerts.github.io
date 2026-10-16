import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { PLANES, type PlaneDef } from '../data/planes'
import { loadGLTF, visibleBox } from '../lib/gltf'

interface PlaneSelectorProps {
  currentId: string
  open: boolean
  onSelect: (id: string) => void
  onClose: () => void
}

export function PlaneSelector({ currentId, open, onSelect, onClose }: PlaneSelectorProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(() => PLANES.findIndex((p) => p.id === currentId))
  const [loaded, setLoaded] = useState(false)
  const indexRef = useRef(index)
  indexRef.current = index
  const openRef = useRef(open)
  openRef.current = open

  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const aircraftRef = useRef<THREE.Group | null>(null)
  const kickLoopRef = useRef<(() => void) | null>(null)

  const go = (dir: number) => {
    setLoaded(false)
    setIndex((i) => (i + dir + PLANES.length) % PLANES.length)
  }

  const select = () => {
    onSelect(PLANES[indexRef.current].id)
    onClose()
  }

  // Resume the render loop whenever the overlay opens (it idles while closed)
  useEffect(() => {
    if (open) kickLoopRef.current?.()
  }, [open])

  // Resync to current plane whenever the selector opens
  useEffect(() => {
    if (open) {
      setIndex(PLANES.findIndex((p) => p.id === currentId))
    }
  }, [open, currentId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!openRef.current) return
      if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'Enter') select()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let disposed = false
    let raf = 0
    const w = mount.clientWidth
    const h = mount.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b1018)
    scene.fog = new THREE.FogExp2(0x0b1018, 0.018)

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 200)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(w, h)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.4
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    mount.appendChild(renderer.domElement)

    const pmrem = new THREE.PMREMGenerator(renderer)
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTex
    scene.environmentIntensity = 0.25

    scene.add(new THREE.AmbientLight(0x122030, 0.6))
    const key = new THREE.SpotLight(0xf0f6ff, 8, 60, Math.PI / 4, 0.4, 1)
    key.position.set(5, 20, 5)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    scene.add(key)
    scene.add(key.target)
    const fill = new THREE.DirectionalLight(0x6888b8, 0.7)
    fill.position.set(-10, 8, 10)
    scene.add(fill)

    const grid = new THREE.GridHelper(60, 60, 0x2a3a50, 0x152030)
    grid.position.y = -4
    scene.add(grid)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x0c121c, metalness: 0.4, roughness: 0.6 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -4.01
    floor.receiveShadow = true
    scene.add(floor)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.minPolarAngle = 0.2
    controls.maxPolarAngle = Math.PI * 0.48
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    }

    sceneRef.current = scene
    cameraRef.current = camera
    controlsRef.current = controls

    const onResize = () => {
      const nw = mount.clientWidth
      const nh = mount.clientHeight
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)

    // Render loop — fully stops while the overlay is closed so App isn't
    // running a second 3D loop around the clock; kickRef restarts it on open
    const kick = () => {
      if (disposed || raf) return
      raf = requestAnimationFrame(tick)
    }
    const tick = () => {
      raf = 0
      if (disposed) return
      if (!openRef.current) return
      raf = requestAnimationFrame(tick)
      controls.update()
      renderer.render(scene, camera)
    }
    kickLoopRef.current = kick
    if (openRef.current) kick()

    return () => {
      disposed = true
      kickLoopRef.current = null
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      envTex.dispose()
      pmrem.dispose()
      floor.geometry.dispose()
      ;(floor.material as THREE.Material).dispose()
      grid.geometry.dispose()
      ;(grid.material as THREE.Material).dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      sceneRef.current = null
      cameraRef.current = null
      controlsRef.current = null
      aircraftRef.current = null
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [])

  // Load plane model — only reloads the model on index change, scene stays alive
  useEffect(() => {
    const scene = sceneRef.current
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!scene || !camera || !controls) return

    let cancelled = false
    const plane: PlaneDef = PLANES[index]

    // Zoom closer for smaller planes — override via plane.camera
    const camDist = plane.camera?.selectorDist ?? 8 + 14 * (plane.scale / 19)
    const camHeight = plane.camera?.selectorHeight ?? 1.5 + 3 * (plane.scale / 19)
    camera.position.set(0, camHeight, camDist)
    controls.minDistance = camDist * 0.4
    controls.maxDistance = camDist * 1.8

    if (aircraftRef.current) {
      // Drop the previous plane's PRIVATE material clones (geometry stays
      // cached) — they were cloned via ownMat when it was built
      aircraftRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          for (const m of mats) m.dispose()
        }
      })
      scene.remove(aircraftRef.current)
      aircraftRef.current = null
    }
    setLoaded(false)

    loadGLTF(plane.model)
      .then((gltf) => {
        if (cancelled) return
        const aircraft = gltf.scene.clone(true)

        // Make gear visible first so bounds include it
        if (plane.grounded) {
          aircraft.traverse((child) => {
            if (child instanceof THREE.Mesh && /gear|wheel|tire|tyre|strut|lg\b/i.test(child.name)) {
              child.visible = true
            }
          })
        }

        const box = visibleBox(aircraft)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = plane.scale / maxDim
        aircraft.scale.setScalar(scale)
        aircraft.position.sub(center.multiplyScalar(scale))

        if (plane.grounded) {
          aircraft.position.y = 0
          aircraft.rotation.set(plane.rotation[0], plane.rotation[1], plane.rotation[2])
          aircraft.updateMatrixWorld(true)
          const b2 = visibleBox(aircraft)
          aircraft.position.y += -4 - b2.min.y
          const c2 = b2.getCenter(new THREE.Vector3())
          aircraft.position.x -= c2.x
          aircraft.position.z -= c2.z
        } else {
          aircraft.position.y = 1
          aircraft.rotation.set(plane.rotation[0], plane.rotation[1], plane.rotation[2])
          aircraft.updateMatrixWorld(true)
          const b3 = visibleBox(aircraft)
          const c3 = b3.getCenter(new THREE.Vector3())
          aircraft.position.x -= c3.x
          aircraft.position.z -= c3.z
        }

        // Materials are shared through the GLB cache — clone before tuning so
        // the selector can't bleed env/metal changes into other scenes
        const matMap = new Map<THREE.Material, THREE.Material>()
        aircraft.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
            const src = Array.isArray(child.material) ? child.material : [child.material]
            const owned = src.map((m): THREE.Material => {
              const existing = matMap.get(m)
              if (existing) return existing
              const clone: THREE.Material = m.clone()
              matMap.set(m, clone)
              return clone
            })
            child.material = Array.isArray(child.material) ? owned : owned[0]
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

        scene.add(aircraft)
        aircraftRef.current = aircraft
        controls.target.set(0, aircraft.position.y, 0)
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [index])

  const plane = PLANES[index]

  return (
    <div className="ps-overlay" data-open={open} aria-hidden={!open}>
      <div ref={mountRef} className="ps-canvas" />

      {/* Scanline overlay */}
      <div className="ps-scanlines" aria-hidden="true" />

      {/* Corner brackets */}
      <div className="ps-corner ps-corner-tl" aria-hidden="true" />
      <div className="ps-corner ps-corner-tr" aria-hidden="true" />
      <div className="ps-corner ps-corner-bl" aria-hidden="true" />
      <div className="ps-corner ps-corner-br" aria-hidden="true" />

      {/* Top HUD bar */}
      <div className="ps-hud-top">
        <div className="ps-hud-left">
          <span className="ps-hud-dot" />
          <span className="ps-hud-label">AIRCRAFT SELECT</span>
        </div>
        <div className="ps-hud-right">
          <span className="ps-hud-mode">{plane.grounded ? 'GROUND' : 'AIRBORNE'}</span>
          <span className="ps-hud-divider">|</span>
          <span className="ps-hud-id">{plane.id.toUpperCase()}</span>
        </div>
      </div>

      {!loaded && (
        <div className="ps-loading">
          <div className="ps-loading-ring" />
          <span>LOADING {plane.name.toUpperCase()}…</span>
        </div>
      )}

      <button className="ps-close" onClick={onClose} aria-label="Close selector">
        <X size={18} />
      </button>

      {/* Arrows */}
      <button className="ps-arrow ps-arrow-left" onClick={() => go(-1)} aria-label="Previous plane">
        <ChevronLeft size={28} />
      </button>
      <button className="ps-arrow ps-arrow-right" onClick={() => go(1)} aria-label="Next plane">
        <ChevronRight size={28} />
      </button>

      {/* Bottom info panel */}
      <div className="ps-panel">
        <div className="ps-panel-corners" aria-hidden="true">
          <span /><span /><span /><span />
        </div>

        <div className="ps-panel-header">
          <span className="ps-panel-tag">// {plane.category.toUpperCase()}</span>
          <span className="ps-panel-counter">{(index + 1).toString().padStart(2, '0')} / {PLANES.length.toString().padStart(2, '0')}</span>
        </div>

        <h2 className="ps-panel-name">{plane.name}</h2>

        <p className="ps-panel-detail">{plane.detail}</p>

        {/* Dot indicators */}
        <div className="ps-dots">
          {PLANES.map((_, i) => (
            <button
              key={i}
              className={`ps-dot ${i === index ? 'ps-dot-active' : ''} ${i < index ? 'ps-dot-past' : ''}`}
              onClick={() => { setLoaded(false); setIndex(i) }}
              aria-label={`Select ${PLANES[i].name}`}
            />
          ))}
        </div>

        <button className="ps-select-btn" onClick={select}>
          <span className="ps-select-btn-border" aria-hidden="true" />
          <span>DEPLOY AIRCRAFT</span>
        </button>
      </div>

      {/* Side data readouts */}
      <div className="ps-readouts" aria-hidden="true">
        <div className="ps-readout-row">
          <span className="ps-readout-key">CAT</span>
          <span className="ps-readout-val">{plane.category.slice(0, 3).toUpperCase()}</span>
        </div>
        <div className="ps-readout-row">
          <span className="ps-readout-key">GRD</span>
          <span className={`ps-readout-val ${plane.grounded ? 'ps-readout-hot' : ''}`}>{plane.grounded ? 'YES' : 'NO'}</span>
        </div>
        <div className="ps-readout-row">
          <span className="ps-readout-key">SCL</span>
          <span className="ps-readout-val">{plane.scale.toFixed(0)}</span>
        </div>
      </div>
    </div>
  )
}
