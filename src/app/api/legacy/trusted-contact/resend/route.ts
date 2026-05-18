import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import {
  sendTrustedContactInvite,
  type TrustedContactInviteLovedOne,
} from '@/lib/trustedContactInvites'

export async function POST(req: Request) {
  const user = await getAppUserFromHeaders(req.headers)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { contactId?: unknown }
  const contactId = Number(body.contactId)

  if (!Number.isFinite(contactId)) {
    return NextResponse.json({ error: 'Missing trusted contact.' }, { status: 400 })
  }

  const selectedContactIds = (user.legacyProtectionContacts ?? [])
    .map((contact) => (typeof contact === 'number' ? contact : contact?.id))
    .filter((id): id is number => typeof id === 'number')

  if (!selectedContactIds.includes(contactId)) {
    return NextResponse.json({ error: 'Trusted contact is not selected.' }, { status: 400 })
  }

  const payload = await getPayload({ config })
  const lovedOne = (await payload.findByID({
    collection: 'loved-ones',
    id: contactId,
    depth: 0,
    req: { user },
  })) as TrustedContactInviteLovedOne

  await sendTrustedContactInvite({
    payload,
    lovedOne,
    user,
    origin: new URL(req.url).origin,
    force: true,
  })

  return NextResponse.json({ ok: true, status: 'pending' })
}
