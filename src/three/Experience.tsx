import { useEffect, useRef, useCallback } from 'react'

import * as THREE from 'three'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

interface ExperienceProps {

  onPanelClick: (id: string) => void

  playingId: string | null

  reducedMotion: boolean

}

// Camera keyframes: [scrollProgress, camX, camY, camZ, lookX, lookY, lookZ]

const CAM_PATH: [number, number, number, number, number, number, number][] = [
  // smooth arc around both planes (747 on deck, A320 airborne) — look stays on the pair
  [0.00, -20, 10, 30,  2, 3, 3],
  [0.12, -16, 8,  24,  2, 3, 3],
  [0.25, -10, 6,  18,  2, 3, 3],
  [0.40,  -2, 5,  14,  2, 3, 3],
  [0.55,   8, 6,  14,  2, 3, 3],
  [0.70,  16, 8,  20,  2, 3, 3],
  [0.85,  12, 11, 28,  2, 2, 2],
  [1.00,   2, 13, 36,  2, 2, 2],
]

function lerpCam(progress: number, outPos: THREE.Vector3, outLook: THREE.Vector3) {

  let i = 0

  while (i < CAM_PATH.length - 1 && CAM_PATH[i + 1][0] < progress) i++

  const a = CAM_PATH[i]

  const b = CAM_PATH[Math.min(i + 1, CAM_PATH.length - 1)]

  const span = b[0] - a[0] || 1

  const t = THREE.MathUtils.clamp((progress - a[0]) / span, 0, 1)

  const smooth = t * t * (3 - 2 * t)

  outPos.set(

    THREE.MathUtils.lerp(a[1], b[1], smooth),

    THREE.MathUtils.lerp(a[2], b[2], smooth),

    THREE.MathUtils.lerp(a[3], b[3], smooth),

  )

  outLook.set(

    THREE.MathUtils.lerp(a[4], b[4], smooth),

    THREE.MathUtils.lerp(a[5], b[5], smooth),

    THREE.MathUtils.lerp(a[6], b[6], smooth),

  )

}

export function Experience({ onPanelClick, playingId, reducedMotion }: ExperienceProps) {

  const mountRef = useRef<HTMLDivElement>(null)

  const scrollRef = useRef(0)

  const mouseRef = useRef({ x: 0, y: 0 })

  const playingRef = useRef(playingId)

  playingRef.current = playingId

  const clickRef = useRef(onPanelClick)

  clickRef.current = onPanelClick

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
    const FLOOR_Y = -3.51

    scene.background = new THREE.Color(0x0b1018)

    scene.fog = new THREE.FogExp2(0x0b1018, 0.014)

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 300)

    camera.position.set(-20, 10, 30)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    renderer.setSize(w, h)

    renderer.toneMapping = THREE.ACESFilmicToneMapping

    renderer.toneMappingExposure = 1.35

    renderer.shadowMap.enabled = true

    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    mount.appendChild(renderer.domElement)

    // ---- Environment for reflections ----

    const pmrem = new THREE.PMREMGenerator(renderer)

    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

    scene.environment = envTex

    scene.environmentIntensity = 0.22

    // ---- Lighting: single dramatic drop light on aircraft only ----

    scene.add(new THREE.AmbientLight(0x122030, 0.35))

    const dropLight = new THREE.SpotLight(0xf0f6ff, 5.5, 60, Math.PI / 4, 0.4, 1)

    dropLight.position.set(4, 18, 4)

    dropLight.target.position.set(4, 2, 4)

    dropLight.castShadow = true

    dropLight.shadow.mapSize.set(2048, 2048)

    dropLight.shadow.camera.near = 2

    dropLight.shadow.camera.far = 40

    dropLight.shadow.bias = -0.00015

    dropLight.shadow.normalBias = 0.02

    dropLight.shadow.radius = 6

    scene.add(dropLight)

    scene.add(dropLight.target)

    // subtle fill so plane doesn't go pure black in shadow areas

    const fill = new THREE.DirectionalLight(0x6888b8, 0.35)

    fill.position.set(-10, 8, 10)

    scene.add(fill)

    // red alert light (pulses when audio plays)

    const redLight = new THREE.PointLight(0xff3020, 0.4, 25)

    redLight.position.set(0, 3, 0)

    scene.add(redLight)

    // ---- Floor ----

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

    // ---- Load A320 GLB ----

    const loader = new GLTFLoader()

    let aircraft: THREE.Group | null = null

    let aircraft2: THREE.Group | null = null

    const prepModel = (model: THREE.Group, targetDim: number) => {
      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = targetDim / maxDim

      model.scale.setScalar(scale)
      model.position.sub(center.multiplyScalar(scale))
      model.userData.halfHeight = (size.y * scale) / 2

      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
          child.receiveShadow = true
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          for (const material of materials) {
            const mat = material as THREE.MeshStandardMaterial
            if (mat && mat.isMeshStandardMaterial) {
              mat.envMapIntensity = 0.9
              mat.metalness = Math.max(mat.metalness, 0.35)
              mat.roughness = Math.min(mat.roughness, 0.45)
              mat.needsUpdate = true
            }
          }
        }
      })

      model.rotation.y = 0
      scene.add(model)
    }

    loader.load(

      '/models/Airbus%20A320.glb',

      (gltf) => {

        aircraft = gltf.scene

        prepModel(aircraft, 16)

        // Airbus A320: airborne beside and slightly behind the Boeing.
        aircraft.position.set(9, 7, -2)
        aircraft.userData.baseY = 7

      },

      undefined,

      (err) => {

        console.warn('GLB load failed, using procedural fallback', err)

      },

    )

    // Boeing 747 — parallel beside the A320, same height, gear up

    loader.load(

      '/models/american_airlines_747_123_boeing.glb',

      (gltf) => {

        aircraft2 = gltf.scene

        prepModel(aircraft2, 19)

        // Keep the Boeing's landing gear visible and place it in the foreground.
        aircraft2.traverse((child) => {
          if (child instanceof THREE.Mesh && /gear|wheel|tire|tyre|strut|lg\b/i.test(child.name)) {
            child.visible = true
          }
        })

        aircraft2.position.x = -4
aircraft2.position.z = 7
aircraft2.position.y = 0
aircraft2.updateMatrixWorld(true)

const box = new THREE.Box3().setFromObject(aircraft2)
aircraft2.position.y += FLOOR_Y - box.min.y

aircraft2.userData.baseY = aircraft2.position.y
      },

      undefined,

      (err) => {

        console.warn('Boeing GLB load failed', err)

      },

    )

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

    // ---- Hover + focus orbit ----

    const raycaster = new THREE.Raycaster()

    const pointer = new THREE.Vector2()

    let hovered: THREE.Group | null = null

    let focused: THREE.Group | null = null

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

              if (mat.userData._e === undefined) mat.userData._e = mat.emissive.getHex()

              mat.emissive.setHex(0xc88830)

              mat.emissiveIntensity = 0.55

            } else if (mat.userData._e !== undefined) {

              mat.emissive.setHex(mat.userData._e)

              mat.emissiveIntensity = 1

            }

          }

        }

      })

    }

    const pickAircraft = () => {

      const groups = [aircraft, aircraft2].filter(Boolean) as THREE.Group[]

      if (!groups.length) return null

      raycaster.setFromCamera(pointer, camera)

      for (const g of groups) {

        const hits = raycaster.intersectObject(g, true)

        if (hits.length) return g

      }

      return null

    }

    const focusOn = (group: THREE.Group) => {
      // focused plane is never highlighted; keep the other plane lit if it was hovered
      if (hovered === group) {
        setOutline(group, false)
        hovered = null
      }
      renderer.domElement.style.cursor = ''
      focused = group
      controls.enabled = true

      const wp = new THREE.Vector3()

      group.getWorldPosition(wp)

      controls.target.copy(wp)

      const dir = new THREE.Vector3().subVectors(camera.position, wp).normalize()

      camera.position.copy(wp.clone().add(dir.multiplyScalar(20)).add(new THREE.Vector3(0, 3, 0)))

      document.documentElement.dataset.focus = 'plane'

    }

    const exitFocus = () => {

      if (!focused) return

      if (hovered) setOutline(hovered, false)

      hovered = null

      focused = null

      controls.enabled = false

      renderer.domElement.style.cursor = ''

      delete document.documentElement.dataset.focus

    }

    const onPointerMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
      const hit = pickAircraft()
      // never highlight the focused plane; highlight the other plane when hovered
      const next = hit && hit !== focused ? hit : null
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

      if (dx * dx + dy * dy > 25) return // was a drag, not a click

      const hit = pickAircraft()

      if (hit) {

        if (hit !== focused) focusOn(hit)

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

      // camera — scroll journey unless focused on a plane

      if (focused) {

        controls.update()

        // keep orbit target pinned to the focused aircraft so it stays centered
        const wp = new THREE.Vector3()
        focused.getWorldPosition(wp)
        controls.target.lerp(wp, 0.25)
        // keep camera above the grid floor
        if (camera.position.y < 0.5) camera.position.y = 0.5

      } else {

        lerpCam(progress, camPos, camLook)

        if (!reducedMotion) {

          camPos.x += mouseRef.current.x * 0.9

          camPos.y += mouseRef.current.y * 0.5

        }

        camera.position.lerp(camPos, 0.14)

        camera.lookAt(camLook)

      }

      // Keep aircraft orientation stable; the camera supplies the cinematic motion.
      if (!focused) {
        if (aircraft) aircraft.rotation.y = 0
        if (aircraft2) aircraft2.rotation.y = 0
      }

      // Airbus floats gently; Boeing stays grounded.
      if (aircraft) {
        const baseY = aircraft.userData.baseY ?? 7
        aircraft.position.y = reducedMotion
          ? baseY
          : baseY + Math.sin(t * 0.3) * 0.2
      }

      if (aircraft2) {
  aircraft2.position.y = aircraft2.userData.baseY
}
      // red light on playing

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

      cancelAnimationFrame(raf)

      window.removeEventListener('resize', onResize)

      window.removeEventListener('mousemove', onMouse)

      window.removeEventListener('scroll', handleScroll)

      window.removeEventListener('pointermove', onPointerMove)

      window.removeEventListener('keydown', onKey)

      renderer.domElement.removeEventListener('pointerdown', onPointerDown)

      renderer.domElement.removeEventListener('pointerup', onPointerUp)

      controls.dispose()

      renderer.dispose()

      mount.removeChild(renderer.domElement)

    }

  }, [reducedMotion, handleScroll])

  return <div ref={mountRef} className="experience-canvas" aria-hidden="true" />

}
