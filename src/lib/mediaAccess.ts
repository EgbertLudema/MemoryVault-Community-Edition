import path from 'path'
import crypto from 'crypto'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { getBlobReadWriteToken, getPublicBlobBaseUrl } from '@/lib/mediaBlob'

type Media = Record<string, any>

function toStringSafe(value: unknown) {
  return String(value ?? '').trim()
}

function toNumberId(value: unknown) {
  const raw = String(value ?? '').trim()

  if (!/^\d+$/.test(raw)) {
    return NaN
  }

  return Number(raw)
}

function buildBlobUrlFromFilename(filename: string) {
  const token = getBlobReadWriteToken()
  const baseUrl = getPublicBlobBaseUrl()

  if (!token || !baseUrl) {
    throw new Error('Vercel Blob storage is not configured')
  }

  return {
    fileUrl: `${baseUrl}/${path.posix.join('', encodeURIComponent(filename))}`,
    token,
  }
}

export type MediaAccessError =
  | { error: 'unauthorized' }
  | { error: 'forbidden' }
  | { error: 'not_found' }

export type OwnedMediaResult = { media: Media }
export type OwnedMediaBlobResult = { media: Media; fileUrl: string; token: string }

const DELIVERY_MEDIA_COOKIE = 'mv_delivery_media'

function getSigningSecret() {
  return process.env.PAYLOAD_SECRET || process.env.APP_ENCRYPTION_KEY || 'memory-vault-dev-secret'
}

function parseCookieHeader(headers: Headers) {
  const cookies = new Map<string, string>()
  const raw = headers.get('cookie') || ''

  for (const part of raw.split(';')) {
    const [name, ...valueParts] = part.trim().split('=')
    if (!name || valueParts.length === 0) continue
    cookies.set(name, decodeURIComponent(valueParts.join('=')))
  }

  return cookies
}

export function createDeliveryMediaCookie(mediaIds: number[]) {
  const payload = {
    mediaIds: Array.from(new Set(mediaIds.filter((id) => Number.isFinite(id)))),
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', getSigningSecret()).update(body).digest('base64url')
  return `${body}.${signature}`
}

function deliveryCookieAllowsMedia(headers: Headers, mediaId: number) {
  const token = parseCookieHeader(headers).get(DELIVERY_MEDIA_COOKIE)
  if (!token) return false

  const [body, signature] = token.split('.')
  if (!body || !signature) return false

  const expected = crypto.createHmac('sha256', getSigningSecret()).update(body).digest('base64url')
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return false
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      mediaIds?: unknown
      exp?: unknown
    }
    return (
      typeof payload.exp === 'number' &&
      payload.exp > Date.now() &&
      Array.isArray(payload.mediaIds) &&
      payload.mediaIds.includes(mediaId)
    )
  } catch {
    return false
  }
}

async function userOwnsMediaViaMemory(mediaId: number, userId: number) {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'memories',
    overrideAccess: true,
    depth: 0,
    limit: 1,
    where: {
      and: [
        {
          owner: {
            equals: userId,
          },
        },
        {
          'content.media': {
            equals: mediaId,
          },
        },
      ],
    },
  })

  return (result.docs?.length ?? 0) > 0
}

export async function getOwnedMediaFromHeaders(
  headers: Headers,
  mediaId: number,
): Promise<MediaAccessError | OwnedMediaResult> {
  const user = await getAppUserFromHeaders(headers)

  const payload = await getPayload({ config })
  const media = await payload.findByID({
    collection: 'media',
    id: mediaId,
    depth: 0,
    overrideAccess: true,
  })

  if (!media) {
    return { error: 'not_found' }
  }

  if (!user) {
    return deliveryCookieAllowsMedia(headers, mediaId) ? { media } : { error: 'unauthorized' }
  }

  const ownerUserId =
    typeof media?.ownerUser === 'object' && media.ownerUser
      ? toNumberId(media.ownerUser.id)
      : toNumberId(media?.ownerUser)

  if (!Number.isFinite(ownerUserId) || ownerUserId !== Number(user.id)) {
    const isReferencedByOwnedMemory = await userOwnsMediaViaMemory(mediaId, Number(user.id))

    if (!isReferencedByOwnedMemory) {
      return { error: 'forbidden' }
    }
  }

  return { media }
}

export { DELIVERY_MEDIA_COOKIE }

export async function getOwnedMediaBlobFromHeaders(
  headers: Headers,
  mediaId: number,
): Promise<MediaAccessError | OwnedMediaBlobResult> {
  const mediaResult = await getOwnedMediaFromHeaders(headers, mediaId)

  if ('error' in mediaResult) {
    return mediaResult
  }

  const filename = toStringSafe(mediaResult.media?.filename)

  if (!filename) {
    return { error: 'not_found' }
  }

  const { fileUrl, token } = buildBlobUrlFromFilename(filename)

  return {
    media: mediaResult.media,
    fileUrl,
    token,
  }
}

export async function getOwnedPosterBlobFromHeaders(
  headers: Headers,
  mediaId: number,
): Promise<MediaAccessError | OwnedMediaBlobResult> {
  const mediaResult = await getOwnedMediaFromHeaders(headers, mediaId)

  if ('error' in mediaResult) {
    return mediaResult
  }

  const posterUrl = toStringSafe(mediaResult.media?.posterUrl)

  if (!posterUrl) {
    return { error: 'not_found' }
  }

  const filename = decodeURIComponent(posterUrl.split('/').pop() ?? '')

  if (!filename) {
    return { error: 'not_found' }
  }

  const { fileUrl, token } = buildBlobUrlFromFilename(filename)

  return {
    media: mediaResult.media,
    fileUrl,
    token,
  }
}

export function applyForwardedHeaders(target: Headers, source: Headers) {
  const headerNames = [
    'accept-ranges',
    'cache-control',
    'content-length',
    'content-range',
    'content-type',
    'etag',
    'last-modified',
  ]

  for (const name of headerNames) {
    const value = source.get(name)

    if (value) {
      target.set(name, value)
    }
  }
}
