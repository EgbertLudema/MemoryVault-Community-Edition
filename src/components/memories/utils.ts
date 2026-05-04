import type { GroupOption, MemoryTypeFilter } from '@/components/ui/MemoryFilters'
import { getColorValueFromKey } from '@/lib/groupMeta'
import { getEffectiveGroupUiMeta } from '@/lib/groupUi'
import type { Album, AlbumPreviewItem, NoteTheme } from './types'

export const DEFAULT_GROUPS: GroupOption[] = [
  {
    id: 'default-lover',
    defaultKey: 'lover',
    name: 'Lover',
    colorKey: 'red',
    colorValue: getColorValueFromKey('red') ?? '#f87171',
    isDefault: true,
  },
  {
    id: 'default-children',
    defaultKey: 'children',
    name: 'Children',
    colorKey: 'blue',
    colorValue: getColorValueFromKey('blue') ?? '#60a5fa',
    isDefault: true,
  },
  {
    id: 'default-grandchildren',
    defaultKey: 'grandchildren',
    name: 'Grandchildren',
    colorKey: 'purple',
    colorValue: getColorValueFromKey('purple') ?? '#c084fc',
    isDefault: true,
  },
  {
    id: 'default-family',
    defaultKey: 'family',
    name: 'Family',
    colorKey: 'green',
    colorValue: getColorValueFromKey('green') ?? '#34d399',
    isDefault: true,
  },
  {
    id: 'default-friends',
    defaultKey: 'friends',
    name: 'Friends',
    colorKey: 'yellow',
    colorValue: getColorValueFromKey('yellow') ?? '#fbbf24',
    isDefault: true,
  },
  {
    id: 'default-general',
    defaultKey: 'general',
    name: 'General',
    colorKey: 'gray',
    colorValue: getColorValueFromKey('gray') ?? '#6b7280',
    isDefault: true,
  },
]

export function normalizeText(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
}

export function normalizeId(id: string | number) {
  return String(id).trim()
}

export function normalizeName(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function hexToRgb(color: string) {
  const rgbMatch = color.match(
    /rgba?\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)(?:\s*,\s*[0-9.]+\s*)?\)/i,
  )

  if (rgbMatch) {
    return {
      r: clamp(Number(rgbMatch[1]), 0, 255),
      g: clamp(Number(rgbMatch[2]), 0, 255),
      b: clamp(Number(rgbMatch[3]), 0, 255),
    }
  }

  const raw = color.replace('#', '').trim()
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((char) => char + char)
          .join('')
      : raw

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return { r: 248, g: 231, b: 168 }
  }

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

export function toRgba(color: string, opacity: number) {
  const { r, g, b } = hexToRgb(color)
  return `rgba(${r}, ${g}, ${b}, ${clamp(opacity, 0, 1)})`
}

export function mixColors(colorA: string, colorB: string, amount: number) {
  const from = hexToRgb(colorA)
  const to = hexToRgb(colorB)
  const weight = clamp(amount, 0, 1)

  const r = Math.round(from.r + (to.r - from.r) * weight)
  const g = Math.round(from.g + (to.g - from.g) * weight)
  const b = Math.round(from.b + (to.b - from.b) * weight)

  return `rgb(${r}, ${g}, ${b})`
}

export function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

export function getResolvedGroupColor(group: GroupOption) {
  const meta = getEffectiveGroupUiMeta({
    id: String(group.id),
    label: group.name,
    name: group.name,
    isDefault: group.isDefault,
    defaultKey: (group as GroupOption & { defaultKey?: string | null }).defaultKey ?? null,
    iconKey: group.iconKey,
    colorKey: group.colorKey,
  })

  return group.colorValue ?? meta.color.value
}

export function getNoteSeedColor(group: GroupOption) {
  const groupName = normalizeName(group.name)
  const colorKey = normalizeName(group.colorKey)

  if (groupName === 'general' || colorKey === 'gray') {
    return '#f8f4ea'
  }

  return getResolvedGroupColor(group)
}

export function buildNoteTheme(color: string): NoteTheme {
  return {
    paper: mixColors(color, '#ffffff', 0.74),
    paperStrong: mixColors(color, '#ffffff', 0.46),
    border: toRgba(mixColors(color, '#475569', 0.12), 0.42),
    line: toRgba(mixColors(color, '#ffffff', 0.2), 0.32),
    label: mixColors(color, '#7c2d12', 0.22),
    text: mixColors(color, '#0f172a', 0.84),
    textSoft: toRgba(mixColors(color, '#1e293b', 0.78), 0.9),
    shadow: toRgba(mixColors(color, '#0f172a', 0.52), 0.24),
    fold: mixColors(color, '#ffffff', 0.2),
  }
}

export function getCandidateGroupsForAlbum(
  album: Album,
  groups: GroupOption[],
  selectedGroupIds: Array<string | number>,
) {
  const albumGroupIds = new Set(
    (Array.isArray(album.groupIds) ? album.groupIds : []).map(normalizeId),
  )
  const albumGroups = groups.filter((group) => albumGroupIds.has(normalizeId(group.id)))

  if (selectedGroupIds.length === 0) {
    return albumGroups
  }

  const selectedIds = new Set(selectedGroupIds.map(normalizeId))
  const selectedAlbumGroups = albumGroups.filter((group) => selectedIds.has(normalizeId(group.id)))

  return selectedAlbumGroups.length > 0 ? selectedAlbumGroups : albumGroups
}

export function getNoteThemeForAlbum(
  album: Album,
  groups: GroupOption[],
  selectedGroupIds: Array<string | number>,
) {
  const matchedGroups = getCandidateGroupsForAlbum(album, groups, selectedGroupIds)
  const candidateGroups = matchedGroups.length > 0 ? matchedGroups : DEFAULT_GROUPS
  const candidateColors = candidateGroups.map((group) => getNoteSeedColor(group))

  const index =
    hashString(
      `${album.id}:${selectedGroupIds.map(normalizeId).join('|')}:${candidateColors.join('|')}`,
    ) % candidateColors.length

  return buildNoteTheme(candidateColors[index] ?? '#fbbf24')
}

export function getAlbumPreviewItems(album: Album): AlbumPreviewItem[] {
  if (Array.isArray(album.contentItems) && album.contentItems.length > 0) {
    return album.contentItems
      .map<AlbumPreviewItem | null>((item) => {
        if (item.kind === 'note') {
          const note = String(item.note ?? '').trim()

          if (!note) {
            return null
          }

          return {
            id: item.id,
            kind: 'note' as const,
            note,
          }
        }

        const url = String(item.url ?? '').trim()

        if (!url) {
          return null
        }

        return {
          id: item.id,
          kind: 'media' as const,
          mediaType: item.mediaType,
          url,
          fullUrl: item.fullUrl,
          isEncrypted: item.isEncrypted,
          encryptionMetadata: item.encryptionMetadata,
          posterEncryptionMetadata: item.posterEncryptionMetadata,
        }
      })
      .filter((item): item is AlbumPreviewItem => Boolean(item))
  }

  const notes = Array.isArray(album.notes) ? album.notes.filter((note) => note.trim()) : []
  const noteItems = notes.map((note, index) => ({
    id: `${album.id}-note-${index}`,
    kind: 'note' as const,
    note,
  }))
  const mediaItems = album.photos.map((photo) => ({
    id: photo.id,
    kind: 'media' as const,
    mediaType: 'image' as const,
    url: photo.url,
    fullUrl: photo.url,
  }))

  return [...noteItems, ...mediaItems]
}

export function mergeGroupsWithDefaults(groups: GroupOption[]) {
  const mappedDefaults = new Map(DEFAULT_GROUPS.map((group) => [normalizeName(group.name), group]))

  const mergedDefaults = DEFAULT_GROUPS.map((defaultGroup) => {
    const existing = groups.find(
      (group) =>
        String((group as GroupOption & { defaultKey?: string | null }).defaultKey ?? '').trim().toLowerCase() ===
          String((defaultGroup as GroupOption & { defaultKey?: string | null }).defaultKey ?? '').trim().toLowerCase() ||
        normalizeName(group.name) === normalizeName(defaultGroup.name),
    )

    if (!existing) {
      return defaultGroup
    }

    return {
      ...defaultGroup,
      ...existing,
      defaultKey:
        (existing as GroupOption & { defaultKey?: string | null }).defaultKey ??
        (defaultGroup as GroupOption & { defaultKey?: string | null }).defaultKey,
      colorKey: existing.colorKey ?? defaultGroup.colorKey,
      colorValue: existing.colorValue ?? defaultGroup.colorValue,
    }
  })

  const customGroups = groups.filter((group) => {
    const groupDefaultKey = String((group as GroupOption & { defaultKey?: string | null }).defaultKey ?? '')
      .trim()
      .toLowerCase()

    if (groupDefaultKey) {
      return !DEFAULT_GROUPS.some(
        (defaultGroup) =>
          String((defaultGroup as GroupOption & { defaultKey?: string | null }).defaultKey ?? '')
            .trim()
            .toLowerCase() === groupDefaultKey,
      )
    }

    return !mappedDefaults.has(normalizeName(group.name))
  })

  return [...mergedDefaults, ...customGroups]
}

export function getVisibleGroups(albums: Album[], groups: GroupOption[]) {
  const usedGroupIds = new Set<string>()

  for (const album of albums) {
    const groupIds = Array.isArray(album.groupIds) ? album.groupIds : []
    for (const id of groupIds) {
      usedGroupIds.add(normalizeId(id))
    }
  }

  return groups.filter((group) => usedGroupIds.has(normalizeId(group.id)))
}

export function albumMatchesType(album: Album, type: MemoryTypeFilter) {
  if (type === 'all') {
    return true
  }

  if (type === 'notes') {
    return Boolean(album.hasNote)
  }
  if (type === 'images') {
    return Boolean(album.hasImage)
  }
  if (type === 'videos') {
    return Boolean(album.hasVideo)
  }

  return true
}

export function albumMatchesSearch(album: Album, search: string) {
  const q = normalizeText(search)
  if (!q) {
    return true
  }

  const title = normalizeText(album.title)
  if (title.includes(q)) {
    return true
  }

  const lovedOnes = Array.isArray(album.lovedOnes) ? album.lovedOnes : []
  for (const lo of lovedOnes) {
    const name = normalizeText(lo?.fullName)
    const nick = normalizeText(lo?.nickname)
    if (name.includes(q) || nick.includes(q)) {
      return true
    }
  }

  return false
}

export function albumMatchesGroups(album: Album, selectedGroupIds: Array<string | number>) {
  if (selectedGroupIds.length === 0) {
    return true
  }

  const albumGroupIds = Array.isArray(album.groupIds) ? album.groupIds : []
  if (albumGroupIds.length === 0) {
    return false
  }

  const albumSet = new Set(albumGroupIds.map((x) => normalizeId(x)))
  for (const id of selectedGroupIds) {
    if (albumSet.has(normalizeId(id))) {
      return true
    }
  }

  return false
}
