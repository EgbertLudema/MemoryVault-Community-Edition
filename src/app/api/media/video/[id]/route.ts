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

    const encryptionMetadata = (fileData.media as any)?.encryptionMetadata
    const serverEncrypted = isServerEncrypted(encryptionMetadata)

    if (!serverEncrypted && !String(fileData.media?.mimeType ?? '').startsWith('video/')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const metadata = await head(fileData.fileUrl, { token: fileData.token })

    if (serverEncrypted) {
      const upstream = await fetch(fileData.fileUrl, { cache: 'no-store' })
      const decrypted = decryptBufferServer(Buffer.from(await upstream.arrayBuffer()), encryptionMetadata)
      const headers = new Headers()

      headers.set('accept-ranges', 'none')
      headers.set('cache-control', 'private, max-age=300')
      headers.set('content-disposition', metadata.contentDisposition)
      headers.set('content-length', String(decrypted.length))
      headers.set('content-type', encryptionMetadata.originalType || 'video/mp4')
      headers.set('etag', `"media-${mediaId}-${metadata.uploadedAt.toISOString()}"`)
      headers.set('last-modified', metadata.uploadedAt.toUTCString())

      return new Response(decrypted, {
        headers,
        status: upstream.ok ? 200 : upstream.status,
        statusText: upstream.statusText,
      })
    }

    const forwardedHeaders = new Headers()
    const requestedRange = req.headers.get('range')

    if (requestedRange) {
      forwardedHeaders.set('range', requestedRange)
    }

    const upstream = await fetch(fileData.fileUrl, {
      headers: forwardedHeaders,
      cache: 'no-store',
    })

    const headers = new Headers()

    headers.set('accept-ranges', 'bytes')
    headers.set('cache-control', 'public, max-age=31536000')
    headers.set('content-disposition', metadata.contentDisposition)
    headers.set('content-type', metadata.contentType)
    headers.set('etag', `"media-${mediaId}-${metadata.uploadedAt.toISOString()}"`)

    applyForwardedHeaders(headers, upstream.headers)

    if (!upstream.ok && upstream.status !== 206 && upstream.status !== 416) {
      return new Response(upstream.body, {
        headers,
        status: upstream.status,
        statusText: upstream.statusText,
      })
    }

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
    return NextResponse.json({ error: 'Failed to stream video' }, { status: 500 })
  }
}

export async function HEAD(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const mediaId = toNumberId(id)

    if (!Number.isFinite(mediaId)) {
      return new Response(null, { status: 404 })
    }

    const fileData = await getOwnedMediaBlobFromHeaders(_.headers, mediaId)

    if ('error' in fileData) {
      return new Response(null, { status: 404 })
    }

    const encryptionMetadata = (fileData.media as any)?.encryptionMetadata
    const serverEncrypted = isServerEncrypted(encryptionMetadata)

    if (!serverEncrypted && !String(fileData.media?.mimeType ?? '').startsWith('video/')) {
      return new Response(null, { status: 404 })
    }

    const metadata = await head(fileData.fileUrl, { token: fileData.token })

    const headers = new Headers()

    headers.set('accept-ranges', serverEncrypted ? 'none' : 'bytes')
    headers.set('cache-control', 'private, max-age=300')
    headers.set('content-disposition', metadata.contentDisposition)
    if (!serverEncrypted) {
      headers.set('content-length', String(metadata.size))
    }
    headers.set(
      'content-type',
      serverEncrypted ? encryptionMetadata.originalType || 'video/mp4' : metadata.contentType,
    )
    headers.set('etag', `"media-${mediaId}-${metadata.uploadedAt.toISOString()}"`)
    headers.set('last-modified', metadata.uploadedAt.toUTCString())

    return new Response(null, {
      headers,
      status: 200,
    })
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return new Response(null, { status: 404 })
    }

    console.error(error)
    return new Response(null, { status: 500 })
  }
}
