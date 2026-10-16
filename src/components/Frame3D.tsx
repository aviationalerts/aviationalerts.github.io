import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Cache the parsed GLB so we only load once
let frameCache: THREE.Group | null = null
let framePromise: Promise<THREE.Group> | null = null

function loadFrame(): Promise<THREE.Group> {
  if (frameCache) return Promise.resolve(frameCache.clone(true))
  if (!framePromise) {
    framePromise = new Promise((resolve, reject) => {
      const loader = new GLTFLoader()
      loader.load(
        '/models/3d%20frame.glb',
        (gltf) => {
          frameCache = gltf.scene
          resolve(gltf.scene.clone(true))
        },
        undefined,
        reject,
      )
    })
  }
  return framePromise.then((s) => s.clone(true))
}

// Preload photos so they're ready before Frame3D even mounts
const photoTexCache = new Map<string, THREE.Texture>()
const photoTexPending = new Map<string, Promise<THREE.Texture>>()

function preloadPhoto(url: string): Promise<THREE.Texture> {
  const cached = photoTexCache.get(url)
  if (cached) return Promise.resolve(cached)
  const pending = photoTexPending.get(url)
  if (pending) return pending
  const p = new Promise<THREE.Texture>((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.flipY = true
        tex.wrapS = THREE.ClampToEdgeWrapping
        tex.wrapT = THREE.ClampToEdgeWrapping
        photoTexCache.set(url, tex)
        resolve(tex)
      },
      undefined,
      reject,
    )
  })
  photoTexPending.set(url, p)
  return p
}

// Start GLB + photo preloads immediately on module import
export function preloadFrameAssets(photoUrls: string[]) {
  loadFrame().catch(() => {})
  photoUrls.forEach(preloadPhoto)
}

interface Frame3DProps {
  photoUrl: string
  className?: string
}

export function Frame3D({ photoUrl, className }: Frame3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false
    let renderer: THREE.WebGLRenderer | null = null
    let raf = 0
    let frame: THREE.Group | null = null
    let baseScale = 1
    const ownedTextures = new Set<THREE.Texture>()

    const w = container.clientWidth || 400
    const h = container.clientHeight || 480

    // Scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100)
    camera.position.set(0, 0, 6)

    // Lights
    const key = new THREE.DirectionalLight(0xfff0dd, 2.2)
    key.position.set(3, 4, 5)
    scene.add(key)

    const fill = new THREE.DirectionalLight(0x88aacc, 0.6)
    fill.position.set(-4, -2, 3)
    scene.add(fill)

    const rim = new THREE.DirectionalLight(0xe8a33a, 0.8)
    rim.position.set(0, 2, -4)
    scene.add(rim)

    const ambient = new THREE.AmbientLight(0x334455, 0.5)
    scene.add(ambient)

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)
    renderer.domElement.style.opacity = '0'
    renderer.domElement.style.transition = 'opacity 0.5s ease'

    // Mouse tilt state
    const targetRot = { x: 0, y: 0 }
    const currentRot = { x: 0, y: 0 }
    const targetScale = { v: 1 }
    const currentScale = { v: 1 }
    let hovering = false

    const onPointerEnter = () => { hovering = true }
    const onPointerLeave = () => {
      hovering = false
      targetRot.x = 0
      targetRot.y = 0
      targetScale.v = 1
    }

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width - 0.5
      const py = (e.clientY - rect.top) / rect.height - 0.5
      targetRot.y = px * 0.06
      targetRot.x = hovering ? -0.12 + py * 0.04 : 0
      targetScale.v = hovering ? 1.08 : 1
    }

    container.addEventListener('pointerenter', onPointerEnter)
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerleave', onPointerLeave)

    // Load frame + photo
    Promise.all([loadFrame(), preloadPhoto(photoUrl)]).then(([f, photoTex]) => {
      if (disposed) return
      frame = f

      const box = new THREE.Box3().setFromObject(f)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      baseScale = 3.4 / maxDim
      f.scale.setScalar(baseScale)
      f.position.sub(center.multiplyScalar(baseScale))

      f.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = (Array.isArray(child.material)
            ? child.material.map((m) => m.clone())
            : child.material.clone()) as THREE.Material

          const mat = child.material as THREE.MeshStandardMaterial
          if (child.name.includes('PRINT') || mat.name.includes('PRINT')) {
            const uvAttr = child.geometry.attributes.uv
            let uMin = 1, uMax = 0, vMin = 1, vMax = 0
            if (uvAttr) {
              for (let i = 0; i < uvAttr.count; i++) {
                const u = uvAttr.getX(i)
                const v = uvAttr.getY(i)
                if (u < uMin) uMin = u
                if (u > uMax) uMax = u
                if (v < vMin) vMin = v
                if (v > vMax) vMax = v
              }
            }
            const uSpan = uMax - uMin || 1
            const vSpan = vMax - vMin || 1

            const tex = photoTex.clone()
            tex.needsUpdate = true
            tex.repeat.set(1 / uSpan, 1 / vSpan)
            tex.offset.set(-uMin / uSpan, -vMin / vSpan)
            // NOTE: do not dispose mat.map here — it's the cached GLB's
            // texture, shared by every frame instance
            ownedTextures.add(tex)
            mat.map = tex
            mat.needsUpdate = true
          }
          if (mat.name.includes('FRAME')) {
            mat.metalness = 0.3
            mat.roughness = 0.5
          }
          if (mat.name.includes('PRINT')) {
            mat.metalness = 0.0
            mat.roughness = 0.15
          }
        }
      })

      scene.add(f)

      // Fade in canvas, fade out CSS placeholder
      if (renderer) renderer.domElement.style.opacity = '1'
      container.classList.add('frame3d-ready')
    }).catch(() => {})

    // Render loop — pauses entirely while scrolled off-screen (the pilots page
    // mounts 9 of these; running all 9 at 60fps forever wastes battery/GPU)
    let visible = true
    const tick = () => {
      raf = requestAnimationFrame(tick)
      currentRot.x += (targetRot.x - currentRot.x) * 0.04
      currentRot.y += (targetRot.y - currentRot.y) * 0.04
      currentScale.v += (targetScale.v - currentScale.v) * 0.04
      if (frame) {
        frame.rotation.x = currentRot.x
        frame.rotation.y = currentRot.y
        frame.scale.setScalar(baseScale * currentScale.v)
      }
      renderer?.render(scene, camera)
    }
    raf = requestAnimationFrame(tick)

    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.some((e) => e.isIntersecting)
        if (vis === visible || disposed) return
        visible = vis
        if (visible) {
          if (!raf) raf = requestAnimationFrame(tick)
        } else if (raf) {
          cancelAnimationFrame(raf)
          raf = 0
        }
      },
      { rootMargin: '80px' },
    )
    io.observe(container)

    // Resize
    const onResize = () => {
      const nw = container.clientWidth
      const nh = container.clientHeight
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer?.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', onResize)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerenter', onPointerEnter)
      container.removeEventListener('pointerleave', onPointerLeave)
      // Frame geometry is shared with the cache — dispose only our cloned
      // materials and the photo-texture clones we created
      for (const t of ownedTextures) t.dispose()
      if (frame) {
        frame.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mats = Array.isArray(child.material) ? child.material : [child.material]
            for (const m of mats) m.dispose()
          }
        })
      }
      renderer?.dispose()
      renderer?.forceContextLoss()
      if (renderer?.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [photoUrl])

  return (
    <div
      ref={containerRef}
      className={className || 'frame3d-container'}
      style={{ '--frame-photo': `url(${photoUrl})` } as React.CSSProperties}
    />
  )
}
