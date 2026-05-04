const BLOB_TOKEN_PATTERN = /^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i

function getBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim()

  if (!token) {
    return null
  }

  const normalized = token.replace(/^['"]|['"]$/g, '')

  return normalized || null
}

export function getPublicBlobBaseUrl() {
  const token = getBlobToken()

  if (!token) {
    return null
  }

  const storeId = token.match(BLOB_TOKEN_PATTERN)?.[1]?.toLowerCase()

  if (!storeId) {
    return null
  }

  return `https://${storeId}.public.blob.vercel-storage.com`
}

export function getBlobReadWriteToken() {
  return getBlobToken()
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
