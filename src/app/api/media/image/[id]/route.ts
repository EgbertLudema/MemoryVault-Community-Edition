import { BlobNotFoundError, head } from '@vercel/blob'
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

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const mediaId = toNumberId(id)

    if (!Number.isFinite(mediaId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const fileData = await getOwnedMediaBlobFromHeaders(req.headers, mediaId)

    if ('error' in fileData && fileData.error === 'unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if ('error' in fileData && fileData.error === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if ('error' in fileData && fileData.error === 'not_found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const metadata = await head(fileData.fileUrl, { token: fileData.token })
    const upstream = await fetch(fileData.fileUrl, { cache: 'no-store' })
    const headers = new Headers()
    const encryptionMetadata = (fileData.media as any)?.encryptionMetadata

    headers.set('cache-control', 'private, max-age=300')
    headers.set('content-disposition', metadata.contentDisposition)
    headers.set(
      'content-type',
      isServerEncrypted(encryptionMetadata)
        ? encryptionMetadata.originalType || 'application/octet-stream'
        : metadata.contentType,
    )
    headers.set('etag', `"media-image-${mediaId}-${metadata.uploadedAt.toISOString()}"`)

    if (isServerEncrypted(encryptionMetadata)) {
      const decrypted = decryptBufferServer(Buffer.from(await upstream.arrayBuffer()), encryptionMetadata)
      headers.set('content-length', String(decrypted.length))
      return new Response(decrypted, {
        headers,
        status: upstream.ok ? 200 : upstream.status,
        statusText: upstream.statusText,
      })
    }

    applyForwardedHeaders(headers, upstream.headers)

    return new Response(upstream.body, {
      headers,
      status: upstream.status,
      statusText: upstream.statusText,
    })
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    console.error(error)
    return NextResponse.json({ error: 'Failed to load image' }, { status: 500 })
  }
}
