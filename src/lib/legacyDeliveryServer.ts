import type { Payload } from 'payload'
import { emailButton, escapeHtml, renderBrandedEmail } from '@/lib/emailTemplate'
import {
  createDeliveryPassword,
  createDeliveryToken,
  hashDeliveryPassword,
  resolveLegacyRecipients,
} from '@/lib/legacyDelivery'

type LegacyDeliveryUser = {
  id: number | string
  firstName?: string | null
  lastName?: string | null
}

function getUserDisplayName(user: LegacyDeliveryUser) {
  const firstName = String(user.firstName ?? '').trim()
  const lastName = String(user.lastName ?? '').trim()
  return [firstName, lastName].filter(Boolean).join(' ').trim()
}

function toNumberId(value: unknown) {
  const raw = String(value ?? '').trim()

  if (!/^\d+$/.test(raw)) {
    return NaN
  }

  return Number(raw)
}

export async function createLegacyDeliveriesForUser({
  payload,
  user,
  origin,
  lovedOneIds = [],
  sendEmails = true,
}: {
  payload: Payload
  user: LegacyDeliveryUser
  origin: string
  lovedOneIds?: Array<number | string>
  sendEmails?: boolean
}) {
  const requestedLovedOneIds = lovedOneIds
    .map((value) => toNumberId(value))
    .filter((value) => Number.isFinite(value))

  const [lovedOneResult, memoryResult, priorDeliveryResult] = await Promise.all([
    payload.find({
      collection: 'loved-ones',
      overrideAccess: true,
      depth: 1,
      limit: 200,
      where: {
        user: { equals: user.id },
      },
    }),
    payload.find({
      collection: 'memories',
      overrideAccess: true,
      depth: 2,
      limit: 500,
      where: {
        owner: { equals: user.id },
      },
    }),
    payload.find({
      collection: 'legacy-deliveries',
      overrideAccess: true,
      depth: 0,
      limit: 200,
      where: {
        and: [{ owner: { equals: user.id } }, { status: { equals: 'active' } }],
      },
    }),
  ])

  const lovedOnes = (lovedOneResult.docs ?? []).filter((lovedOne: any) => {
    if (requestedLovedOneIds.length === 0) {
      return true
    }

    return requestedLovedOneIds.includes(Number(lovedOne.id))
  })

  const recipients = resolveLegacyRecipients(lovedOnes as any[], (memoryResult.docs ?? []) as any[])

  if (recipients.length === 0) {
    throw new Error('No loved ones with assigned memories were found for delivery.')
  }

  const priorDeliveries = priorDeliveryResult.docs ?? []
  for (const existing of priorDeliveries) {
    const lovedOneId =
      typeof existing.lovedOne === 'object' && existing.lovedOne
        ? Number(existing.lovedOne.id)
        : Number(existing.lovedOne)

    if (!recipients.some((recipient) => recipient.lovedOneId === lovedOneId)) {
      continue
    }

    await payload.update({
      collection: 'legacy-deliveries',
      id: existing.id,
      overrideAccess: true,
      data: {
        status: 'revoked',
      },
    })
  }

  const deliveredAt = new Date().toISOString()
  const deliveries = []

  for (const recipient of recipients) {
    const { token, tokenHash } = createDeliveryToken()
    const accessPassword = createDeliveryPassword()
    const created = await payload.create({
      collection: 'legacy-deliveries',
      overrideAccess: true,
      depth: 0,
      data: {
        status: 'active',
        tokenHash,
        accessPasswordHash: hashDeliveryPassword(accessPassword),
        recipientName: recipient.recipientName,
        recipientEmail: recipient.recipientEmail ?? undefined,
        deliveredAt,
        owner: Number(user.id),
        lovedOne: recipient.lovedOneId,
        memories: recipient.memoryIds,
      },
    })

    const deliveryUrl = new URL(`/legacy/${token}`, origin).toString()
    let emailSent = false
    let emailError: string | null = null

    if (sendEmails && recipient.recipientEmail) {
      try {
        await payload.sendEmail({
          to: recipient.recipientEmail,
          subject: `Memories have been shared with you from ${getUserDisplayName(user) || 'Memory Vault'}`,
          text: [
            `Hello ${recipient.recipientName},`,
            '',
            `A collection of memories has been shared with you through Memory Vault.`,
            `Open your private link here: ${deliveryUrl}`,
            `Password: ${accessPassword}`,
            '',
            `This link and password give you access to ${recipient.memoryIds.length} ${recipient.memoryIds.length === 1 ? 'memory' : 'memories'}.`,
          ].join('\n'),
          html: renderBrandedEmail({
            eyebrow: 'Memory delivery',
            title: 'Memories have been shared with you',
            preview: `A private Memory Vault delivery is ready for ${recipient.recipientName}.`,
            body: `
              <p style="margin:0 0 16px;">Hello ${escapeHtml(recipient.recipientName)},</p>
              <p style="margin:0 0 18px;">A collection of memories has been shared with you through <strong>Memory Vault</strong>.</p>
              <div style="margin:0 0 22px;border:1px solid #e7e5e4;border-radius:8px;background:#fafaf9;padding:16px;">
                <div style="margin:0 0 8px;color:#78716c;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;">Your access password</div>
                <div style="color:#1c1917;font-size:22px;font-weight:800;letter-spacing:.14em;">${escapeHtml(accessPassword)}</div>
                <p style="margin:10px 0 0;color:#57534e;font-size:14px;line-height:1.5;">Use this password when the page asks for it.</p>
              </div>
              <p style="margin:0 0 22px;">${emailButton({ href: deliveryUrl, label: 'Open your private memories' })}</p>
              <p style="margin:0;color:#57534e;">This link and password give you access to ${recipient.memoryIds.length} ${recipient.memoryIds.length === 1 ? 'memory' : 'memories'}.</p>
            `,
          }),
        })
        emailSent = true
      } catch (error) {
        emailError = error instanceof Error ? error.message : 'Failed to send email'
      }
    }

    deliveries.push({
      id: Number(created.id),
      recipientName: recipient.recipientName,
      recipientEmail: recipient.recipientEmail,
      memoryCount: recipient.memoryIds.length,
      memoryIds: recipient.memoryIds,
      deliveredAt,
      url: deliveryUrl,
      accessPassword,
      emailSent,
      emailError,
    })
  }

  return deliveries
}
