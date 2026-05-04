import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'

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

    return NextResponse.json(result, { status: 200 })
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

    const groups = Array.isArray(body.groups)
      ? body.groups.filter((value: unknown): value is string | number => {
          if (value === null || value === undefined) {
            return false
          }

          return String(value).trim() !== ''
        })
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

    const createdLovedOne = await payload.create({
      collection: 'loved-ones',
      data: {
        fullName,
        nickname: nickname || undefined,
        email,
        relationship,
        customNote: customNote || undefined,
        groups,
        user: user.id,
      },
    })

    return NextResponse.json(createdLovedOne, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create loved one' }, { status: 500 })
  }
}
