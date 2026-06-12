import { getEffectiveLovedOneNote } from '@/lib/lovedOneNotes'
import { getMemoryDisplayTitle } from '@/lib/encryptedFields'
import { toAbsoluteAssetUrl } from '@/lib/legacyDelivery'
import { serializeOpenWhenMessage } from '@/lib/openWhenMessages'
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

export type LegacyOpenWhenMessage = {
  id: number | string
  title: string
  openWhenText: string
  message: string
  triggerDate: string | null
  attachments: Array<{
    id: string
    url: string
    alt: string
    isEncrypted?: boolean
    encryptionMetadata?: any
  }>
}

export type LegacyDeliveryData = {
  recipientName: string
  recipientNote: string
  ownerDisplayName: string | null
  ownerProfileImageSrc?: string | null
  memories: LegacyMemory[]
  openWhenMessages: LegacyOpenWhenMessage[]
}

function getOwnerDisplayName(owner: unknown) {
  if (!owner || typeof owner !== 'object') {
    return null
  }

  const value = owner as {
    firstName?: unknown
    lastName?: unknown
    fullName?: unknown
    email?: unknown
  }
  const firstName = String(value.firstName ?? '').trim()
  const lastName = String(value.lastName ?? '').trim()
  const fullName = String(value.fullName ?? '').trim()
  const email = String(value.email ?? '').trim()

  return [firstName, lastName].filter(Boolean).join(' ').trim() || fullName || email || null
}

export function serializeLegacyMemory(memory: any, origin: string): LegacyMemory {
  const content = Array.isArray(memory?.content) ? memory.content : []
  const title = getMemoryDisplayTitle(memory)

  return {
    id: memory?.id,
    title,
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
              alt: String(item.media.alt ?? title ?? 'Shared memory'),
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
  owner,
  ownerDisplayName,
  ownerProfileImageSrc,
  memories,
  openWhenMessages = [],
  origin,
}: {
  recipientName: string
  recipientNote?: string | null
  owner?: unknown
  ownerDisplayName?: string | null
  ownerProfileImageSrc?: string | null
  memories: any[]
  openWhenMessages?: any[]
  origin: string
}): LegacyDeliveryData {
  const profileImageSrc = toAbsoluteAssetUrl(origin, ownerProfileImageSrc)

  return {
    recipientName,
    recipientNote: getEffectiveLovedOneNote(recipientNote),
    ownerDisplayName: String(ownerDisplayName ?? '').trim() || getOwnerDisplayName(owner),
    ownerProfileImageSrc: profileImageSrc || null,
    memories: memories.map((memory) => serializeLegacyMemory(memory, origin)),
    openWhenMessages: openWhenMessages.map((message) => {
      const serialized = serializeOpenWhenMessage(message)
      const attachments = Array.isArray(serialized.attachments) ? serialized.attachments : []

      return {
        id: serialized.id,
        title: String(serialized.title ?? ''),
        openWhenText: String(serialized.openWhenText ?? ''),
        message: String(serialized.message ?? ''),
        triggerDate: serialized.triggerDate ? String(serialized.triggerDate) : null,
        attachments: attachments
          .map((attachment: any) => {
            const mediaId =
              typeof attachment === 'object' && attachment ? String(attachment.id ?? '').trim() : ''

            if (!mediaId) {
              return null
            }

            return {
              id: mediaId,
              url: toAbsoluteAssetUrl(origin, buildMediaImageUrl(mediaId)),
              alt: String(attachment?.alt ?? serialized.title ?? 'Open When photo'),
              isEncrypted: Boolean(attachment?.isEncrypted),
              encryptionMetadata: attachment?.encryptionMetadata,
            }
          })
          .filter(Boolean),
      }
    }),
  }
}
