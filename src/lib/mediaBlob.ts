export function getStorageDriver(): 'local' | 's3' | 'vercel-blob' {
  const explicit = process.env.STORAGE_DRIVER?.trim()
  if (explicit === 'local' || explicit === 's3' || explicit === 'vercel-blob') {
    return explicit
  }

  const s3Enabled = Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY &&
      process.env.S3_ENDPOINT,
  )

  if (s3Enabled) {
    return 's3'
  }

  return process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : 'local'
}

/**
 * Base URL for building a media file's public URL from just its filename.
 * Only meaningful for the 'local' and 's3' drivers - Vercel Blob sets a full
 * URL directly on the doc, so callers should prefer media.url there instead.
 */
export function getPublicMediaBaseUrl() {
  const driver = getStorageDriver()

  if (driver === 'local') {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL?.trim().replace(/\/+$/, '')
    return serverUrl ? `${serverUrl}/api/media/local-file` : null
  }

  return process.env.S3_PUBLIC_URL?.trim().replace(/\/+$/, '') || null
}

export function buildMediaVideoStreamUrl(id: string | number) {
  return `/api/media/video/${encodeURIComponent(String(id))}`
}

export function buildMediaImageUrl(id: string | number) {
  return `/api/media/image/${encodeURIComponent(String(id))}`
}

export function buildMediaPosterUrl(id: string | number) {
  return `/api/media/poster/${encodeURIComponent(String(id))}`
}
