import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { getPlaneById } from '../data/planes'
import { loadGLTF, visibleBox } from '../lib/gltf'

interface ExperienceProps {
  planeId: string
  playingId: string | null
  reducedMotion: boolean
  onPlaneClick?: () => void
  onPlaneLoaded?: () => void
}

// Camera keyframes: [scrollProgress, camX, camY, camZ, lookX, lookY, lookZ]
const CAM_PATH: [number, number, number, number, number, number, number][] = [
  [0.00, -18, 8, 28,  0, 3, 0],
  [0.12, -14, 7, 22,  0, 3, 0],
  [0.25, -8,  5, 17,  0, 3, 0],
  [0.40, -1,  4, 13,  0, 3, 0],
  [0.55,  7,  5, 13,  0, 3, 0],
  [0.70, 14,  7, 18,  0, 3, 0],
  [0.85, 10, 10, 26,  0, 2, 0],
  [1.00,  2, 12, 34,  0, 2, 0],
]

// Per-plane camera multipliers: [distMult, yMult]
function camAdjustFor(plane: { scale: number; camera?: { distMult: number; yMult: number } }): [number, number] {
  if (plane.camera) return [plane.camera.distMult, plane.camera.yMult]
  const ratio = plane.scale / 19
  return [0.55 + 0.45 * ratio, 0.45 + 0.55 * ratio]
}

function lerpCam(progress: number, outPos: THREE.Vector3, outLook: THREE.Vector3, distMult = 1, yMult = 1) {
  let i = 0
  while (i < CAM_PATH.length - 1 && CAM_PATH[i + 1][0] < progress) i++
  const a = CAM_PATH[i]
  const b = CAM_PATH[Math.min(i + 1, CAM_PATH.length - 1)]
  const span = b[0] - a[0] || 1
  const t = THREE.MathUtils.clamp((progress - a[0]) / span, 0, 1)
  const smooth = t * t * (3 - 2 * t)
  const rawX = THREE.MathUtils.lerp(a[1], b[1], smooth)
  const rawY = THREE.MathUtils.lerp(a[2], b[2], smooth)
  const rawZ = THREE.MathUtils.lerp(a[3], b[3], smooth)
  // Scale distance from origin and lower Y
  outPos.set(rawX * distMult, rawY * yMult, rawZ * distMult)
  outLook.set(
    THREE.MathUtils.lerp(a[4], b[4], smooth),
    THREE.MathUtils.lerp(a[5], b[5], smooth) * yMult,
    THREE.MathUtils.lerp(a[6], b[6], smooth),
  )
}

export function Experience({ planeId, playingId, reducedMotion, onPlaneClick, onPlaneLoaded }: ExperienceProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef(0)
  const mouseRef = useRef({ x: 0, y: 0 })
  const playingRef = useRef(playingId)
  playingRef.current = playingId
  const onPlaneClickRef = useRef(onPlaneClick)
  onPlaneClickRef.current = onPlaneClick
  const onPlaneLoadedRef = useRef(onPlaneLoaded)
  onPlaneLoadedRef.current = onPlaneLoaded

  const handleScroll = useCallback(() => {
    const doc = document.documentElement
    const max = doc.scrollHeight - window.innerHeight
    scrollRef.current = max > 0 ? window.scrollY / max : 0
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const w = mount.clientWidth
    const h = mount.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b1018)
    scene.fog = new THREE.FogExp2(0x0b1018, 0.014)

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 300)
    camera.position.set(-18, 8, 28)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
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

    const dropLight = new THREE.SpotLight(0xf0f6ff, 6.5, 60, Math.PI / 4, 0.4, 1)
    dropLight.position.set(4, 18, 4)
    dropLight.target.position.set(0, 2, 0)
    dropLight.castShadow = true
    dropLight.shadow.mapSize.set(1024, 1024)
    dropLight.shadow.camera.near = 2
    dropLight.shadow.camera.far = 40
    dropLight.shadow.bias = -0.00015
    dropLight.shadow.normalBias = 0.02
    scene.add(dropLight)
    scene.add(dropLight.target)

    const fill = new THREE.DirectionalLight(0x6888b8, 0.6)
    fill.position.set(-10, 8, 10)
    scene.add(fill)

    const redLight = new THREE.PointLight(0xff3020, 0.4, 25)
    redLight.position.set(0, 3, 0)
    scene.add(redLight)

    const gridHelper = new THREE.GridHelper(80, 80, 0x2a3a50, 0x152030)
    gridHelper.position.y = -3.5
    scene.add(gridHelper)

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x0c121c, metalness: 0.4, roughness: 0.6 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -3.51
    floor.receiveShadow = true
    scene.add(floor)

    // ---- Dust particles ----
    const dustCount = 250
    const dustGeo = new THREE.BufferGeometry()
    const dustPos = new Float32Array(dustCount * 3)
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 50
      dustPos[i * 3 + 1] = Math.random() * 15 - 3
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 50
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
    const dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({ color: 0x6090c0, size: 0.04, transparent: true, opacity: 0.45, depthWrite: false }),
    )
    scene.add(dust)

    // ---- Load selected plane ----
    const plane = getPlaneById(planeId)
    const camAdjust = camAdjustFor(plane)
    let aircraft: THREE.Group | null = null
    let planeCancelled = false

    loadGLTF(plane.model)
      .then((gltf) => {
        if (planeCancelled) return
        aircraft = gltf.scene.clone(true)
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

        // Materials are shared through the GLTF cache — clone them so hover
        // outline / env tuning on this aircraft can't bleed into others
        const matMap = new Map<THREE.Material, THREE.Material>()
        const ownMat = <M extends THREE.Material>(m: M): M => {
          let c = matMap.get(m) as M | undefined
          if (!c) {
            c = m.clone() as M
            matMap.set(m, c)
          }
          return c
        }

        aircraft.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
            if (plane.grounded && /gear|wheel|tire|tyre|strut|lg\b/i.test(child.name)) {
              child.visible = true
            }
            if (Array.isArray(child.material)) {
              child.material = child.material.map((m) => ownMat(m))
            } else {
              child.material = ownMat(child.material)
            }
            const mats = Array.isArray(child.material) ? child.material : [child.material]
            for (const m of mats) {
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

        if (plane.grounded) {
          aircraft.position.y = 0
          aircraft.position.x = plane.position[0]
          aircraft.position.z = plane.position[2]
          aircraft.rotation.set(plane.rotation[0], plane.rotation[1], plane.rotation[2])
          aircraft.updateMatrixWorld(true)
          const b2 = visibleBox(aircraft)
          aircraft.position.y += -4 - b2.min.y
          // Re-center on X/Z after rotation so the model sits on the grid origin
          const c2 = b2.getCenter(new THREE.Vector3())
          aircraft.position.x -= c2.x
          aircraft.position.z -= c2.z
          aircraft.userData.baseY = aircraft.position.y
        } else {
          aircraft.position.set(plane.position[0], plane.position[1], plane.position[2])
          aircraft.rotation.set(plane.rotation[0], plane.rotation[1], plane.rotation[2])
          aircraft.updateMatrixWorld(true)
          const b3 = visibleBox(aircraft)
          const c3 = b3.getCenter(new THREE.Vector3())
          aircraft.position.x -= c3.x - plane.position[0]
          aircraft.position.z -= c3.z - plane.position[2]
          aircraft.userData.baseY = plane.position[1]
        }

        scene.add(aircraft)
        onPlaneLoadedRef.current?.()
      })
      .catch((err) => console.warn('GLB load failed', err))

    // ---- Orbit controls ----
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let hovered: THREE.Group | null = null
    let downPos = { x: 0, y: 0 }

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enabled = false
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.minDistance = 10
    controls.maxDistance = 32
    controls.minPolarAngle = 0.15
    controls.maxPolarAngle = Math.PI * 0.48
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    }

    const setOutline = (group: THREE.Group, on: boolean) => {
      group.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          const mats = Array.isArray(c.material) ? c.material : [c.material]
          for (const m of mats) {
            const mat = m as THREE.MeshStandardMaterial
            if (!mat.emissive) continue
            if (on) {
              if (mat.userData._e === undefined) {
                mat.userData._e = mat.emissive.getHex()
                mat.userData._i = mat.emissiveIntensity
              }
              mat.emissive.setHex(0xc88830)
              mat.emissiveIntensity = 0.55
            } else if (mat.userData._e !== undefined) {
              mat.emissive.setHex(mat.userData._e)
              mat.emissiveIntensity = mat.userData._i ?? 1
              delete mat.userData._e
              delete mat.userData._i
            }
          }
        }
      })
    }

    const pickAircraft = () => {
      if (!aircraft) return null
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObject(aircraft, true)
      return hits.length ? aircraft : null
    }

    const exitFocus = () => {
      if (hovered) setOutline(hovered, false)
      hovered = null
      renderer.domElement.style.cursor = ''
    }

    const onPointerMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
      const hit = pickAircraft()
      const next = hit ? hit : null
      if (next !== hovered) {
        if (hovered) setOutline(hovered, false)
        hovered = next
        if (hovered) setOutline(hovered, true)
        renderer.domElement.style.cursor = hovered ? 'pointer' : ''
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY }
    }

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - downPos.x
      const dy = e.clientY - downPos.y
      if (dx * dx + dy * dy > 25) return
      const hit = pickAircraft()
      if (hit) {
        onPlaneClickRef.current?.()
        return
      }
      exitFocus()
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitFocus()
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    window.addEventListener('keydown', onKey)

    const onMouse = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouse, { passive: true })
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    const onResize = () => {
      const nw = mount.clientWidth
      const nh = mount.clientHeight
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)

    // ---- Animation loop ----
    const camPos = new THREE.Vector3()
    const camLook = new THREE.Vector3()
    let raf = 0
    let t = 0
    let lastPlayingId = playingRef.current

    const tick = () => {
      raf = requestAnimationFrame(tick)
      t += 0.016
      const progress = scrollRef.current

      lerpCam(progress, camPos, camLook, camAdjust[0], camAdjust[1])
      if (!reducedMotion) {
        camPos.x += mouseRef.current.x * 0.9
        camPos.y += mouseRef.current.y * 0.5
      }
      camera.position.lerp(camPos, 0.14)
      camera.lookAt(camLook)

      if (aircraft) {
        const baseY = aircraft.userData.baseY ?? 0
        if (!plane.grounded) {
          aircraft.position.y = reducedMotion ? baseY : baseY + Math.sin(t * 0.3) * 0.2
        }
      }

      const currentPlaying = playingRef.current
      const isPlaying = currentPlaying !== null
      if (currentPlaying !== lastPlayingId) {
        lastPlayingId = currentPlaying
        redLight.intensity = isPlaying ? 1.5 : 0.4
      }
      if (isPlaying && !reducedMotion) {
        redLight.intensity = 1.2 + Math.sin(t * 6) * 0.4
      }

      if (!reducedMotion) dust.rotation.y = t * 0.006
      renderer.render(scene, camera)
    }

    tick()

    return () => {
      planeCancelled = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('keydown', onKey)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      controls.dispose()

      // Free GPU resources built for THIS scene — otherwise every plane
      // change leaks a full environment + geometry set
      envTex.dispose()
      pmrem.dispose()
      dust.geometry.dispose()
      ;(dust.material as THREE.Material).dispose()
      floor.geometry.dispose()
      ;(floor.material as THREE.Material).dispose()
      gridHelper.geometry.dispose()
      ;(gridHelper.material as THREE.Material).dispose()
      if (aircraft) {
        // Geometry is shared with the GLB cache — only dispose our private
        // material clones (materials were cloned via ownMat above)
        aircraft.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mats = Array.isArray(child.material) ? child.material : [child.material]
            for (const m of mats) m.dispose()
          }
        })
      }

      renderer.dispose()
      // Actually release the WebGL context — Chrome caps live contexts (~16)
      // and plane switches would otherwise accumulate until scenes die
      renderer.forceContextLoss()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [reducedMotion, handleScroll, planeId])

  return <div ref={mountRef} className="experience-canvas" aria-hidden="true" />
}
