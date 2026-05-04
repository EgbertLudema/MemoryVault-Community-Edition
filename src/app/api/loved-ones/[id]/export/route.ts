import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import {
  buildExportMediaPath,
  buildRecipientExportFilename,
  createRecipientPdf,
  createZip,
} from '@/lib/exportArchive'
import { resolveLegacyRecipients } from '@/lib/legacyDelivery'
import { buildLegacyDeliveryData } from '@/lib/legacyDeliveryContent'
import { getOwnedMediaBlobFromHeaders } from '@/lib/mediaAccess'
import { getProfileImageSrc } from '@/lib/profileImage'
import { decryptBufferServer, isServerEncrypted } from '@/lib/serverEncryption'

function getRequestOrigin(headerList: Headers) {
  const protocol = headerList.get('x-forwarded-proto') ?? 'http'
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host')

  if (!host) {
    return 'http://localhost:3000'
  }

  return `${protocol}://${host}`.replace(/\/$/, '')
}

function toNumberId(value: unknown) {
  const raw = String(value ?? '').trim()

  if (!/^\d+$/.test(raw)) {
    return NaN
  }

  return Number(raw)
}

async function loadMediaBuffer(headers: Headers, mediaId: number) {
  const fileData = await getOwnedMediaBlobFromHeaders(headers, mediaId)

  if ('error' in fileData) {
    return null
  }

  const upstream = await fetch(fileData.fileUrl, { cache: 'no-store' })

  if (!upstream.ok) {
    throw new Error(`Failed to fetch media ${mediaId}`)
  }

  const buffer = Buffer.from(await upstream.arrayBuffer())
  const encryptionMetadata = (fileData.media as any)?.encryptionMetadata

  return {
    buffer: isServerEncrypted(encryptionMetadata)
      ? decryptBufferServer(buffer, encryptionMetadata)
      : buffer,
    media: fileData.media,
  }
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAppUserFromHeaders(req.headers)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const lovedOneId = toNumberId(id)

  if (!Number.isFinite(lovedOneId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const payload = await getPayload({ config })
    const [lovedOneResult, memoryResult] = await Promise.all([
      payload.find({
        collection: 'loved-ones',
        overrideAccess: true,
        depth: 1,
        limit: 1,
        where: {
          and: [{ id: { equals: lovedOneId } }, { user: { equals: user.id } }],
        },
      }),
      payload.find({
        collection: 'memories',
        overrideAccess: true,
        depth: 2,
        limit: 500,
        where: {
          owner: { equals: user.id },
        },
      }),
    ])

    const lovedOne = lovedOneResult.docs?.[0] as any
    if (!lovedOne) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const recipient = resolveLegacyRecipients([lovedOne], (memoryResult.docs ?? []) as any[]).find(
      (item) => item.lovedOneId === lovedOneId,
    )

    const memories = recipient?.memoryIds.length
      ? (memoryResult.docs ?? []).filter((memory: any) =>
          recipient.memoryIds.includes(Number(memory.id)),
        )
      : []

    const delivery = buildLegacyDeliveryData({
      recipientName:
        recipient?.recipientName ?? String(lovedOne.nickname ?? lovedOne.fullName ?? 'you'),
      recipientNote: lovedOne.customNote,
      ownerProfileImageSrc: getProfileImageSrc(user),
      memories,
      origin: getRequestOrigin(req.headers),
    })

    const mediaEntries: Array<{ name: string; data: Buffer }> = []
    const memoryMediaNames: Record<string, string[]> = {}
    const usedMediaNames = new Set<string>()

    for (const memory of memories as any[]) {
      const content = Array.isArray(memory?.content) ? memory.content : []

      for (let index = 0; index < content.length; index += 1) {
        const item = content[index]
        if (item?.type !== 'image' && item?.type !== 'video') {
          continue
        }

        const media = typeof item.media === 'object' && item.media ? item.media : null
        const mediaId = toNumberId(media?.id ?? item.media)

        if (!Number.isFinite(mediaId)) {
          continue
        }

        const file = await loadMediaBuffer(req.headers, mediaId)

        if (!file) {
          continue
        }

        const memoryKey = String(memory.id)
        const displayName =
          String(file.media.filename ?? '').trim() ||
          `memory-${memory.id}-${item.type}-${index + 1}`

        if (!memoryMediaNames[memoryKey]) {
          memoryMediaNames[memoryKey] = []
        }

        memoryMediaNames[memoryKey].push(displayName)

        mediaEntries.push({
          name: buildExportMediaPath(
            String(file.media.filename ?? '').trim(),
            `memory-${memory.id}-${item.type}-${index + 1}`,
            usedMediaNames,
          ),
          data: file.buffer,
        })
      }
    }

    const pdf = await createRecipientPdf(delivery, memoryMediaNames)
    const entries = [{ name: 'memories.pdf', data: pdf }, ...mediaEntries]
    const filename = buildRecipientExportFilename(delivery.recipientName)
    const archive = createZip(entries)

    return new Response(archive, {
      status: 200,
      headers: {
        'content-type': 'application/zip',
        'content-length': String(archive.length),
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to export recipient archive' }, { status: 500 })
  }
}
