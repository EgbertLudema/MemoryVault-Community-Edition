import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { encryptSensitiveText, serializeLovedOneSensitiveFields } from '@/lib/encryptedFields'
import { getLovedOneCountLimit, getLovedOneCountLimitMessage } from '@/lib/lovedOneLimits'

function toNumberId(value: string | number) {
  const raw = String(value ?? '').trim()

  if (!/^\d+$/.test(raw)) {
    return NaN
  }

  return Number(raw)
}

async function ensureOwnedGroups(
  payload: Awaited<ReturnType<typeof getPayload>>,
  groupIds: number[],
  userId: number,
) {
  if (groupIds.length === 0) {
    return true
  }

  const result = await payload.find({
    collection: 'loved-one-groups',
    overrideAccess: true,
    depth: 0,
    limit: groupIds.length,
    where: {
      and: [{ user: { equals: userId } }, { id: { in: groupIds } }],
    },
  })

  return (result.docs?.length ?? 0) === groupIds.length
}

export async function GET(req: Request) {
  try {
    const payload = await getPayload({ config })
    const user = await getAppUserFromHeaders(req.headers)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)

    const depthParam = searchParams.get('depth')
    const limitParam = searchParams.get('limit')
    const sortParam = searchParams.get('sort')

    const depth = depthParam ? Number(depthParam) : 1
    const limit = limitParam ? Number(limitParam) : 100
    const sort = sortParam || '-createdAt'

    const result = await payload.find({
      collection: 'loved-ones',
      depth: Number.isNaN(depth) ? 1 : depth,
      limit: Number.isNaN(limit) ? 100 : limit,
      sort,
      where: {
        user: {
          equals: user.id,
        },
      },
    })

    const docs = (result.docs ?? []).map((doc: any) => serializeLovedOneSensitiveFields(doc))

    return NextResponse.json(
      {
        ...result,
        docs,
        lovedOneCount: result.totalDocs,
        lovedOneCountLimit: getLovedOneCountLimit(user),
      },
      { status: 200 },
    )
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load loved ones' }, { status: 500 })
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

    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
    const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const relationship = typeof body.relationship === 'string' ? body.relationship.trim() : ''
    const customNote = typeof body.customNote === 'string' ? body.customNote.trim() : ''
    const encryptedCustomNote = encryptSensitiveText(customNote)
    const encryptedEmail = encryptSensitiveText(email)

    const rawGroups = Array.isArray(body.groups) ? body.groups : []
    const groups = rawGroups
      .map((value: unknown) => toNumberId(String(value)))
      .filter((value: number) => Number.isFinite(value))

    if (!fullName) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }

    if (!relationship) {
      return NextResponse.json({ error: 'Relationship is required' }, { status: 400 })
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (rawGroups.length !== 1 || groups.length !== 1) {
      return NextResponse.json({ error: 'Exactly one group is required' }, { status: 400 })
    }

    const ownsAllGroups = await ensureOwnedGroups(payload, groups, Number(user.id))

    if (!ownsAllGroups) {
      return NextResponse.json({ error: 'One or more groups are invalid' }, { status: 400 })
    }

    const lovedOneCountLimit = getLovedOneCountLimit(user)
    if (lovedOneCountLimit !== null) {
      const existingLovedOneCount = await payload.count({
        collection: 'loved-ones',
        overrideAccess: true,
        where: {
          user: { equals: user.id },
        },
      })

      if (existingLovedOneCount.totalDocs >= lovedOneCountLimit) {
        return NextResponse.json(
          { error: getLovedOneCountLimitMessage(lovedOneCountLimit) },
          { status: 403 },
        )
      }
    }

    const createdLovedOne = await payload.create({
      collection: 'loved-ones',
      data: {
        fullName,
        nickname: nickname || undefined,
        email: null,
        emailCiphertext: encryptedEmail.ciphertext,
        emailEncryptionMetadata: encryptedEmail.metadata,
        relationship,
        customNote: null,
        customNoteCiphertext: encryptedCustomNote.ciphertext,
        customNoteEncryptionMetadata: encryptedCustomNote.metadata,
        groups,
        user: user.id,
      },
    })

    return NextResponse.json(serializeLovedOneSensitiveFields(createdLovedOne as any), {
      status: 201,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create loved one' }, { status: 500 })
  }
}
