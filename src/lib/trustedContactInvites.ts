import crypto from 'crypto'
import type { Payload } from 'payload'
import { sendTriggeredAdminEmailCampaigns } from '@/lib/adminEmailCampaigns'
import { emailButton, escapeHtml, renderBrandedEmail } from '@/lib/emailTemplate'
import { getLovedOneDisplayEmail } from '@/lib/encryptedFields'
import { hashDeliveryToken } from '@/lib/legacyDelivery'

type TrustedContactInviteUser = {
  id: number
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  enableLegacyProtection?: boolean | null
  legacyProtectionPendingEnable?: boolean | null
  legacyProtectionContacts?: Array<number | { id?: number | null } | null> | null
}

export type TrustedContactInviteLovedOne = {
  id: number
  fullName?: string | null
  email?: string | null
  emailCiphertext?: unknown
  emailEncryptionMetadata?: unknown
  trustedContactInviteStatus?: 'none' | 'pending' | 'accepted' | null
  user?: number | TrustedContactInviteUser | null
}

function createInviteToken() {
  const token = crypto.randomBytes(24).toString('base64url')
  return {
    token,
    tokenHash: hashDeliveryToken(token),
  }
}

function getUserDisplayName(user: TrustedContactInviteUser | null | undefined) {
  const firstName = String(user?.firstName ?? '').trim()
  const lastName = String(user?.lastName ?? '').trim()
  return [firstName, lastName].filter(Boolean).join(' ').trim() || 'this Memory Vault user'
}

function makeTrustedContactInviteEmail({
  lovedOneName,
  userName,
  confirmUrl,
}: {
  lovedOneName: string
  userName: string
  confirmUrl: string
}) {
  return {
    subject: `${userName} added you as a trusted contact`,
    preview: 'Please confirm whether you accept being a trusted contact for Memory Vault.',
    text: [
      `Hello ${lovedOneName},`,
      '',
      `${userName} added you as a trusted contact in Memory Vault.`,
      'Please confirm that you accept this role. Legacy protection will not be enabled for this trusted contact until you accept.',
      `If you were not expecting this email or do not fully trust it, ask ${userName} directly before marking it as spam or deleting it.`,
      `Confirm here: ${confirmUrl}`,
    ].join('\n'),
    html: renderBrandedEmail({
      eyebrow: 'Trusted contact invite',
      title: 'Please confirm your trusted contact role',
      preview: 'Please confirm whether you accept being a trusted contact for Memory Vault.',
      body: `
        <p style="margin:0 0 16px;">Hello ${escapeHtml(lovedOneName)},</p>
        <p style="margin:0 0 16px;">${escapeHtml(userName)} added you as a trusted contact in Memory Vault.</p>
        <p style="margin:0 0 22px;color:#57534e;">Please confirm that you accept this role. Legacy protection will not be enabled for this trusted contact until you accept.</p>
        <div style="margin:0 0 22px;border:1px solid #fde68a;border-radius:8px;background:#fffbeb;padding:14px 16px;color:#92400e;">
          If you were not expecting this email or do not fully trust it, ask ${escapeHtml(userName)} directly before marking it as spam or deleting it.
        </div>
        <p style="margin:0;">${emailButton({ href: confirmUrl, label: 'I accept being a trusted contact', background: '#16a34a' })}</p>
      `,
    }),
  }
}

function userHasSelectedContact(user: TrustedContactInviteUser, lovedOneId: number) {
  return (user.legacyProtectionContacts ?? []).some((contact) => {
    if (typeof contact === 'number') {
      return contact === lovedOneId
    }

    return contact?.id === lovedOneId
  })
}

export async function sendTrustedContactInvite({
  payload,
  lovedOne,
  user,
  origin,
  force = false,
}: {
  payload: Payload
  lovedOne: TrustedContactInviteLovedOne
  user: TrustedContactInviteUser
  origin: string
  force?: boolean
}) {
  const email = getLovedOneDisplayEmail(lovedOne)

  if (!email) {
    throw new Error('Trusted contact has no email address.')
  }

  if (lovedOne.trustedContactInviteStatus === 'accepted') {
    return false
  }

  if (lovedOne.trustedContactInviteStatus === 'pending' && !force) {
    return false
  }

  const lovedOneName = String(lovedOne.fullName ?? '').trim() || 'there'
  const { token, tokenHash } = createInviteToken()
  const confirmUrl = new URL(`/api/legacy/trusted-contact/confirm?token=${token}`, origin).toString()
  const message = makeTrustedContactInviteEmail({
    lovedOneName,
    userName: getUserDisplayName(user),
    confirmUrl,
  })
  const now = new Date()

  await payload.sendEmail({
    to: email,
    subject: message.subject,
    text: message.text,
    html: message.html,
  })

  await payload.update({
    collection: 'loved-ones',
    id: lovedOne.id,
    overrideAccess: true,
    data: {
      trustedContactInviteStatus: 'pending',
      trustedContactInviteTokenHash: tokenHash,
      trustedContactInviteSentAt: now.toISOString(),
      trustedContactInviteAcceptedAt: null,
    },
  })

  return true
}

export async function acceptTrustedContactInvite(payload: Payload, token: string, origin: string) {
  const result = await payload.find({
    collection: 'loved-ones',
    overrideAccess: true,
    depth: 1,
    limit: 1,
    where: {
      trustedContactInviteTokenHash: { equals: hashDeliveryToken(token) },
    },
  })

  const lovedOne = result.docs[0] as TrustedContactInviteLovedOne | undefined

  if (!lovedOne) {
    return false
  }

  const now = new Date()
  await payload.update({
    collection: 'loved-ones',
    id: lovedOne.id,
    overrideAccess: true,
    data: {
      trustedContactInviteStatus: 'accepted',
      trustedContactInviteTokenHash: null,
      trustedContactInviteAcceptedAt: now.toISOString(),
    },
  })

  const user = typeof lovedOne.user === 'object' ? lovedOne.user : null

  if (
    user?.legacyProtectionPendingEnable &&
    !user.enableLegacyProtection &&
    userHasSelectedContact(user, lovedOne.id)
  ) {
    await payload.update({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      data: {
        enableLegacyProtection: true,
        legacyProtectionPendingEnable: false,
        legacyCheckInMode: 'user',
        legacyCheckInStage: 'none',
        legacyNextCheckInAt: now.toISOString(),
        legacyCheckInSentAt: null,
        legacyCheckInDueAt: null,
        legacyCheckInTokenHash: null,
        legacyTrustedContactTokenHash: null,
      },
    })
  }

  if (user) {
    try {
      await sendTriggeredAdminEmailCampaigns({
        payload,
        trigger: 'trusted_contact_accepted',
        user,
        origin,
      })
    } catch (error) {
      console.warn('Failed to send trusted contact confirmation email campaigns', error)
    }
  }

  return true
}
