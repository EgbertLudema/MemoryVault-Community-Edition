import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  buildExportMediaPath,
  buildVaultOwnerExportFilename,
  createRecipientPdf,
  createZip,
} from '@/lib/exportArchive'
import { hashDeliveryToken, verifyDeliveryPassword } from '@/lib/legacyDelivery'
import { getRecipientDeliveryData } from '@/lib/recipientDelivery'
import { getOwnedMediaBlobFromHeaders } from '@/lib/mediaAccess'
import { decryptBufferServer, isServerEncrypted } from '@/lib/serverEncryption'

function getRequestOrigin(req: Request) {
  const url = new URL(req.url)
  return url.origin
}

function toNumberId(value: unknown) {
  const raw = String(
    typeof value === 'object' && value && 'id' in value ? (value as { id?: unknown }).id : value,
  ).trim()

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

export async function POST(req: Request, props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params
  const body = (await req.json().catch(() => ({}))) as { password?: string }
  const password = String(body.password ?? '').trim()

  if (!password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'legacy-deliveries',
      overrideAccess: true,
      depth: 3,
      limit: 1,
      where: {
        and: [{ tokenHash: { equals: hashDeliveryToken(token) } }, { status: { equals: 'active' } }],
      },
    })

    const delivery = result.docs?.[0] as any

    if (!delivery || !verifyDeliveryPassword(password, delivery.accessPasswordHash)) {
      return NextResponse.json({ error: 'Invalid delivery credentials' }, { status: 401 })
    }

    const deliveryData = await getRecipientDeliveryData({
      payload,
      delivery,
      origin: getRequestOrigin(req),
    })
    const memories = Array.isArray(delivery.memories) ? delivery.memories : []
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

        const exportPath = buildExportMediaPath(
          String(file.media.filename ?? '').trim(),
          `memory-${memory.id}-${item.type}-${index + 1}`,
          usedMediaNames,
          String(
            (file.media as any)?.encryptionMetadata?.originalType ??
              (file.media as any)?.mimeType ??
              '',
          ),
        )
        const memoryKey = String(memory.id)
        const displayName = exportPath.split('/').pop() || `memory-${memory.id}-${item.type}-${index + 1}`

        if (!memoryMediaNames[memoryKey]) {
          memoryMediaNames[memoryKey] = []
        }

        memoryMediaNames[memoryKey].push(displayName)
        mediaEntries.push({
          name: exportPath,
          data: file.buffer,
        })
      }
    }

    const pdf = await createRecipientPdf(deliveryData, memoryMediaNames)
    const archive = createZip([{ name: 'memories.pdf', data: pdf }, ...mediaEntries])
    const filename = buildVaultOwnerExportFilename(deliveryData.ownerDisplayName)

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
