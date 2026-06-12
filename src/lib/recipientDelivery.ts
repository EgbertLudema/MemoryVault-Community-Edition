import type { Payload } from 'payload'
import { getLovedOneDisplayNote } from '@/lib/encryptedFields'
import { buildLegacyDeliveryData, type LegacyDeliveryData } from '@/lib/legacyDeliveryContent'
import { getProfileImageSrc } from '@/lib/profileImage'

function toNumberId(value: unknown) {
  const raw = String(
    typeof value === 'object' && value && 'id' in value ? (value as { id?: unknown }).id : value,
  ).trim()

  if (!/^\d+$/.test(raw)) {
    return NaN
  }

  return Number(raw)
}

export async function getRecipientDeliveryData({
  payload,
  delivery,
  origin,
}: {
  payload: Payload
  delivery: any
  origin: string
}): Promise<LegacyDeliveryData> {
  const ownerId =
    typeof delivery.owner === 'object' && delivery.owner ? Number(delivery.owner.id) : Number(delivery.owner)
  const lovedOneId =
    typeof delivery.lovedOne === 'object' && delivery.lovedOne
      ? Number(delivery.lovedOne.id)
      : Number(delivery.lovedOne)

  const openWhenResult =
    Number.isFinite(ownerId) && Number.isFinite(lovedOneId)
      ? await payload.find({
          collection: 'open-when-messages' as any,
          overrideAccess: true,
          depth: 1,
          limit: 200,
          sort: 'triggerDate',
          where: {
            and: [
              { owner: { equals: ownerId } },
              { lovedOnes: { equals: lovedOneId } },
              { status: { not_equals: 'draft' } },
            ],
          },
        })
      : { docs: [] }

  return buildLegacyDeliveryData({
    recipientName: String(delivery.recipientName ?? 'you'),
    recipientNote:
      typeof delivery.lovedOne === 'object' && delivery.lovedOne
        ? getLovedOneDisplayNote(delivery.lovedOne)
        : null,
    owner: typeof delivery.owner === 'object' && delivery.owner ? delivery.owner : null,
    ownerProfileImageSrc:
      typeof delivery.owner === 'object' && delivery.owner ? getProfileImageSrc(delivery.owner) : null,
    memories: Array.isArray(delivery.memories) ? delivery.memories : [],
    openWhenMessages: openWhenResult.docs ?? [],
    origin,
  })
}

export function collectDeliveryMediaIds(deliveryData: LegacyDeliveryData) {
  const mediaIds = new Set<number>()

  for (const memory of deliveryData.memories) {
    for (const item of memory.content) {
      if (item.type !== 'image' && item.type !== 'video') {
        continue
      }

      const imageMatch = item.media?.url?.match(/\/api\/media\/(?:image|video)\/(\d+)/)
      const posterMatch = item.media?.posterUrl?.match(/\/api\/media\/poster\/(\d+)/)
      const imageId = imageMatch ? toNumberId(imageMatch[1]) : NaN
      const posterId = posterMatch ? toNumberId(posterMatch[1]) : NaN

      if (Number.isFinite(imageId)) mediaIds.add(imageId)
      if (Number.isFinite(posterId)) mediaIds.add(posterId)
    }
  }

  return Array.from(mediaIds)
}
