import { buildMediaImageUrl } from '@/lib/mediaBlob'

type MediaLike = number | string | { id?: number | string | null } | null | undefined

function getMediaId(value: MediaLike) {
  if (typeof value === 'number' || typeof value === 'string') {
    return value
  }

  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) {
    return value.id
  }

  return null
}

export function getProfileImageSrc(user: { profileImage?: MediaLike; profileImageUrl?: string | null }) {
  const mediaId = getMediaId(user.profileImage)

  if (mediaId !== null) {
    return buildMediaImageUrl(mediaId)
  }

  const fallbackUrl = typeof user.profileImageUrl === 'string' ? user.profileImageUrl.trim() : ''
  return fallbackUrl || null
}
