import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getLovedOneDisplayNote } from '@/lib/encryptedFields'
import { hashDeliveryToken, verifyDeliveryPassword } from '@/lib/legacyDelivery'
import { buildLegacyDeliveryData } from '@/lib/legacyDeliveryContent'
import { createDeliveryMediaCookie, DELIVERY_MEDIA_COOKIE } from '@/lib/mediaAccess'
import { getProfileImageSrc } from '@/lib/profileImage'

function getRequestOrigin(req: Request) {
  const url = new URL(req.url)
  return url.origin
}

export async function POST(req: Request, props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params
  const body = (await req.json().catch(() => ({}))) as { password?: string }
  const password = String(body.password ?? '').trim()

  if (!password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 })
  }

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'legacy-deliveries',
    overrideAccess: true,
    depth: 3,
    limit: 1,
    where: {
      and: [{ tokenHash: { equals: hashDeliveryToken(token) } }, { status: { equals: 'active' } }],
    },
  })

  const delivery = result.docs?.[0] as any

  if (!delivery || !verifyDeliveryPassword(password, delivery.accessPasswordHash)) {
    return NextResponse.json({ error: 'Invalid delivery credentials' }, { status: 401 })
  }

  const origin = getRequestOrigin(req)
  const memories = Array.isArray(delivery.memories) ? delivery.memories : []
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
  const mediaIds = memories.flatMap((memory: any) =>
    (Array.isArray(memory?.content) ? memory.content : [])
      .map((item: any) => {
        const media = item?.media
        const id = typeof media === 'object' && media ? media.id : media
        const numericId = Number(id)
        return Number.isFinite(numericId) ? numericId : null
      })
      .filter((id: number | null): id is number => typeof id === 'number'),
  )
  const deliveryData = buildLegacyDeliveryData({
    recipientName: String(delivery.recipientName ?? 'you'),
    recipientNote:
      typeof delivery.lovedOne === 'object' && delivery.lovedOne
        ? getLovedOneDisplayNote(delivery.lovedOne)
        : null,
    owner: typeof delivery.owner === 'object' && delivery.owner ? delivery.owner : null,
    ownerProfileImageSrc:
      typeof delivery.owner === 'object' && delivery.owner
        ? getProfileImageSrc(delivery.owner)
        : null,
    memories,
    openWhenMessages: openWhenResult.docs ?? [],
    origin,
  })

  deliveryData.openWhenMessages = deliveryData.openWhenMessages.map((message) => ({
    ...message,
    openWhenText: '',
    message: '',
    attachments: [],
  }))

  const response = NextResponse.json(deliveryData, { status: 200 })

  response.cookies.set(DELIVERY_MEDIA_COOKIE, createDeliveryMediaCookie(mediaIds), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return response
}
