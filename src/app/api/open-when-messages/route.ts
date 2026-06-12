import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { FEATURE_KEYS, hasFeatureForUser } from '@/lib/communityFeatures'
import {
  getOpenWhenMessageCountLimit,
  getOpenWhenMessageCountLimitMessage,
} from '@/lib/openWhenLimits'
import { encryptOpenWhenFields, serializeOpenWhenMessage } from '@/lib/openWhenMessages'

type PayloadClient = Awaited<ReturnType<typeof getPayload>>
const OPEN_WHEN_MAX_PHOTOS = 4

function toNumberId(value: unknown) {
  const raw = String(value ?? '').trim()

  if (!/^\d+$/.test(raw)) {
    return NaN
  }

  return Number(raw)
}

function normalizeNumberIds(values: unknown) {
  return Array.isArray(values)
    ? values.map((value) => toNumberId(value)).filter((value) => Number.isFinite(value))
    : []
}

async function ensureOwnedLovedOnes(payload: PayloadClient, ids: number[], userId: number) {
  if (ids.length === 0) {
    return false
  }

  const result = await payload.find({
    collection: 'loved-ones',
    overrideAccess: true,
    depth: 0,
    limit: ids.length,
    where: {
      and: [{ user: { equals: userId } }, { id: { in: ids } }],
    },
  })

  return (result.docs?.length ?? 0) === ids.length
}

async function ensureOwnedImageAttachments(payload: PayloadClient, ids: number[], userId: number) {
  if (ids.length === 0) {
    return true
  }

  if (ids.length > OPEN_WHEN_MAX_PHOTOS) {
    return false
  }

  const result = await payload.find({
    collection: 'media',
    overrideAccess: true,
    depth: 0,
    limit: ids.length,
    where: {
      and: [{ ownerUser: { equals: userId } }, { id: { in: ids } }],
    },
  })

  if ((result.docs?.length ?? 0) !== ids.length) {
    return false
  }

  return (result.docs ?? []).every((doc: any) => {
    const originalType = String(doc?.encryptionMetadata?.originalType ?? doc?.mimeType ?? '')
    return originalType.startsWith('image/')
  })
}

function parseTriggerDate(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) {
    return null
  }

  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

export async function GET(req: Request) {
  try {
    const payload = await getPayload({ config })
    const user = await getAppUserFromHeaders(req.headers)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await payload.find({
      collection: 'open-when-messages' as any,
      overrideAccess: true,
      depth: 2,
      limit: 200,
      sort: '-createdAt',
      where: {
        owner: {
          equals: user.id,
        },
      },
    })

    return NextResponse.json(
      {
        ...result,
        docs: (result.docs ?? []).map((doc: any) => serializeOpenWhenMessage(doc)),
        canUseOpenWhenPhotos: hasFeatureForUser(user, FEATURE_KEYS.openWhenPhotos),
        openWhenMessageCount: result.totalDocs,
        openWhenMessageCountLimit: getOpenWhenMessageCountLimit(user),
      },
      { status: 200 },
    )
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load Open When messages' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const payload = await getPayload({ config })
    const user = await getAppUserFromHeaders(req.headers)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const title = String(body?.title ?? '').trim()
    const openWhenText = String(body?.openWhenText ?? '').trim()
    const message = String(body?.message ?? '').trim()
    const lovedOneIds = normalizeNumberIds(body?.lovedOnes)
    const attachmentIds = normalizeNumberIds(body?.attachments)
    const triggerDate = parseTriggerDate(body?.triggerDate)
    const allowSendWhileActive = Boolean(body?.allowSendWhileActive)
    const iconKey = String(body?.iconKey ?? 'mail').trim() || 'mail'
    const colorKey = String(body?.colorKey ?? 'purple').trim() || 'purple'

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!openWhenText) {
      return NextResponse.json({ error: 'Open when text is required' }, { status: 400 })
    }

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (lovedOneIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one loved one' }, { status: 400 })
    }

    if (attachmentIds.length > OPEN_WHEN_MAX_PHOTOS) {
      return NextResponse.json({ error: 'Add at most 4 photos' }, { status: 400 })
    }

    if (attachmentIds.length > 0 && !hasFeatureForUser(user, FEATURE_KEYS.openWhenPhotos)) {
      return NextResponse.json({ error: 'Open When photos require Pro' }, { status: 403 })
    }

    if (triggerDate === undefined) {
      return NextResponse.json({ error: 'Use a valid date' }, { status: 400 })
    }

    const userId = Number(user.id)
    const messageCountLimit = getOpenWhenMessageCountLimit(user)
    if (messageCountLimit !== null) {
      const existingMessageCount = await payload.count({
        collection: 'open-when-messages' as any,
        overrideAccess: true,
        where: {
          owner: { equals: userId },
        },
      })

      if (existingMessageCount.totalDocs >= messageCountLimit) {
        return NextResponse.json(
          { error: getOpenWhenMessageCountLimitMessage(messageCountLimit) },
          { status: 403 },
        )
      }
    }

    const [ownsLovedOnes, ownsAttachments] = await Promise.all([
      ensureOwnedLovedOnes(payload, lovedOneIds, userId),
      ensureOwnedImageAttachments(payload, attachmentIds, userId),
    ])

    if (!ownsLovedOnes) {
      return NextResponse.json({ error: 'One or more loved ones are invalid' }, { status: 400 })
    }

    if (!ownsAttachments) {
      return NextResponse.json({ error: 'One or more photos are invalid' }, { status: 400 })
    }

    const created = await payload.create({
      collection: 'open-when-messages' as any,
      overrideAccess: true,
      depth: 2,
      data: {
        ...encryptOpenWhenFields({ title, openWhenText, message }),
        owner: userId,
        lovedOnes: lovedOneIds,
        attachments: attachmentIds,
        triggerDate,
        allowSendWhileActive,
        iconKey,
        colorKey,
        status: 'active',
      },
    })

    return NextResponse.json(serializeOpenWhenMessage(created as any), { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to save Open When message' }, { status: 500 })
  }
}
