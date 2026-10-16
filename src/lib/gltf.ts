import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

let dracoLoader: DRACOLoader | null = null
let gltfLoader: GLTFLoader | null = null

function getGLTFLoader(): GLTFLoader {
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader()
    dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco/')
    gltfLoader.setDRACOLoader(dracoLoader)
  }
  return gltfLoader
}

const gltfCache = new Map<string, Promise<GLTF>>()

export function loadGLTF(url: string): Promise<GLTF> {
  let p = gltfCache.get(url)
  if (!p) {
    p = new Promise((resolve, reject) => {
      getGLTFLoader().load(url, resolve, undefined, reject)
    })
    gltfCache.set(url, p)
  }
  return p
}

// Bounding box of visible meshes only (skips hidden collision/placeholder geometry)
export function visibleBox(root: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3()
  const tmp = new THREE.Box3()
  root.updateMatrixWorld(true)
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.visible && child.geometry) {
      tmp.setFromBufferAttribute(
        child.geometry.attributes.position as THREE.BufferAttribute,
      )
      tmp.applyMatrix4(child.matrixWorld)
      box.union(tmp)
    }
  })
  return box
}
