import * as THREE from 'three'
import { makeRectFrame, makeTextSprite } from './utils/three-helpers'
import { YEAR_GAP, YEAR_SIZE, YEARS_PER_ROW } from './constants'
import type { YearBucket } from './types'

export type YearBlock = {
  year: number
  mesh: THREE.Mesh
  frame: THREE.LineSegments
  label?: THREE.Sprite
  worldPos: THREE.Vector2
  count: number
  baseColor: number
}

export class YearsView {
  private scene: THREE.Scene
  private camera: THREE.OrthographicCamera

  yearBlocks: YearBlock[] = []
  centered = false

  constructor(scene: THREE.Scene, camera: THREE.OrthographicCamera) {
    this.scene = scene
    this.camera = camera
  }

  layout(buckets: YearBucket[]) {
    this.clear()

    for (const b of buckets) {
      this.yearBlocks.push(this.makeYearBlock(b.year, b.count))
    }

    let col = 0
    let row = 0
    for (let i = 0; i < this.yearBlocks.length; i++) {
      const yb = this.yearBlocks[i]
      const x = col * (YEAR_SIZE + YEAR_GAP)
      const y = -row * (YEAR_SIZE + YEAR_GAP)
      yb.worldPos.set(x, y)
      this.positionYearBlock(yb, x, y)
      col++
      if (col >= YEARS_PER_ROW) {
        col = 0
        row++
      }
    }

    if (!this.centered) {
      const rows = Math.ceil(this.yearBlocks.length / YEARS_PER_ROW)
      const totalW = YEARS_PER_ROW * (YEAR_SIZE + YEAR_GAP) - YEAR_GAP
      const totalH = rows * (YEAR_SIZE + YEAR_GAP) - YEAR_GAP
      const offX = -totalW / 2 + YEAR_SIZE / 2
      const offY = totalH / 2 - YEAR_SIZE / 2
      for (const yb of this.yearBlocks) {
        yb.worldPos.x += offX
        yb.worldPos.y += offY
        this.positionYearBlock(yb, yb.worldPos.x, yb.worldPos.y)
      }
      this.centered = true
      this.camera.zoom = 0.9
      this.camera.position.set(0, 0, 100)
      this.camera.updateProjectionMatrix()
    }
  }

  hoverAt(raycaster: THREE.Raycaster, ndc: THREE.Vector2) {
    if (this.yearBlocks.length === 0) return
    raycaster.setFromCamera(ndc, this.camera)
    const objs = this.yearBlocks.map((yb) => yb.mesh)
    const hits = raycaster.intersectObjects(objs, false)
    const id = hits[0]?.object?.uuid
    for (const yb of this.yearBlocks) {
      const mat = yb.mesh.material as THREE.MeshBasicMaterial
      mat.color.setHex(id && id === yb.mesh.uuid ? 0x29292b : yb.baseColor)
    }
  }

  pickYear(raycaster: THREE.Raycaster, ndc: THREE.Vector2): number | null {
    if (this.yearBlocks.length === 0) return null
    raycaster.setFromCamera(ndc, this.camera)
    const objs = this.yearBlocks.map((yb) => yb.mesh)
    const hits = raycaster.intersectObjects(objs, false)
    if (hits.length === 0) return null
    const mesh = hits[0].object as THREE.Mesh
    return (mesh.userData?.year as number) ?? null
  }

  clear() {
    for (const yb of this.yearBlocks) this.disposeYearBlock(yb)
    this.yearBlocks = []
  }

  private makeYearBlock(year: number, count: number): YearBlock {
    const baseColor = 0x1d1d1f
    const geom = new THREE.PlaneGeometry(YEAR_SIZE, YEAR_SIZE)
    const mat = new THREE.MeshBasicMaterial({ color: baseColor })
    const mesh = new THREE.Mesh(geom, mat)
    mesh.userData = { year }

    const frame = makeRectFrame(YEAR_SIZE, YEAR_SIZE, 0x3a3a3a)
    frame.position.z = -0.05

    const label = makeTextSprite(`${year}\n(${count})`, 48, '#efefef', '#00000000')
    label.position.set(0, 0, 0.05)

    this.scene.add(mesh)
    this.scene.add(frame)
    this.scene.add(label)

    return { year, mesh, frame, label, worldPos: new THREE.Vector2(0, 0), count, baseColor }
  }

  private positionYearBlock(yb: YearBlock, x: number, y: number) {
    yb.mesh.position.set(x, y, 0)
    yb.frame.position.set(x, y, -0.05)
    yb.label?.position.set(x, y, 0.05)
  }

  private disposeYearBlock(yb: YearBlock) {
    yb.mesh.geometry.dispose()
    ;(yb.mesh.material as THREE.Material).dispose()
    this.scene.remove(yb.mesh)
    yb.frame.geometry.dispose()
    ;(yb.frame.material as THREE.Material).dispose()
    this.scene.remove(yb.frame)
    if (yb.label) {
      yb.label.material.map?.dispose?.()
      ;(yb.label.material as THREE.Material).dispose()
      this.scene.remove(yb.label)
    }
  }
}
