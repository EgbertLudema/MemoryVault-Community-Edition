import * as THREE from 'three'
import { BASE_VIEW } from '../constants'

export function makeRectFrame(w: number, h: number, color = 0x333333) {
  const shape = new THREE.Shape()
  shape.moveTo(-w / 2, -h / 2)
  shape.lineTo(w / 2, -h / 2)
  shape.lineTo(w / 2, h / 2)
  shape.lineTo(-w / 2, h / 2)
  shape.lineTo(-w / 2, -h / 2)
  const pts = shape.getPoints(5)
  const geom = new THREE.BufferGeometry().setFromPoints(pts)
  const mat = new THREE.LineBasicMaterial({ color, linewidth: 1 })
  return new THREE.LineSegments(geom, mat)
}

export function roundedRectShape(w: number, h: number, r: number) {
  const hw = w / 2,
    hh = h / 2
  const shape = new THREE.Shape()
  shape.moveTo(-hw + r, -hh)
  shape.lineTo(hw - r, -hh)
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r)
  shape.lineTo(hw, hh - r)
  shape.quadraticCurveTo(hw, hh, hw - r, hh)
  shape.lineTo(-hw + r, hh)
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r)
  shape.lineTo(-hw, -hh + r)
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh)
  return shape
}

export function makeRoundedPlane(w: number, h: number, radius: number, color: number) {
  const geom = new THREE.ShapeGeometry(roundedRectShape(w, h, radius), 8)
  const mat = new THREE.MeshBasicMaterial({ color })
  return new THREE.Mesh(geom, mat)
}

export function makeRoundedFrame(w: number, h: number, radius: number, color = 0x333333) {
  const shape = roundedRectShape(w, h, radius)
  const pts = shape.getPoints(64)
  const geom = new THREE.BufferGeometry().setFromPoints(pts)
  const mat = new THREE.LineBasicMaterial({ color, linewidth: 1 })
  return new THREE.LineSegments(geom, mat)
}

export function makeTextSprite(
  text: string,
  fontSize: number,
  color = '#ffffff',
  bg = '#00000000',
) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = `${fontSize}px Arial, Helvetica, sans-serif`
  const padding = 20
  const lines = text.split('\n')
  const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width))
  const lineHeight = fontSize * 1.25
  const width = Math.ceil(maxW + padding * 2)
  const height = Math.ceil(lines.length * lineHeight + padding * 2)
  canvas.width = width
  canvas.height = height
  ctx.font = `${fontSize}px Arial, Helvetica, sans-serif`
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = color
  ctx.textBaseline = 'top'
  let y = padding
  for (const l of lines) {
    ctx.fillText(l, padding, y)
    y += lineHeight
  }
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
  const sprite = new THREE.Sprite(mat)
  const scaleW = Math.min(40 * 0.9, (40 / 256) * canvas.width) // scale tuned for YEAR_SIZE
  const scaleH = (scaleW / canvas.width) * canvas.height
  sprite.scale.set(scaleW, scaleH, 1)
  return sprite
}

export function createRenderer(mount: HTMLDivElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setClearColor(0x0b0b0c, 1)
  renderer.domElement.tabIndex = 0
  mount.appendChild(renderer.domElement)
  return renderer
}

export function createOrthoCamera() {
  const aspect = window.innerWidth / window.innerHeight
  const size = BASE_VIEW
  const camera = new THREE.OrthographicCamera(
    (-size * aspect) / 2,
    (size * aspect) / 2,
    size / 2,
    -size / 2,
    0.1,
    5000,
  )
  camera.position.set(0, 0, 100)
  camera.zoom = 1
  camera.updateProjectionMatrix()
  return camera
}

export function getViewBounds(camera: THREE.OrthographicCamera) {
  const w = (camera.right - camera.left) / camera.zoom
  const h = (camera.top - camera.bottom) / camera.zoom
  const cx = camera.position.x
  const cy = camera.position.y
  return {
    left: cx - w / 2,
    right: cx + w / 2,
    top: cy + h / 2,
    bottom: cy - h / 2,
    width: w,
    height: h,
  }
}

export function onResizeOrtho(camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer) {
  const aspect = window.innerWidth / window.innerHeight
  const size = BASE_VIEW
  camera.left = (-size * aspect) / 2
  camera.right = (size * aspect) / 2
  camera.top = size / 2
  camera.bottom = -size / 2
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}
