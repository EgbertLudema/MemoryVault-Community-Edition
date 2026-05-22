const BYTES_PER_MEBIBYTE = 1024 * 1024

export const IMAGE_UPLOAD_MAX_BYTES = 10 * BYTES_PER_MEBIBYTE
export const VIDEO_UPLOAD_MAX_BYTES = 250 * BYTES_PER_MEBIBYTE
export const PROFILE_IMAGE_UPLOAD_MAX_BYTES = 5 * BYTES_PER_MEBIBYTE

export const IMAGE_UPLOAD_MAX_LABEL = formatUploadBytes(IMAGE_UPLOAD_MAX_BYTES)
export const VIDEO_UPLOAD_MAX_LABEL = formatUploadBytes(VIDEO_UPLOAD_MAX_BYTES)
export const PROFILE_IMAGE_UPLOAD_MAX_LABEL = formatUploadBytes(PROFILE_IMAGE_UPLOAD_MAX_BYTES)

type UploadFileLike = {
  size: number
  type?: string
}

export function formatUploadBytes(bytes: number) {
  if (bytes >= BYTES_PER_MEBIBYTE && bytes % BYTES_PER_MEBIBYTE === 0) {
    return `${bytes / BYTES_PER_MEBIBYTE} MB`
  }

  return `${(bytes / BYTES_PER_MEBIBYTE).toFixed(1)} MB`
}

export function getUploadKindForMimeType(mimeType?: string) {
  const safeMimeType = String(mimeType ?? '').toLowerCase()

  if (safeMimeType.startsWith('image/')) {
    return 'image' as const
  }

  if (safeMimeType.startsWith('video/')) {
    return 'video' as const
  }

  return null
}

export function getUploadLimitForMimeType(mimeType?: string) {
  const kind = getUploadKindForMimeType(mimeType)

  if (kind === 'image') {
    return IMAGE_UPLOAD_MAX_BYTES
  }

  if (kind === 'video') {
    return VIDEO_UPLOAD_MAX_BYTES
  }

  return null
}

export function isWithinUploadLimit(file: UploadFileLike) {
  const limit = getUploadLimitForMimeType(file.type)

  return limit !== null && file.size <= limit
}

export function getUploadLimitLabelForMimeType(mimeType?: string) {
  const kind = getUploadKindForMimeType(mimeType)

  if (kind === 'image') {
    return IMAGE_UPLOAD_MAX_LABEL
  }

  if (kind === 'video') {
    return VIDEO_UPLOAD_MAX_LABEL
  }

  return null
}
