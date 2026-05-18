import { NextResponse } from 'next/server'
import { applyForwardedHeaders, getOwnedMediaBlobFromHeaders } from '@/lib/mediaAccess'
import { decryptBufferServer, isServerEncrypted } from '@/lib/serverEncryption'

function toNumberId(value: unknown) {
  const raw = String(value ?? '').trim()

  if (!/^\d+$/.test(raw)) {
    return NaN
  }

  return Number(raw)
}

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const mediaId = toNumberId(id)

    if (!Number.isFinite(mediaId)) {
      return notFound()
    }

    const fileData = await getOwnedMediaBlobFromHeaders(req.headers, mediaId)

    if ('error' in fileData && fileData.error === 'unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if ('error' in fileData && fileData.error === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if ('error' in fileData) {
      return notFound()
    }

    const upstream = await fetch(fileData.fileUrl, { cache: 'no-store' })

    if (!upstream.ok) {
      return notFound()
    }

    const headers = new Headers()
    const encryptionMetadata = (fileData.media as any)?.encryptionMetadata

    headers.set('cache-control', 'private, max-age=300')
    headers.set(
      'content-type',
      isServerEncrypted(encryptionMetadata)
        ? encryptionMetadata.originalType || 'application/octet-stream'
        : upstream.headers.get('content-type') || fileData.media?.mimeType || 'application/octet-stream',
    )
    headers.set('etag', `"media-image-${mediaId}-${fileData.media?.updatedAt ?? ''}"`)

    if (isServerEncrypted(encryptionMetadata)) {
      const decrypted = decryptBufferServer(Buffer.from(await upstream.arrayBuffer()), encryptionMetadata)
      headers.set('content-length', String(decrypted.length))
      return new Response(decrypted, { headers })
    }

    applyForwardedHeaders(headers, upstream.headers)

    return new Response(upstream.body, {
      headers,
      status: upstream.status,
      statusText: upstream.statusText,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load image' }, { status: 500 })
  }
}
