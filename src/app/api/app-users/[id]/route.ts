import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { getProfileImageSrc } from '@/lib/profileImage'

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
      encryptedVaultKey?: string | null
      vaultKeyEncryptionMetadata?: unknown
    }
    const data: Record<string, unknown> = { ...body }

    if (body.enableLegacyProtection === true) {
      data.legacyCheckInMode = 'user'
      data.legacyCheckInStage = 'none'
      data.legacyNextCheckInAt = new Date().toISOString()
      data.legacyCheckInSentAt = null
      data.legacyCheckInDueAt = null
      data.legacyCheckInTokenHash = null
      data.legacyTrustedContactTokenHash = null
    }

    if (body.enableLegacyProtection === false) {
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

    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        profileImageSrc: getProfileImageSrc(updated),
        enableLegacyProtection: updated.enableLegacyProtection,
        legacyProtectionContacts: updated.legacyProtectionContacts,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save changes'
    return NextResponse.json({ message }, { status: 400 })
  }
}
