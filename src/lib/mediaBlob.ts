export function getPublicMediaBaseUrl() {
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
