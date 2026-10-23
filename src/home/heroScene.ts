import * as THREE from 'three'
import { loadGLTF } from '../lib/gltf'
import {
  tween,
  cancelAllTweens,
  power2Out,
  power2InOut,
  power3Out,
  power4Out,
  scaleBetween,
  radians,
} from './tween'

export type Quality = 'high' | 'low' | 'off'

export interface HeroRefs {
  root: HTMLElement
  canvasHost: HTMLElement
  buttonEl: HTMLElement
  bgGroupEl: HTMLElement
  fgGroupEl: HTMLElement
  bgInnerEl: HTMLElement
  fgInnerEl: HTMLElement
}

export interface HeroHandle {
  startIntro(): void
  setDpr(limit: number): void
  pause(): void
  resume(): void
  destroy(): void
}

const DPR_HIGH = 1.75

function gsapTransform(
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  s: number,
): string {
  return `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`
}

function gradientEnvTexture(renderer: THREE.WebGLRenderer): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, 128)
  g.addColorStop(0, '#f2f7fc')
  g.addColorStop(0.42, '#dde6ee')
  g.addColorStop(0.5, '#b3c0cb')
  g.addColorStop(0.72, '#5d6975')
  g.addColorStop(1, '#343b43')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.SRGBColorSpace
  const pmrem = new THREE.PMREMGenerator(renderer)
  const rt = pmrem.fromEquirectangular(tex)
  tex.dispose()
  pmrem.dispose()
  return rt.texture
}

function loadTexture(
  loader: THREE.TextureLoader,
  url: string,
  colorSpace: THREE.ColorSpace,
  maxAniso: number,
): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (tex) => {
        tex.flipY = false
        tex.colorSpace = colorSpace
        tex.magFilter = THREE.LinearFilter
        tex.minFilter = THREE.LinearMipmapLinearFilter
        tex.anisotropy = maxAniso
        resolve(tex)
      },
      undefined,
      reject,
    )
  })
}

export async function createHero(refs: HeroRefs): Promise<HeroHandle> {
  const { root, canvasHost, buttonEl, bgGroupEl, fgGroupEl, bgInnerEl, fgInnerEl } = refs

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    stencil: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_HIGH))
  const scene = new THREE.Scene()

  let width = canvasHost.clientWidth || window.innerWidth
  let height = canvasHost.clientHeight || window.innerHeight
  renderer.setSize(width, height)
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.1
  canvasHost.appendChild(renderer.domElement)

  let windowHalfX = window.innerWidth / 2
  let windowHalfY = window.innerHeight / 2

  // camera rig: tripod -> holder -> camera
  const cameraTripod = new THREE.Object3D()
  cameraTripod.name = 'camera_Tripod'
  const cameraHolder = new THREE.Object3D()
  const camera = new THREE.PerspectiveCamera(30, width / height, 1, 700)
  cameraHolder.add(camera)
  cameraTripod.add(cameraHolder)
  scene.add(cameraTripod)

  const cameraTarget = new THREE.Object3D()
  cameraTarget.position.set(0, 0, 0)
  scene.add(cameraTarget)

  function ratioCheck() {
    const aspect = width / height
    if (aspect > 1.6) cameraTripod.position.z = 20
    else if (aspect > 1.34) cameraTripod.position.z = 21
    else if (aspect > 1.2) cameraTripod.position.z = 22
    else cameraTripod.position.z = 23
  }
  ratioCheck()

  // lights (exact setupLights values)
  const lightsGroup = new THREE.Object3D()
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7)
  dirLight.position.set(-1, 1, 1).multiplyScalar(40)
  lightsGroup.add(dirLight)
  scene.add(lightsGroup)
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x003380, 1.5)
  scene.add(hemiLight)

  const envTex = gradientEnvTexture(renderer)
  scene.environment = envTex

  // object hierarchy: objsPush -> moveGroup -> planeRoot -> model
  const objsPush = new THREE.Object3D()
  scene.add(objsPush)
  const moveGroup = new THREE.Object3D()
  objsPush.add(moveGroup)
  const planeRoot = new THREE.Object3D()
  moveGroup.add(planeRoot)

  // line
  const lineSource = new THREE.Object3D()
  lineSource.position.set(0, 0, 0)
  const lineTarget = new THREE.Object3D()
  lineTarget.position.set(0, 0, 0)
  objsPush.add(lineTarget)
  const lineGeo = new THREE.BufferGeometry()
  const linePos = new Float32Array(6)
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3))
  const lineMat = new THREE.LineBasicMaterial({
    color: '#010e30',
    opacity: 0,
    transparent: true,
    depthTest: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  })
  const animatedLine = new THREE.Line(lineGeo, lineMat)
  animatedLine.frustumCulled = false
  animatedLine.visible = false
  scene.add(animatedLine)

  // textures + model
  const texLoader = new THREE.TextureLoader()
  const maxAniso = renderer.capabilities.getMaxAnisotropy()
  const [gltf, colorMap, orm, lightMap] = await Promise.all([
    loadGLTF('/models/hifly/a330_900.gltf'),
    loadTexture(
      texLoader,
      '/models/hifly/colormap_a330_900.jpg',
      THREE.SRGBColorSpace,
      maxAniso,
    ),
    // original passes orm through correctImage() which forces sRGB — keep that look
    loadTexture(texLoader, '/models/hifly/orm_a330_200.jpg', THREE.SRGBColorSpace, maxAniso),
    loadTexture(texLoader, '/models/hifly/lightmapwhite.jpg', THREE.NoColorSpace, maxAniso),
  ])

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: colorMap,
    roughness: 1.05,
    roughnessMap: orm,
    metalness: 0.7,
    metalnessMap: orm,
    aoMapIntensity: 1,
    aoMap: orm,
    lightMap,
    lightMapIntensity: 1,
    envMapIntensity: 2.2,
    flatShading: false,
    side: THREE.DoubleSide,
  })

  const model = gltf.scene
  const geometries: THREE.BufferGeometry[] = []
  const disposeLater: Array<{ dispose(): void }> = [colorMap, orm, lightMap, material, lineGeo, lineMat]
  model.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      child.material = material
      geometries.push(child.geometry)
      const uv = child.geometry.attributes.uv
      if (uv && !child.geometry.attributes.uv1) {
        child.geometry.setAttribute('uv1', uv)
      }
    }
  })
  disposeLater.push(...geometries)
  model.rotation.set(0, 0, 0)
  model.position.set(0, 0, 0)
  model.scale.set(1, 1, 1)
  planeRoot.add(model)

  // initial DOM cloud-group state (mirrors TweenMax.set at init, non-Safari branch)
  const initY = -height / 7
  const initCloudTransform = gsapTransform(0, initY, 1, -10, 0, 1.4)
  for (const g of [bgGroupEl, fgGroupEl]) {
    g.style.transform = initCloudTransform
  }
  bgInnerEl.style.zIndex = '1'
  fgInnerEl.style.zIndex = '1'

  // mouse-look state
  let homeRotateOnMouse = false
  let introStarted = false
  let stoppedOffPage = false
  const introTimeouts: number[] = []
  let rotateObjY = 0
  let rotateObjZ = 0
  let lineNewPosX = scaleBetween(0, 1.7, 1.6, windowHalfX, -windowHalfX)
  let lineNewPosY = scaleBetween(0, 0.6, 0.8, windowHalfX, -windowHalfX)
  let lineNewPosZ = scaleBetween(0, 1.8, -4, windowHalfX, -windowHalfX)

  function onPointerMove(event: PointerEvent) {
    const absMouseX = event.clientX - windowHalfX
    const absMouseY = event.clientY - windowHalfY
    rotateObjY = scaleBetween(absMouseX, radians(-20), radians(60), windowHalfX, -windowHalfX)
    rotateObjZ = scaleBetween(absMouseY, radians(-12), radians(5), -windowHalfY, windowHalfY)
    lineNewPosX = scaleBetween(absMouseX, 1.7, 1.6, windowHalfX, -windowHalfX)
    lineNewPosY = scaleBetween(absMouseX, 0.6, 0.8, windowHalfX, -windowHalfX)
    lineNewPosZ = scaleBetween(absMouseX, 1.8, -4, windowHalfX, -windowHalfX)
  }
  function onPointerOut(event: PointerEvent) {
    if (!event.relatedTarget) stoppedOffPage = true
  }
  function onPointerOver(event: PointerEvent) {
    if (!event.relatedTarget) stoppedOffPage = false
  }
  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerout', onPointerOut)
  document.addEventListener('pointerover', onPointerOver)

  // idle float on the model (tlIdle equivalent)
  const idleRotAmp = radians(3)
  const idleYAmp = 0.075
  const idleZAmp = 0.1
  const idleT1 = 10300
  const idleT2 = 11000
  const idleT3 = 17000
  let idleStart = 0

  // button follow state
  let btnActive = false
  let btnX = 0
  let btnY = 0
  let btnInit = false

  // loop
  let running = true
  let rafId = 0
  let lastTime = 0
  const clockStart = performance.now()

  function frame(now: number) {
    if (!running) return
    rafId = requestAnimationFrame(frame)
    const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0.016
    lastTime = now
    const t = now - clockStart

    if (homeRotateOnMouse && !stoppedOffPage) {
      const k = 1 - Math.exp(-dt * 6.5)
      planeRoot.rotation.y += (rotateObjY - planeRoot.rotation.y) * k
      planeRoot.rotation.z += (-rotateObjZ - planeRoot.rotation.z) * k
      lineSource.position.x += (lineNewPosX - lineSource.position.x) * k
      lineSource.position.y += (lineNewPosY - lineSource.position.y) * k
      lineSource.position.z += (lineNewPosZ - lineSource.position.z) * k
    }

    if (idleStart) {
      const it = t - idleStart
      model.rotation.z = Math.cos((it / idleT1) * Math.PI * 2) * idleRotAmp
      model.position.y = Math.cos((it / idleT2) * Math.PI * 2) * idleYAmp
      model.position.z = Math.cos((it / idleT3) * Math.PI * 2) * idleZAmp
    }

    // line vertices (identity objsPush -> local == world)
    linePos[0] = lineSource.position.x
    linePos[1] = lineSource.position.y
    linePos[2] = lineSource.position.z
    linePos[3] = lineTarget.position.x
    linePos[4] = lineTarget.position.y
    linePos[5] = lineTarget.position.z
    lineGeo.attributes.position.needsUpdate = true

    if (btnActive) {
      const v = lineTarget.position.clone().project(camera)
      const tx = Math.round(v.x * windowHalfX + windowHalfX) - 10
      const ty = Math.round(-v.y * windowHalfY + windowHalfY) - 10
      if (!btnInit) {
        btnX = tx
        btnY = ty
        btnInit = true
      }
      const kb = 1 - Math.exp(-dt * 14)
      btnX += (tx - btnX) * kb
      btnY += (ty - btnY) * kb
      buttonEl.style.transform = `translate3d(${btnX}px, ${btnY}px, 0)`
    }

    camera.lookAt(cameraTarget.position)
    renderer.render(scene, camera)
  }

  function onResize() {
    width = canvasHost.clientWidth || window.innerWidth
    height = canvasHost.clientHeight || window.innerHeight
    windowHalfX = window.innerWidth / 2
    windowHalfY = window.innerHeight / 2
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    ratioCheck()
  }
  window.addEventListener('resize', onResize)

  // kick the loop with one warmed-up frame
  rafId = requestAnimationFrame(frame)
  camera.lookAt(cameraTarget.position)
  renderer.render(scene, camera)

  function startIntro() {
    if (introStarted) return
    introStarted = true

    root.classList.add('webgl-ready')

    // initial airplane pose (case "intro")
    planeRoot.rotation.set(radians(-7), 0, radians(8))
    const startY = -24 - Math.random() * 2
    moveGroup.position.set(-5, startY, -10)
    moveGroup.rotation.set(0, radians(50), 0)
    animatedLine.visible = true
    btnActive = true
    homeRotateOnMouse = true
    idleStart = performance.now() - clockStart

    // camera holder -> (1.5, 0, -12.5), 4.5s power2InOut
    tween(4500, (p) => {
      cameraHolder.position.set(1.5 * p, 0, -12.5 * p)
    }, { ease: power2InOut })

    // airplane rise + yaw
    tween(4500, (p) => {
      moveGroup.position.set(
        -5 + p * 5.3,
        startY + p * (0.25 - startY),
        -10 + p * 10,
      )
    }, { ease: power3Out })
    tween(4500, (p) => {
      moveGroup.rotation.y = radians(50 + p * 10)
    }, { ease: power2Out })

    // cloud groups rise + rotate into place
    const finalY = height / 5
    tween(4500, (p) => {
      const str = gsapTransform(0, initY + p * (finalY - initY), 1, -10 + p * 10, -20 * p, 1.4 - 0.4 * p)
      bgGroupEl.style.transform = str
      fgGroupEl.style.transform = str
    }, { ease: power2InOut })

    // fg wrappers z-index bump (setTimeout 1000 in original)
    introTimeouts.push(
      window.setTimeout(() => {
        bgInnerEl.style.zIndex = '99'
        fgInnerEl.style.zIndex = '99'
      }, 1000),
    )

    // line target + line fade + button reveal
    introTimeouts.push(
      window.setTimeout(() => {
        lineTarget.position.set(1.5, -0.2, 0)
      }, 2000),
    )
    tween(9000, (p) => {
      lineMat.opacity = 0.5 * p
    }, { delay: 2500, ease: power4Out })
    tween(675, (p) => {
      buttonEl.style.opacity = String(p)
    }, { delay: 3000, ease: power2Out })
  }

  function setDpr(limit: number) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, limit))
    renderer.setSize(width, height)
  }

  function pause() {
    running = false
    cancelAnimationFrame(rafId)
  }

  function resume() {
    if (running) return
    running = true
    lastTime = 0
    rafId = requestAnimationFrame(frame)
  }

  function destroy() {
    running = false
    cancelAnimationFrame(rafId)
    cancelAllTweens()
    for (const id of introTimeouts) window.clearTimeout(id)
    window.removeEventListener('resize', onResize)
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerout', onPointerOut)
    document.removeEventListener('pointerover', onPointerOver)
    for (const d of disposeLater) d.dispose()
    envTex.dispose()
    renderer.dispose()
    if (renderer.domElement.parentNode === canvasHost) {
      canvasHost.removeChild(renderer.domElement)
    }
  }

  return { startIntro, setDpr, pause, resume, destroy }
}
