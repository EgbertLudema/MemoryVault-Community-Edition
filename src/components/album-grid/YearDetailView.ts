import * as THREE from 'three'
import {
  LOD_TEXTURE_MIN_ZOOM,
  LOAD_MARGIN_SCREENS,
  MONTH_GAP,
  MONTH_PAD,
  MONTH_ROWS,
  MONTHS_PER_ROW,
  TILE_GAP,
  TILE_SIZE,
  YEAR_PAD,
} from './constants'
import { makeRectFrame, makeTextSprite, getViewBounds } from './utils/three-helpers'
import type { AlbumItem, GridTile, MonthGroup, YearDetail } from './types'

export class YearDetailView {
  private scene: THREE.Scene
  private camera: THREE.OrthographicCamera
  private loader = new THREE.TextureLoader()

  tiles = new Map<string, GridTile>()
  detail: YearDetail | null = null

  constructor(scene: THREE.Scene, camera: THREE.OrthographicCamera) {
    this.scene = scene
    this.camera = camera
    this.loader.setCrossOrigin('anonymous')
  }

  ensure(year: number) {
    if (this.detail && this.detail.year === year) return this.detail
    this.reset()
    this.detail = { year, months: new Map<number, MonthGroup>(), blockWidth: 0, blockHeight: 0 }
    return this.detail
  }

  addAlbums(items: AlbumItem[], year: number) {
    const yd = this.ensure(year)
    for (const a of items) {
      if (this.tiles.has(a.id)) continue
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE),
        new THREE.MeshBasicMaterial({ color: 0x222222 }),
      )
      mesh.userData = { albumId: a.id }
      this.scene.add(mesh)
      const tile: GridTile = { mesh, album: a }
      this.tiles.set(a.id, tile)
      const mg = this.ensureMonth(yd, a.month)
      mg.tiles.push(tile)
    }
  }

  layout(year: number) {
    const yd = this.ensure(year)

    // Measure months
    for (const mg of yd.months.values()) {
      const n = mg.tiles.length || 0
      if (n === 0) {
        mg.cellWidth = 2 * TILE_SIZE + 2 * MONTH_PAD
        mg.cellHeight = 2 * TILE_SIZE + 2 * MONTH_PAD
        continue
      }
      const cols = Math.max(1, Math.ceil(Math.sqrt(n)))
      const rows = Math.max(1, Math.ceil(n / cols))
      const gridW = cols * TILE_SIZE + (cols - 1) * TILE_GAP
      const gridH = rows * TILE_SIZE + (rows - 1) * TILE_GAP
      mg.cellWidth = gridW + 2 * MONTH_PAD
      mg.cellHeight = gridH + 2 * MONTH_PAD
    }

    // Fit into 4x3 calendar
    const maxColW: number[] = new Array(MONTHS_PER_ROW).fill(0)
    const maxRowH: number[] = new Array(MONTH_ROWS).fill(0)
    for (let m = 1; m <= 12; m++) {
      const r = Math.floor((m - 1) / MONTHS_PER_ROW)
      const c = (m - 1) % MONTHS_PER_ROW
      const mg = yd.months.get(m)
      const w = mg?.cellWidth ?? 2 * TILE_SIZE + 2 * MONTH_PAD
      const h = mg?.cellHeight ?? 2 * TILE_SIZE + 2 * MONTH_PAD
      maxColW[c] = Math.max(maxColW[c], w)
      maxRowH[r] = Math.max(maxRowH[r], h)
    }

    const colX: number[] = []
    const rowY: number[] = []
    let accX = 0
    for (let c = 0; c < MONTHS_PER_ROW; c++) {
      colX[c] = accX
      accX += maxColW[c] + MONTH_GAP
    }
    let accY = 0
    for (let r = 0; r < MONTH_ROWS; r++) {
      rowY[r] = accY
      accY += maxRowH[r] + MONTH_GAP
    }

    const innerW = accX - MONTH_GAP
    const innerH = accY - MONTH_GAP
    yd.blockWidth = innerW + 2 * YEAR_PAD
    yd.blockHeight = innerH + 2 * YEAR_PAD

    if (yd.frame) this.scene.remove(yd.frame)
    yd.frame = makeRectFrame(yd.blockWidth, yd.blockHeight, 0x3a3a3a)
    if (yd.label) this.scene.remove(yd.label)
    yd.label = makeTextSprite(`${year}`, 64, '#ffffff', '#00000000')

    const centerX = 0
    const centerY = 0
    yd.frame.position.set(centerX, centerY, -0.1)
    yd.label.position.set(centerX, centerY + yd.blockHeight / 2 + 5, 0.05)
    this.scene.add(yd.frame)
    this.scene.add(yd.label)

    for (let m = 1; m <= 12; m++) {
      const r = Math.floor((m - 1) / MONTHS_PER_ROW)
      const c = (m - 1) % MONTHS_PER_ROW
      const mg = this.ensureMonth(yd, m)
      const cx = colX[c] + (maxColW[c] - mg.cellWidth) / 2 + YEAR_PAD
      const cy = rowY[r] + (maxRowH[r] - mg.cellHeight) / 2 + YEAR_PAD
      mg.offsetInYear.set(cx, -cy)

      if (mg.frame) this.scene.remove(mg.frame)
      mg.frame = makeRectFrame(mg.cellWidth, mg.cellHeight, 0x2a2a2a)
      const fx = centerX - yd.blockWidth / 2 + mg.offsetInYear.x + mg.cellWidth / 2
      const fy = centerY + yd.blockHeight / 2 + mg.offsetInYear.y - mg.cellHeight / 2
      mg.frame.position.set(fx, fy, -0.05)
      this.scene.add(mg.frame)

      // Place tiles
      const n = mg.tiles.length
      if (n > 0) {
        const cols = Math.max(1, Math.ceil(Math.sqrt(n)))
        const innerLeft = centerX - yd.blockWidth / 2 + mg.offsetInYear.x + MONTH_PAD
        const innerTop = centerY + yd.blockHeight / 2 + mg.offsetInYear.y - MONTH_PAD
        for (let i = 0; i < n; i++) {
          const t = mg.tiles[i]
          const col = i % cols
          const row = Math.floor(i / cols)
          const x = innerLeft + col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2
          const y = innerTop - row * (TILE_SIZE + TILE_GAP) - TILE_SIZE / 2
          t.mesh.position.set(x, y, 0)
        }
      }
    }

    this.camera.zoom = 1.4
    this.camera.position.set(0, 0, 100)
    this.camera.updateProjectionMatrix()
  }

  updateTextures() {
    if (!this.detail) return
    const vb = getViewBounds(this.camera)
    const marginX = vb.width * LOAD_MARGIN_SCREENS
    const marginY = vb.height * LOAD_MARGIN_SCREENS
    const left = vb.left - marginX
    const right = vb.right + marginX
    const top = vb.top + marginY
    const bottom = vb.bottom - marginY
    const canShow = this.camera.zoom >= LOD_TEXTURE_MIN_ZOOM

    for (const t of this.tiles.values()) {
      const { x, y } = t.mesh.position
      const inRange = x > left && x < right && y < top && y > bottom
      if (!canShow) {
        if (t.texture) {
          t.texture.dispose()
          t.texture = undefined
          t.mesh.material = new THREE.MeshBasicMaterial({ color: 0x1c1c1c })
        }
        continue
      }
      if (inRange && !t.texture && t.album.thumbUrl) {
        this.loader.load(
          t.album.thumbUrl,
          (tex: THREE.Texture) => {
            tex.minFilter = THREE.LinearFilter
            tex.generateMipmaps = false
            t.texture = tex
            t.mesh.material = new THREE.MeshBasicMaterial({ map: tex })
          },
          undefined,
          () => {},
        )
      } else if (!inRange && t.texture) {
        t.texture.dispose()
        t.texture = undefined
        t.mesh.material = new THREE.MeshBasicMaterial({ color: 0x222222 })
      }
    }
  }

  reset() {
    for (const t of this.tiles.values()) {
      if (t.texture) t.texture.dispose()
      t.mesh.geometry.dispose()
      ;(t.mesh.material as THREE.Material).dispose()
      this.scene.remove(t.mesh)
    }
    this.tiles.clear()
    if (this.detail?.frame) {
      this.detail.frame.geometry.dispose()
      ;(this.detail.frame.material as THREE.Material).dispose()
      this.scene.remove(this.detail.frame)
    }
    if (this.detail?.label) {
      this.detail.label.material.map?.dispose?.()
      ;(this.detail.label.material as THREE.Material).dispose()
      this.scene.remove(this.detail.label)
    }
    if (this.detail) {
      for (const mg of this.detail.months.values()) {
        if (mg.frame) {
          mg.frame.geometry.dispose()
          ;(mg.frame.material as THREE.Material).dispose()
          this.scene.remove(mg.frame)
        }
        if (mg.label) {
          mg.label.material.map?.dispose?.()
          ;(mg.label.material as THREE.Material).dispose()
          this.scene.remove(mg.label)
        }
      }
    }
    this.detail = null
  }

  private ensureMonth(yd: YearDetail, m: number) {
    let mg = yd.months.get(m)
    if (!mg) {
      mg = {
        month: m,
        tiles: [],
        cellWidth: 0,
        cellHeight: 0,
        offsetInYear: new THREE.Vector2(0, 0),
      }
      yd.months.set(m, mg)
    }
    return mg
  }
}
