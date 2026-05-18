import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { getProfileImageSrc } from '@/lib/profileImage'
import {
  sendTrustedContactInvite,
  type TrustedContactInviteLovedOne,
} from '@/lib/trustedContactInvites'

function toNumberId(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : NaN
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAppUserFromHeaders(req.headers)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const targetId = toNumberId(id)

  if (!Number.isFinite(targetId) || Number(user.id) !== targetId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const payload = await getPayload({ config })
    const body = (await req.json()) as {
      firstName?: string
      lastName?: string
      profileImage?: number | null
      profileImageUrl?: string | null
      enableLegacyProtection?: boolean
      legacyProtectionContacts?: number[]
    }
    const data: Record<string, unknown> = {}
    let selectedTrustedContacts: TrustedContactInviteLovedOne[] = []

    if (Array.isArray(body.legacyProtectionContacts) && body.legacyProtectionContacts.length > 0) {
      const contacts = await payload.find({
        collection: 'loved-ones',
        overrideAccess: true,
        depth: 0,
        limit: 100,
        where: {
          and: [
            { id: { in: body.legacyProtectionContacts } },
            { user: { equals: targetId } },
          ],
        },
      })

      selectedTrustedContacts = contacts.docs as TrustedContactInviteLovedOne[]
    }

    const acceptedTrustedContactIds = new Set(
      selectedTrustedContacts
        .filter((contact) => contact.trustedContactInviteStatus === 'accepted')
        .map((contact) => contact.id),
    )

    for (const key of [
      'firstName',
      'lastName',
      'profileImage',
      'profileImageUrl',
      'enableLegacyProtection',
      'legacyProtectionContacts',
    ] as const) {
      if (key in body) {
        data[key] = body[key]
      }
    }

    if (body.enableLegacyProtection === true) {
      const hasAcceptedTrustedContact = acceptedTrustedContactIds.size > 0
      data.enableLegacyProtection = hasAcceptedTrustedContact
      data.legacyProtectionPendingEnable = !hasAcceptedTrustedContact
      data.legacyCheckInMode = 'user'
      data.legacyCheckInStage = 'none'
      data.legacyNextCheckInAt = hasAcceptedTrustedContact ? new Date().toISOString() : null
      data.legacyCheckInSentAt = null
      data.legacyCheckInDueAt = null
      data.legacyCheckInTokenHash = null
      data.legacyTrustedContactTokenHash = null
    }

    if (body.enableLegacyProtection === false) {
      data.legacyProtectionPendingEnable = false
      data.legacyCheckInStage = 'none'
      data.legacyNextCheckInAt = null
      data.legacyCheckInSentAt = null
      data.legacyCheckInDueAt = null
      data.legacyCheckInTokenHash = null
      data.legacyTrustedContactTokenHash = null
    }

    const updated = await payload.update({
      collection: 'users',
      id: targetId,
      data,
      req: { user },
    })

    if (Array.isArray(body.legacyProtectionContacts)) {
      const origin = new URL(req.url).origin

      for (const contact of selectedTrustedContacts) {
        if (acceptedTrustedContactIds.has(contact.id)) {
          continue
        }

        await sendTrustedContactInvite({
          payload,
          lovedOne: contact,
          user: updated,
          origin,
        })
      }
    }

    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        profileImageSrc: getProfileImageSrc(updated),
        enableLegacyProtection: updated.enableLegacyProtection,
        legacyProtectionPendingEnable: updated.legacyProtectionPendingEnable,
        legacyProtectionContacts: updated.legacyProtectionContacts,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save changes'
    return NextResponse.json({ message }, { status: 400 })
  }
}
