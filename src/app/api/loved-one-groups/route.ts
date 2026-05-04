// app/api/loved-one-groups/route.ts
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { sortGroupsWithDefaultsFirst } from '@/lib/groupMeta'

function normalizeName(value: unknown): string {
  return String(value ?? '').trim()
}

export async function GET(req: Request) {
  const payload = await getPayload({ config })

  try {
    const user = await getAppUserFromHeaders(req.headers)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await payload.find({
      collection: 'loved-one-groups',
      depth: 0,
      limit: 200,
      where: {
        user: {
          equals: user.id,
        },
      },
    })

    const docs = sortGroupsWithDefaultsFirst(
      (result.docs || []).map((doc: any) => {
        return {
          id: String(doc.id),
          name: String(doc.name ?? doc.title ?? doc.label ?? doc.slug ?? ''),
          isDefault: Boolean(doc.isDefault),
          defaultKey: doc.defaultKey ?? null,
          iconKey: doc.iconKey ?? null,
          colorKey: doc.colorKey ?? null,
        }
      }),
    )

    return NextResponse.json({ docs }, { status: 200 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load groups' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const payload = await getPayload({ config })

  try {
    const user = await getAppUserFromHeaders(req.headers)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as {
      name?: string
      isDefault?: boolean
      iconKey?: string | null
      colorKey?: string | null
    }

    const name = normalizeName(body.name)
    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
    }

    const existing = await payload.find({
      collection: 'loved-one-groups',
      depth: 0,
      limit: 1,
      where: {
        and: [
          {
            user: {
              equals: user.id,
            },
          },
          {
            name: {
              equals: name,
            },
          },
        ],
      },
    })

    if ((existing.docs || []).length > 0) {
      return NextResponse.json({ error: 'A group with this name already exists' }, { status: 409 })
    }

    const created = await payload.create({
      collection: 'loved-one-groups',
      data: {
        name,
        isDefault: false,
        iconKey: body.iconKey ?? null,
        colorKey: body.colorKey ?? null,
        user: user.id,
      },
    })

    return NextResponse.json(
      {
        id: String(created.id),
        name: String(created.name ?? ''),
        isDefault: Boolean(created.isDefault),
        defaultKey: created.defaultKey ?? null,
        iconKey: created.iconKey ?? null,
        colorKey: created.colorKey ?? null,
      },
      { status: 201 },
    )
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
  }
}
