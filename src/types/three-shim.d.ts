/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'three' {
  export class Vector2 {
    constructor(x?: number, y?: number)
    x: number
    y: number
    set(x: number, y: number): this
  }

  export class Vector3 {
    constructor(x?: number, y?: number, z?: number)
    x: number
    y: number
    z: number
    set(x: number, y: number, z?: number): this
    setScalar(value: number): this
  }

  export class Material {
    needsUpdate: boolean
    opacity: number
    dispose(): void
  }

  export class Texture {
    minFilter: unknown
    generateMipmaps: boolean
    dispose(): void
  }

  export class CanvasTexture extends Texture {
    constructor(canvas: HTMLCanvasElement)
  }

  export class BufferGeometry {
    dispose(): void
    setFromPoints(points: unknown[]): this
  }

  export class PlaneGeometry extends BufferGeometry {
    constructor(width?: number, height?: number)
  }

  export class BoxGeometry extends BufferGeometry {
    constructor(width?: number, height?: number, depth?: number)
  }

  export class Shape {
    moveTo(x: number, y: number): void
    lineTo(x: number, y: number): void
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void
    getPoints(divisions?: number): unknown[]
  }

  export class ShapeGeometry extends BufferGeometry {
    constructor(shape: Shape, curveSegments?: number)
  }

  export class MeshBasicMaterial extends Material {
    constructor(parameters?: Record<string, unknown>)
    color: { set(value: unknown): void; setHex(value: number): void }
    map?: Texture | null
    transparent: boolean
  }

  export class MeshStandardMaterial extends Material {
    constructor(parameters?: Record<string, unknown>)
  }

  export class LineBasicMaterial extends Material {
    constructor(parameters?: Record<string, unknown>, ...args: unknown[])
  }

  export class SpriteMaterial extends Material {
    constructor(parameters?: Record<string, unknown>)
  }

  export class ShaderMaterial extends Material {
    constructor(parameters?: Record<string, unknown>)
    uniforms: Record<string, { value: any }>
  }

  export class Mesh {
    constructor(geometry?: BufferGeometry, material?: Material | Material[])
    geometry: BufferGeometry
    material: any
    position: Vector3
    rotation: Vector3
    scale: Vector3
    name: string
    uuid: string
    userData: Record<string, any>
    isMesh: boolean
    castShadow: boolean
    receiveShadow: boolean
    visible: boolean
    traverse(callback: (object: Mesh) => void): void
    add(...objects: unknown[]): void
  }

  export class LineSegments extends Mesh {}
  export class Line extends Mesh {}
  export class Sprite extends Mesh {
    constructor(material?: Material)
  }
  export class Group extends Mesh {}

  export class Box3 {
    setFromObject(object: Mesh): this
    getCenter(target: Vector3): Vector3
    getSize(target: Vector3): Vector3
  }

  export class Scene {
    add(...objects: unknown[]): void
    remove(...objects: unknown[]): void
    traverse(callback: (object: Mesh) => void): void
  }

  export class OrthographicCamera {
    constructor(left?: number, right?: number, top?: number, bottom?: number, near?: number, far?: number)
    position: Vector3
    zoom: number
    left: number
    right: number
    top: number
    bottom: number
    updateProjectionMatrix(): void
  }

  export class PerspectiveCamera {
    constructor(fov?: number, aspect?: number, near?: number, far?: number)
    aspect: number
    position: Vector3
    updateProjectionMatrix(): void
  }

  export class HemisphereLight extends Mesh {
    constructor(skyColor?: unknown, groundColor?: unknown, intensity?: number)
  }

  export class DirectionalLight extends Mesh {
    constructor(color?: unknown, intensity?: number)
  }

  export class PointLight extends Mesh {
    constructor(color?: unknown, intensity?: number, distance?: number)
  }

  export class WebGLRenderer {
    constructor(parameters?: Record<string, unknown>)
    domElement: HTMLCanvasElement
    outputColorSpace: unknown
    toneMapping: unknown
    toneMappingExposure: number
    setPixelRatio(value: number): void
    setSize(width: number, height: number, updateStyle?: boolean): void
    setClearColor(color: unknown, alpha?: number): void
    render(scene: Scene, camera: OrthographicCamera | PerspectiveCamera): void
    dispose(): void
  }

  export class Clock {
    getElapsedTime(): number
  }

  export class TextureLoader {
    setCrossOrigin(value: string): void
    load(
      url: string,
      onLoad?: (texture: Texture) => void,
      onProgress?: unknown,
      onError?: (event: unknown) => void,
    ): Texture
  }

  export class Raycaster {
    setFromCamera(coords: Vector2, camera: OrthographicCamera): void
    intersectObjects(objects: unknown[], recursive?: boolean): Array<{ object: any }>
  }

  export const LinearFilter: unknown
  export const SRGBColorSpace: unknown
  export const ACESFilmicToneMapping: unknown
  export const DoubleSide: unknown
  export const MathUtils: {
    clamp(value: number, min: number, max: number): number
    lerp(a: number, b: number, t: number): number
  }
}

declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
  import type { Mesh } from 'three'

  export type GLTF = {
    scene: Mesh
  }

  export class GLTFLoader {
    load(
      url: string,
      onLoad?: (gltf: GLTF) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: unknown) => void,
    ): void
  }
}
