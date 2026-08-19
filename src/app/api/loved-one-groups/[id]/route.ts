import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'

function toNumberId(value: unknown) {
  const raw = String(value ?? '').trim()

  if (!/^\d+$/.test(raw)) {
    return NaN
  }

  return Number(raw)
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAppUserFromHeaders(req.headers)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const groupId = toNumberId(id)

  if (!Number.isFinite(groupId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const payload = await getPayload({ config })
    const existing = await payload
      .findByID({ collection: 'loved-one-groups', id: groupId, depth: 0, overrideAccess: true })
      .catch(() => null)

    if (!existing || Number(existing.user) !== Number(user.id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (existing.isDefault) {
      return NextResponse.json({ error: 'Default groups cannot be deleted' }, { status: 400 })
    }

    await payload.delete({
      collection: 'loved-one-groups',
      id: groupId,
      overrideAccess: true,
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 400 })
  }
}
