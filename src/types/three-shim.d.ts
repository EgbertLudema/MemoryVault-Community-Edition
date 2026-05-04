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
  }

  export class Material {
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
    scale: Vector3
    uuid: string
    userData: Record<string, any>
  }

  export class LineSegments extends Mesh {}
  export class Sprite extends Mesh {
    constructor(material?: Material)
  }

  export class Scene {
    add(...objects: unknown[]): void
    remove(...objects: unknown[]): void
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

  export class WebGLRenderer {
    constructor(parameters?: Record<string, unknown>)
    domElement: HTMLCanvasElement
    setPixelRatio(value: number): void
    setSize(width: number, height: number, updateStyle?: boolean): void
    setClearColor(color: unknown, alpha?: number): void
    render(scene: Scene, camera: OrthographicCamera): void
    dispose(): void
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
  export const MathUtils: {
    clamp(value: number, min: number, max: number): number
    lerp(a: number, b: number, t: number): number
  }
}
