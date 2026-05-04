import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { getMemoryContentLimitMessage, isWithinMemoryContentItemLimit } from '@/lib/memoryLimits'
import { decryptTextServer, encryptTextServer, isServerEncrypted } from '@/lib/serverEncryption'

type IncomingContent =
  | { type: 'note'; note?: string; noteCiphertext?: string; noteEncryptionMetadata?: any }
  | { type: 'image' | 'video'; media?: string | number }

type MemoryContentRow =
  | { type: 'note'; note?: string; noteCiphertext?: string; noteEncryptionMetadata?: any }
  | { type: 'image' | 'video'; media: number }

function toNumberId(value: unknown) {
  const raw = String(value ?? '').trim()

  if (!/^\d+$/.test(raw)) {
    return NaN
  }

  return Number(raw)
}

async function getOwnedMemory(
  payload: Awaited<ReturnType<typeof getPayload>>,
  memoryId: number,
  userId: number,
  depth = 2,
) {
  const result = await payload.find({
    collection: 'memories',
    overrideAccess: true,
    depth,
    limit: 1,
    where: {
      and: [{ id: { equals: memoryId } }, { owner: { equals: userId } }],
    },
  })

  return result.docs?.[0] ?? null
}

async function ensureOwnedRelations(
  payload: Awaited<ReturnType<typeof getPayload>>,
  collection: 'loved-one-groups' | 'loved-ones',
  ids: number[],
  userId: number,
) {
  if (ids.length === 0) {
    return true
  }

  const result = await payload.find({
    collection,
    overrideAccess: true,
    depth: 0,
    limit: ids.length,
    where: {
      and: [{ user: { equals: userId } }, { id: { in: ids } }],
    },
  })

  return (result.docs?.length ?? 0) === ids.length
}

function serializeMemoryForClient(memory: any) {
  const content = Array.isArray(memory?.content)
    ? memory.content.map((item: any) => {
        if (item?.type !== 'note') {
          return item
        }

        const note = String(item.note ?? '').trim()
        if (note) {
          return item
        }

        if (!isServerEncrypted(item.noteEncryptionMetadata)) {
          return item
        }

        return {
          ...item,
          note: decryptTextServer(item.noteCiphertext, item.noteEncryptionMetadata),
        }
      })
    : memory?.content

  return { ...memory, content }
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAppUserFromHeaders(req.headers)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const memoryId = toNumberId(id)

  if (!Number.isFinite(memoryId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const payload = await getPayload({ config })
    const url = new URL(req.url)
    const depthParam = Number(url.searchParams.get('depth') ?? '2')
    const depth = Number.isFinite(depthParam) ? depthParam : 2

    const memory = await getOwnedMemory(payload, memoryId, Number(user.id), depth)

    if (!memory) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(serializeMemoryForClient(memory), { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load memory' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAppUserFromHeaders(req.headers)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const memoryId = toNumberId(id)

  if (!Number.isFinite(memoryId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const payload = await getPayload({ config })
    const existing = await getOwnedMemory(payload, memoryId, Number(user.id), 0)

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
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
    const memoryDateRaw = String(body.memoryDate ?? '').trim()
    const memoryDate = new Date(memoryDateRaw)

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!memoryDateRaw || Number.isNaN(memoryDate.getTime())) {
      return NextResponse.json({ error: 'Valid memoryDate is required' }, { status: 400 })
    }

    const groupIds = Array.isArray(body.groups)
      ? body.groups.map((value) => toNumberId(value)).filter((value) => Number.isFinite(value))
      : []

    const lovedOneIds = Array.isArray(body.lovedOnes)
      ? body.lovedOnes.map((value) => toNumberId(value)).filter((value) => Number.isFinite(value))
      : []

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

    const contentRows: MemoryContentRow[] = []
    let noteCount = 0

    for (const item of content) {
      if (item.type === 'note') {
        const note = String(item.note ?? '').trim()
        const noteCiphertext = String(item.noteCiphertext ?? '').trim()

        if (note || noteCiphertext) {
          noteCount += 1

          if (noteCount > 1) {
            return NextResponse.json({ error: 'Each memory can only have one note' }, { status: 400 })
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
        const mediaId = toNumberId(item.media)

        if (Number.isFinite(mediaId)) {
          contentRows.push({ type: item.type, media: mediaId })
        }
      }
    }

    if (contentRows.length === 0) {
      return NextResponse.json({ error: 'No valid content items found' }, { status: 400 })
    }

    if (!isWithinMemoryContentItemLimit(contentRows.length)) {
      return NextResponse.json({ error: getMemoryContentLimitMessage() }, { status: 400 })
    }

    const ownsAllGroups = await ensureOwnedRelations(
      payload,
      'loved-one-groups',
      groupIds,
      Number(user.id),
    )

    if (!ownsAllGroups) {
      return NextResponse.json({ error: 'One or more groups are invalid' }, { status: 400 })
    }

    const ownsAllLovedOnes = await ensureOwnedRelations(
      payload,
      'loved-ones',
      lovedOneIds,
      Number(user.id),
    )

    if (!ownsAllLovedOnes) {
      return NextResponse.json({ error: 'One or more loved ones are invalid' }, { status: 400 })
    }

    const updated = await payload.update({
      collection: 'memories',
      id: memoryId,
      overrideAccess: true,
      depth: 2,
      data: {
        title,
        memoryDate: memoryDate.toISOString(),
        owner: Number(user.id),
        groups: groupIds,
        lovedOnes: lovedOneIds,
        content: contentRows,
      },
    })

    return NextResponse.json(serializeMemoryForClient(updated), { status: 200 })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to save memory'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAppUserFromHeaders(req.headers)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const memoryId = toNumberId(id)

  if (!Number.isFinite(memoryId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const payload = await getPayload({ config })
    const existing = await getOwnedMemory(payload, memoryId, Number(user.id), 0)

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await payload.delete({
      collection: 'memories',
      id: memoryId,
      overrideAccess: true,
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 400 })
  }
}
