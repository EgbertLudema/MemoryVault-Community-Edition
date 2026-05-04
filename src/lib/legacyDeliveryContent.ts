import { getEffectiveLovedOneNote } from '@/lib/lovedOneNotes'
import { toAbsoluteAssetUrl } from '@/lib/legacyDelivery'
import { buildMediaImageUrl, buildMediaPosterUrl, buildMediaVideoStreamUrl } from '@/lib/mediaBlob'
import { decryptTextServer, isServerEncrypted } from '@/lib/serverEncryption'

export type LegacyContentItem =
  | {
      type: 'note'
      note: string
    }
  | {
      type: 'image' | 'video'
      media: {
        url: string
        alt: string
        posterUrl?: string
        isEncrypted?: boolean
        encryptionMetadata?: any
        posterEncryptionMetadata?: any
      } | null
    }

export type LegacyMemory = {
  id: number | string
  title: string
  memoryDate: string | null
  content: LegacyContentItem[]
}

export type LegacyDeliveryData = {
  recipientName: string
  recipientNote: string
  ownerProfileImageSrc?: string | null
  memories: LegacyMemory[]
}

export function serializeLegacyMemory(memory: any, origin: string): LegacyMemory {
  const content = Array.isArray(memory?.content) ? memory.content : []

  return {
    id: memory?.id,
    title: String(memory?.title ?? 'Untitled memory'),
    memoryDate: memory?.memoryDate ? String(memory.memoryDate) : null,
    content: content
      .map((item: any) => {
        if (item?.type === 'note') {
          const noteCiphertext = String(item.noteCiphertext ?? '').trim()
          const note = String(item.note ?? '').trim()
          return {
            type: 'note' as const,
            note:
              note ||
              (isServerEncrypted(item.noteEncryptionMetadata)
                ? decryptTextServer(noteCiphertext, item.noteEncryptionMetadata)
                : ''),
          }
        }

        if (item?.type === 'image' || item?.type === 'video') {
          const media = item.media
          const mediaId =
            typeof media === 'object' && media && 'id' in media ? String(media.id ?? '').trim() : ''
          const mediaUrl =
            item.type === 'video'
              ? mediaId
                ? buildMediaVideoStreamUrl(mediaId)
                : String(media?.url ?? '').trim()
              : mediaId
                ? buildMediaImageUrl(mediaId)
                : String(media?.url ?? '').trim()

          const resolvedUrl = /^https?:\/\//i.test(mediaUrl)
            ? mediaUrl
            : toAbsoluteAssetUrl(origin, mediaUrl)

          const posterUrl =
            item.type === 'video'
              ? mediaId
                ? toAbsoluteAssetUrl(origin, buildMediaPosterUrl(mediaId))
                : toAbsoluteAssetUrl(origin, String(media?.posterUrl ?? media?.thumbnailURL ?? ''))
              : undefined

          if (!resolvedUrl) {
            return null
          }

          return {
            type: item.type,
            media: {
              url: resolvedUrl,
              alt: String(item.media.alt ?? memory?.title ?? 'Shared memory'),
              ...(posterUrl ? { posterUrl } : {}),
              isEncrypted: Boolean(media?.isEncrypted),
              encryptionMetadata: media?.encryptionMetadata,
              posterEncryptionMetadata: media?.posterEncryptionMetadata,
            },
          }
        }

        return null
      })
      .filter(Boolean) as LegacyContentItem[],
  }
}

export function buildLegacyDeliveryData({
  recipientName,
  recipientNote,
  ownerProfileImageSrc,
  memories,
  origin,
}: {
  recipientName: string
  recipientNote?: string | null
  ownerProfileImageSrc?: string | null
  memories: any[]
  origin: string
}): LegacyDeliveryData {
  const profileImageSrc = toAbsoluteAssetUrl(origin, ownerProfileImageSrc)

  return {
    recipientName,
    recipientNote: getEffectiveLovedOneNote(recipientNote),
    ownerProfileImageSrc: profileImageSrc || null,
    memories: memories.map((memory) => serializeLegacyMemory(memory, origin)),
  }
}
