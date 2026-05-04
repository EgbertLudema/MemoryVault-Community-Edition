import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'

function toNumberId(value: string) {
  const raw = String(value ?? '').trim()

  if (!/^\d+$/.test(raw)) {
    return NaN
  }

  return Number(raw)
}

async function getFeatureRequestById(featureRequestId: number) {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'feature-requests',
    overrideAccess: true,
    depth: 0,
    limit: 1,
    where: {
      and: [
        {
          id: {
            equals: featureRequestId,
          },
        },
        {
          status: {
            in: ['open', 'planned'],
          },
        },
      ],
    },
  })

  return result.docs?.[0] ?? null
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getPayload({ config })
    const user = await getAppUserFromHeaders(req.headers)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const featureRequestId = toNumberId(params.id)

    if (!Number.isFinite(featureRequestId)) {
      return NextResponse.json({ error: 'Invalid feature request id' }, { status: 400 })
    }

    const feature = await getFeatureRequestById(featureRequestId)

    if (!feature) {
      return NextResponse.json({ error: 'Feature request not found' }, { status: 404 })
    }

    const existing = await payload.find({
      collection: 'feature-request-votes',
      overrideAccess: true,
      depth: 0,
      limit: 1,
      where: {
        and: [
          {
            featureRequest: {
              equals: featureRequestId,
            },
          },
          {
            user: {
              equals: user.id,
            },
          },
        ],
      },
    })

    if (!existing.docs?.length) {
      await payload.create({
        collection: 'feature-request-votes',
        data: {
          featureRequest: featureRequestId,
          user: user.id,
        },
      })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getPayload({ config })
    const user = await getAppUserFromHeaders(req.headers)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const featureRequestId = toNumberId(params.id)

    if (!Number.isFinite(featureRequestId)) {
      return NextResponse.json({ error: 'Invalid feature request id' }, { status: 400 })
    }

    const existing = await payload.find({
      collection: 'feature-request-votes',
      overrideAccess: true,
      depth: 0,
      limit: 1,
      where: {
        and: [
          {
            featureRequest: {
              equals: featureRequestId,
            },
          },
          {
            user: {
              equals: user.id,
            },
          },
        ],
      },
    })

    const vote = existing.docs?.[0]

    if (vote) {
      await payload.delete({
        collection: 'feature-request-votes',
        id: vote.id,
        overrideAccess: true,
      })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 })
  }
}
