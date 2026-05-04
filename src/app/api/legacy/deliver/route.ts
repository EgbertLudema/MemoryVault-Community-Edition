import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { createLegacyDeliveriesForUser } from '@/lib/legacyDeliveryServer'

function toNumberId(value: unknown) {
  const raw = String(value ?? '').trim()

  if (!/^\d+$/.test(raw)) {
    return NaN
  }

  return Number(raw)
}

export async function GET(req: Request) {
  const user = await getAppUserFromHeaders(req.headers)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'legacy-deliveries',
      overrideAccess: true,
      depth: 2,
      limit: 100,
      sort: '-createdAt',
      where: {
        owner: { equals: user.id },
      },
    })

    const deliveries = (result.docs ?? []).map((delivery: any) => ({
      id: Number(delivery.id),
      status: String(delivery.status ?? 'active'),
      recipientName: String(delivery.recipientName ?? ''),
      recipientEmail: String(delivery.recipientEmail ?? '').trim() || null,
      deliveredAt: String(delivery.deliveredAt ?? delivery.createdAt ?? ''),
      memoryCount: Array.isArray(delivery.memories) ? delivery.memories.length : 0,
    }))

    return NextResponse.json({ deliveries }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load legacy deliveries' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getAppUserFromHeaders(req.headers)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getPayload({ config })
    const body = (await req.json().catch(() => ({}))) as {
      lovedOneIds?: Array<number | string>
      sendEmails?: boolean
    }

    const requestedLovedOneIds = Array.isArray(body.lovedOneIds)
      ? body.lovedOneIds.map((value) => toNumberId(value)).filter((value) => Number.isFinite(value))
      : []

    const deliveries = await createLegacyDeliveriesForUser({
      payload,
      user,
      origin: new URL(req.url).origin,
      lovedOneIds: requestedLovedOneIds,
      sendEmails: body.sendEmails !== false,
    })

    return NextResponse.json({ deliveries }, { status: 201 })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to create legacy deliveries'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
