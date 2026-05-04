// app/api/memories/route.ts
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { buildMediaImageUrl, buildMediaPosterUrl, buildMediaVideoStreamUrl } from '@/lib/mediaBlob'
import { getMemoryContentLimitMessage, isWithinMemoryContentItemLimit } from '@/lib/memoryLimits'
import { decryptTextServer, encryptTextServer, isServerEncrypted } from '@/lib/serverEncryption'

type SortOption = 'newest' | 'oldest'

type IncomingContent =
  | { type: 'note'; note?: string; noteCiphertext?: string; noteEncryptionMetadata?: any }
  | { type: 'image' | 'video'; media?: string | number }

type MemoryContentRow =
  | { type: 'note'; note?: string; noteCiphertext?: string; noteEncryptionMetadata?: any }
  | { type: 'image' | 'video'; media: number }
type OrderedContentItem =
  | { id: string; kind: 'note'; note?: string; encryptedNote?: any }
  | {
      id: string
      kind: 'media'
      mediaType: 'image' | 'video'
      url: string
      fullUrl?: string
      isEncrypted?: boolean
      encryptionMetadata?: any
      posterEncryptionMetadata?: any
    }

function toPayloadNumberId(value: unknown): number {
  const raw = String(value ?? '').trim()
  if (!raw) {
    return NaN
  }

  if (!/^\d+$/.test(raw)) {
    return NaN
  }

  return Number(raw)
}

function toStringSafe(value: unknown): string {
  return String(value ?? '')
}

function computeMemoryTypeFromContent(
  content: any[],
): 'note' | 'image' | 'video' | 'mixed' | 'unknown' {
  if (!Array.isArray(content) || content.length === 0) {
    return 'unknown'
  }

  let hasNote = false
  let hasImage = false
  let hasVideo = false

  for (const c of content) {
    if (!c) {
      continue
    }
    if (c.type === 'note') {
      hasNote = true
    }
    if (c.type === 'image') {
      hasImage = true
    }
    if (c.type === 'video') {
      hasVideo = true
    }
  }

  const count = (hasNote ? 1 : 0) + (hasImage ? 1 : 0) + (hasVideo ? 1 : 0)
  if (count > 1) {
    return 'mixed'
  }
  if (hasVideo) {
    return 'video'
  }
  if (hasImage) {
    return 'image'
  }
  if (hasNote) {
    return 'note'
  }

  return 'unknown'
}

export async function GET(req: Request) {
  try {
    const payload = await getPayload({ config })
    const user = await getAppUserFromHeaders(req.headers)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const sort = (url.searchParams.get('sort') as SortOption) || 'newest'

    const result = await payload.find({
      collection: 'memories',
      where: {
        owner: { equals: user.id },
      },
      depth: 2,
      limit: 200,
      sort: sort === 'newest' ? '-createdAt' : 'createdAt',
    })

    const groupMap = new Map<
      string,
      {
        id: number
        name: string
        isDefault?: boolean
        defaultKey?: string | null
        colorKey?: string | null
        iconKey?: string | null
      }
    >()
    const albums = (result.docs || []).map((memory: any) => {
      const content = Array.isArray(memory.content) ? memory.content : []

      let hasNote = false
      let hasImage = false
      let hasVideo = false

      for (const c of content) {
        if (!c) continue
        if (c.type === 'note') hasNote = true
        if (c.type === 'image') hasImage = true
        if (c.type === 'video') hasVideo = true
      }

      const notes = content
        .filter((c: any) => c && c.type === 'note')
        .map((c: any) => {
          const note = toStringSafe(c.note ?? '').trim()
          if (note) return note
          if (isServerEncrypted(c.noteEncryptionMetadata)) {
            return decryptTextServer(c.noteCiphertext, c.noteEncryptionMetadata).trim()
          }
          return ''
        })
        .filter(Boolean)

      const contentItems: OrderedContentItem[] = []
      const photos: Array<{ id: string; url: string; createdAt?: string }> = []

      for (let index = 0; index < content.length; index += 1) {
        const item = content[index]

        if (!item) {
          continue
        }

        if (item.type === 'note') {
          const note = toStringSafe(item.note ?? '').trim()
          const noteCiphertext = toStringSafe(item.noteCiphertext ?? '').trim()

          const decryptedNote =
            note ||
            (isServerEncrypted(item.noteEncryptionMetadata)
              ? decryptTextServer(noteCiphertext, item.noteEncryptionMetadata).trim()
              : '')

          if (decryptedNote) {
            contentItems.push({
              id: `${toStringSafe(memory.id)}-note-${index}`,
              kind: 'note',
              note: decryptedNote,
            })
          } else if (noteCiphertext) {
            contentItems.push({
              id: `${toStringSafe(memory.id)}-note-${index}`,
              kind: 'note',
              encryptedNote: {
                ...item.noteEncryptionMetadata,
                ciphertext: noteCiphertext,
              },
            })
          }

          continue
        }

        if (item.type === 'image' || item.type === 'video') {
          const media = item.media

          if (typeof media === 'object' && media) {
            const id = toStringSafe(media.id)
            const fullUrl = toStringSafe(media.url ?? '')
            const thumbnailUrl = toStringSafe(media.thumbnailURL ?? '')
            const posterUrl = toStringSafe(media.posterUrl ?? '')
            const imageUrl = id ? buildMediaImageUrl(id) : fullUrl
            const videoPosterUrl = id ? buildMediaPosterUrl(id) : posterUrl || thumbnailUrl || fullUrl
            const previewUrl = item.type === 'video' ? videoPosterUrl : imageUrl

            if (previewUrl) {
              const normalizedId = id || `${toStringSafe(memory.id)}-media-${index}`

              contentItems.push({
                id: normalizedId,
                kind: 'media',
                mediaType: item.type,
                url: previewUrl,
                fullUrl:
                  item.type === 'video' && id ? buildMediaVideoStreamUrl(id) : imageUrl || fullUrl,
                isEncrypted: Boolean(media.isEncrypted),
                encryptionMetadata: media.encryptionMetadata,
                posterEncryptionMetadata: media.posterEncryptionMetadata,
              })

              if (item.type === 'image') {
                photos.push({
                  id: normalizedId,
                  url: previewUrl,
                  createdAt: media.createdAt ? toStringSafe(media.createdAt) : undefined,
                })
              }
            }
          }
        }
      }

      const groupsRaw = Array.isArray(memory.groups) ? memory.groups : []
      const groupIds: number[] = []

      for (const g of groupsRaw) {
        if (typeof g === 'object' && g) {
          const idNum = toPayloadNumberId(g.id)
          const name = toStringSafe(g.name ?? '').trim()
          const isDefault = Boolean(g.isDefault)
          const defaultKey = g.defaultKey != null ? toStringSafe(g.defaultKey) : null
          const colorKey = g.colorKey != null ? toStringSafe(g.colorKey) : null
          const iconKey = g.iconKey != null ? toStringSafe(g.iconKey) : null

          if (Number.isFinite(idNum)) {
            groupIds.push(idNum)

            if (name) {
              groupMap.set(String(idNum), {
                id: idNum,
                name,
                isDefault,
                defaultKey,
                colorKey,
                iconKey,
              })
            } else if (!groupMap.has(String(idNum))) {
              groupMap.set(String(idNum), {
                id: idNum,
                name: 'Unnamed group',
                isDefault,
                defaultKey,
                colorKey,
                iconKey,
              })
            }
          }

          continue
        }

        const idNum = toPayloadNumberId(g)
        if (Number.isFinite(idNum)) {
          groupIds.push(idNum)
          if (!groupMap.has(String(idNum))) {
            groupMap.set(String(idNum), {
              id: idNum,
              name: 'Unnamed group',
              isDefault: false,
              defaultKey: null,
              colorKey: null,
              iconKey: null,
            })
          }
        }
      }

      const lovedOnesRaw = Array.isArray(memory.lovedOnes) ? memory.lovedOnes : []
      const lovedOnes = lovedOnesRaw
        .map((lo: any) => {
          if (typeof lo === 'object' && lo) {
            return {
              fullName: toStringSafe(lo.fullName ?? ''),
              nickname: lo.nickname != null ? toStringSafe(lo.nickname) : '',
            }
          }
          return null
        })
        .filter(Boolean)

      return {
        id: toStringSafe(memory.id),
        title: toStringSafe(memory.title ?? ''),
        createdAt: toStringSafe(memory.createdAt),
        keyCiphertext: toStringSafe(memory.keyCiphertext ?? ''),
        keyEncryptionMetadata: memory.keyEncryptionMetadata,
        photos,
        notes,
        contentItems,
        groupIds,
        lovedOnes,
        memoryType: computeMemoryTypeFromContent(content),

        hasNote,
        hasImage,
        hasVideo,
      }
    })

    const groups = Array.from(groupMap.values()).sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ albums, groups }, { status: 200 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load memories' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const payload = await getPayload({ config })
    const user = await getAppUserFromHeaders(req.headers)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as {
      title?: string
      memoryDate?: string
      groups?: Array<string | number>
    lovedOnes?: Array<string | number>
    content?: IncomingContent[]
      keyCiphertext?: string
      keyEncryptionMetadata?: any
    }

    const title = String(body.title ?? '').trim()
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const memoryDateRaw = String(body.memoryDate ?? '').trim()
    const memoryDate = new Date(memoryDateRaw)
    if (!memoryDateRaw || Number.isNaN(memoryDate.getTime())) {
      return NextResponse.json({ error: 'Valid memoryDate is required' }, { status: 400 })
    }

    const groupIds = Array.isArray(body.groups) ? body.groups : []
    const lovedOneIds = Array.isArray(body.lovedOnes) ? body.lovedOnes : []

    if (groupIds.length === 0 && lovedOneIds.length === 0) {
      return NextResponse.json({ error: 'Link at least one group or loved one' }, { status: 400 })
    }

    const content = Array.isArray(body.content) ? body.content : []
    if (content.length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    if (!isWithinMemoryContentItemLimit(content.length)) {
      return NextResponse.json({ error: getMemoryContentLimitMessage() }, { status: 400 })
    }

    const groupNumberIds = groupIds
      .map((id) => toPayloadNumberId(id))
      .filter((id) => Number.isFinite(id))

    const lovedOneNumberIds = lovedOneIds
      .map((id) => toPayloadNumberId(id))
      .filter((id) => Number.isFinite(id))

    if (groupNumberIds.length === 0 && lovedOneNumberIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid groups or lovedOnes. Expected numeric ids.' },
        { status: 400 },
      )
    }

    const contentRows: MemoryContentRow[] = []
    let noteCount = 0

    for (const item of content) {
      if (item.type === 'note') {
        const note = String(item.note ?? '').trim()
        const noteCiphertext = String(item.noteCiphertext ?? '').trim()
        if (note || noteCiphertext) {
          noteCount += 1
          if (noteCount > 1) {
            return NextResponse.json(
              { error: 'Each memory can only have one note' },
              { status: 400 },
            )
          }
          if (note) {
            const encrypted = encryptTextServer(note)
            contentRows.push({
              type: 'note',
              noteCiphertext: encrypted.ciphertext,
              noteEncryptionMetadata: encrypted.metadata,
            })
          } else {
            contentRows.push({
              type: 'note',
              noteCiphertext,
              noteEncryptionMetadata: item.noteEncryptionMetadata,
            })
          }
        }
        continue
      }

      if (item.type === 'image' || item.type === 'video') {
        const mediaId = toPayloadNumberId(item.media)
        if (Number.isFinite(mediaId)) {
          contentRows.push({ type: item.type, media: mediaId })
        }
        continue
      }
    }

    if (contentRows.length === 0) {
      return NextResponse.json({ error: 'No valid content items found' }, { status: 400 })
    }

    if (!isWithinMemoryContentItemLimit(contentRows.length)) {
      return NextResponse.json({ error: getMemoryContentLimitMessage() }, { status: 400 })
    }

    const created = await payload.create({
      collection: 'memories',
      data: {
        title,
        memoryDate: memoryDate.toISOString(),
        owner: user.id,
        groups: groupNumberIds,
        lovedOnes: lovedOneNumberIds,

        content: contentRows,
      },
    })

    return NextResponse.json(
      {
        memory: {
          id: String(created.id),
          title: String(created.title ?? ''),
          createdAt: String(created.createdAt),
        },
      },
      { status: 201 },
    )
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to save memory' }, { status: 500 })
  }
}
