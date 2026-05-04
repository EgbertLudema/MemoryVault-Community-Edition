import type * as THREE from 'three'

export type AlbumItem = {
  id: string
  title: string
  year: number
  month: number
  day: number
  thumbUrl: string | null
}

export type AlbumsResponse = {
  page: number
  totalPages: number
  totalDocs: number
  items: AlbumItem[]
}

export type YearBucket = { year: number; count: number }
export type YearsResponse = { years: YearBucket[]; totalDocs: number }

export type Mode = 'years' | 'year-detail'

export type GridTile = {
  mesh: THREE.Mesh
  album: AlbumItem
  texture?: THREE.Texture
}

export type MonthGroup = {
  month: number
  tiles: GridTile[]
  cellWidth: number
  cellHeight: number
  offsetInYear: THREE.Vector2
  frame?: THREE.LineSegments
  label?: THREE.Sprite
}

export type YearDetail = {
  year: number
  months: Map<number, MonthGroup>
  blockWidth: number
  blockHeight: number
  frame?: THREE.LineSegments
  label?: THREE.Sprite
}
