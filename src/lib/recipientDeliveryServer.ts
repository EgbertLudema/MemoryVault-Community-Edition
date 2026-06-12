import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { getRecipientDeliveryData } from '@/lib/recipientDelivery'

export type RecipientDeliverySummary = {
  id: number
  recipientName: string
  ownerDisplayName: string | null
  ownerProfileImageSrc: string | null
  deliveredAt: string
  memoryCount: number
  openWhenCount: number
}

export async function getRequestOriginFromHeaders() {
  const h = await headers()
  const protocol = h.get('x-forwarded-proto') ?? 'http'
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  return `${protocol}://${host}`.replace(/\/$/, '')
}

export async function getRecipientUser() {
  const requestHeaders = await headers()
  return getAppUserFromHeaders(requestHeaders)
}

export async function getRecipientDeliverySummaries(userId: number | string) {
  const payload = await getPayload({ config })
  const origin = await getRequestOriginFromHeaders()
  const result = await payload.find({
    collection: 'legacy-deliveries',
    overrideAccess: true,
    depth: 3,
    limit: 100,
    sort: '-deliveredAt',
    where: {
      and: [{ recipientUser: { equals: userId } }, { status: { equals: 'active' } }],
    },
  })

  const summaries: RecipientDeliverySummary[] = []

  for (const delivery of result.docs ?? []) {
    const data = await getRecipientDeliveryData({ payload, delivery, origin })
    summaries.push({
      id: Number(delivery.id),
      recipientName: data.recipientName,
      ownerDisplayName: data.ownerDisplayName,
      ownerProfileImageSrc: data.ownerProfileImageSrc ?? null,
      deliveredAt: String((delivery as any).deliveredAt ?? (delivery as any).createdAt ?? ''),
      memoryCount: data.memories.length,
      openWhenCount: data.openWhenMessages.length,
    })
  }

  return summaries
}

export async function getClaimedRecipientDelivery(userId: number | string, deliveryId: string) {
  const payload = await getPayload({ config })
  const origin = await getRequestOriginFromHeaders()
  const result = await payload.find({
    collection: 'legacy-deliveries',
    overrideAccess: true,
    depth: 3,
    limit: 1,
    where: {
      and: [
        { id: { equals: deliveryId } },
        { recipientUser: { equals: userId } },
        { status: { equals: 'active' } },
      ],
    },
  })

  const delivery = result.docs?.[0] as any

  if (!delivery) {
    return null
  }

  return {
    id: Number(delivery.id),
    deliveredAt: String(delivery.deliveredAt ?? delivery.createdAt ?? ''),
    data: await getRecipientDeliveryData({ payload, delivery, origin }),
  }
}
