import type { GroupOption } from '@/components/ui/MemoryFilters'

export type LovedOneLite = {
  fullName?: string | null
  nickname?: string | null
}

export type Photo = {
  id: string
  url: string
  createdAt?: string
}

export type AlbumContentItem =
  | {
      id: string
      kind: 'note'
      note?: string
      encryptedNote?: any
    }
  | {
      id: string
      kind: 'media'
      mediaType?: 'image' | 'video'
      url: string
      fullUrl?: string
      isEncrypted?: boolean
      encryptionMetadata?: any
      posterEncryptionMetadata?: any
    }

export type Album = {
  id: string
  title: string
  createdAt: string
  keyCiphertext?: string | null
  keyEncryptionMetadata?: any
  contentKey?: string
  photos: Photo[]
  notes?: string[]
  contentItems?: AlbumContentItem[]
  lovedOnes?: LovedOneLite[] | null
  groupIds?: Array<string | number> | null
  memoryType?: string | null
  hasNote?: boolean
  hasImage?: boolean
  hasVideo?: boolean
}

export type GridCell = {
  id: string
  col: number
  row: number
  albumIndex: number
}

export type NoteTheme = {
  paper: string
  paperStrong: string
  border: string
  line: string
  label: string
  text: string
  textSoft: string
  shadow: string
  fold: string
}

export type AlbumPreviewItem =
  | {
      id: string
      kind: 'note'
      note?: string
      encryptedNote?: any
    }
  | {
      id: string
      kind: 'media'
      mediaType?: 'image' | 'video'
      url: string
      fullUrl?: string
      isEncrypted?: boolean
      encryptionMetadata?: any
      posterEncryptionMetadata?: any
    }

export type MemoryGroupOption = GroupOption
