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

async function getOwnedLovedOne(
  payload: Awaited<ReturnType<typeof getPayload>>,
  lovedOneId: number,
  userId: number,
  depth = 1,
) {
  const result = await payload.find({
    collection: 'loved-ones',
    overrideAccess: true,
    depth,
    limit: 1,
    where: {
      and: [{ id: { equals: lovedOneId } }, { user: { equals: userId } }],
    },
  })

  return result.docs?.[0] ?? null
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

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAppUserFromHeaders(req.headers)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const lovedOneId = toNumberId(id)

  if (!Number.isFinite(lovedOneId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const payload = await getPayload({ config })
    const url = new URL(req.url)
    const depthParam = Number(url.searchParams.get('depth') ?? '1')
    const depth = Number.isFinite(depthParam) ? depthParam : 1

    const lovedOne = await getOwnedLovedOne(payload, lovedOneId, Number(user.id), depth)

    if (!lovedOne) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(lovedOne, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load loved one' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAppUserFromHeaders(req.headers)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const lovedOneId = toNumberId(id)

  if (!Number.isFinite(lovedOneId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const payload = await getPayload({ config })
    const existing = await getOwnedLovedOne(payload, lovedOneId, Number(user.id), 0)

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = (await req.json()) as {
      fullName?: string
      nickname?: string | null
      email?: string | null
      relationship?: string
      customNote?: string | null
      groups?: Array<string | number>
    }

    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
    const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const relationship = typeof body.relationship === 'string' ? body.relationship.trim() : ''
    const customNote = typeof body.customNote === 'string' ? body.customNote.trim() : ''

    const groups = Array.isArray(body.groups)
      ? body.groups
          .map((value) => toNumberId(String(value)))
          .filter((value) => Number.isFinite(value))
      : []

    if (!fullName) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }

    if (!relationship) {
      return NextResponse.json({ error: 'Relationship is required' }, { status: 400 })
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (groups.length === 0) {
      return NextResponse.json({ error: 'At least one group is required' }, { status: 400 })
    }

    const ownsAllGroups = await ensureOwnedGroups(payload, groups, Number(user.id))

    if (!ownsAllGroups) {
      return NextResponse.json({ error: 'One or more groups are invalid' }, { status: 400 })
    }

    const updated = await payload.update({
      collection: 'loved-ones',
      id: lovedOneId,
      overrideAccess: true,
      depth: 1,
      data: {
        fullName,
        nickname: nickname || null,
        email,
        relationship,
        customNote: customNote || null,
        groups,
        user: Number(user.id),
      },
    })

    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to save loved one'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAppUserFromHeaders(req.headers)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const lovedOneId = toNumberId(id)

  if (!Number.isFinite(lovedOneId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const payload = await getPayload({ config })
    const existing = await getOwnedLovedOne(payload, lovedOneId, Number(user.id), 0)

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await payload.delete({
      collection: 'loved-ones',
      id: lovedOneId,
      overrideAccess: true,
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete loved one' }, { status: 400 })
  }
}
