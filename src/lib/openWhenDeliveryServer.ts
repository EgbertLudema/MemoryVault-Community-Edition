import type { Payload } from 'payload'
import { emailButton, escapeHtml, renderBrandedEmail } from '@/lib/emailTemplate'
import {
  createDeliveryPassword,
  createDeliveryToken,
  hashDeliveryPassword,
} from '@/lib/legacyDelivery'

type OpenWhenDeliveryUser = {
  id: number | string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

function toNumberId(value: unknown) {
  const raw = String(
    typeof value === 'object' && value && 'id' in value ? (value as { id?: unknown }).id : value,
  ).trim()

  if (!/^\d+$/.test(raw)) {
    return NaN
  }

  return Number(raw)
}

function getUserDisplayName(user: OpenWhenDeliveryUser | null | undefined) {
  const firstName = String(user?.firstName ?? '').trim()
  const lastName = String(user?.lastName ?? '').trim()
  const email = String(user?.email ?? '').trim()
  return [firstName, lastName].filter(Boolean).join(' ').trim() || email || 'Memory Vault'
}

function getLovedOneName(lovedOne: any) {
  return (
    String(lovedOne?.nickname ?? '').trim() ||
    String(lovedOne?.fullName ?? '').trim() ||
    `Loved one #${String(lovedOne?.id ?? '').trim()}`
  )
}

function getLovedOneEmail(lovedOne: any) {
  return String(lovedOne?.email ?? '').trim()
}

async function createOpenWhenDelivery({
  payload,
  owner,
  lovedOne,
  origin,
}: {
  payload: Payload
  owner: OpenWhenDeliveryUser | null | undefined
  lovedOne: any
  origin: string
}) {
  const ownerId = toNumberId(owner?.id)
  const lovedOneId = toNumberId(lovedOne?.id)

  if (!Number.isFinite(ownerId) || !Number.isFinite(lovedOneId)) {
    throw new Error('Open When message has invalid owner or loved one.')
  }

  const { token, tokenHash } = createDeliveryToken()
  const accessPassword = createDeliveryPassword()
  const deliveredAt = new Date().toISOString()
  const recipientName = getLovedOneName(lovedOne)
  const recipientEmail = getLovedOneEmail(lovedOne)
  const created = await payload.create({
    collection: 'legacy-deliveries',
    overrideAccess: true,
    depth: 0,
    data: {
      status: 'active',
      deliveryKind: 'open_when',
      tokenHash,
      accessPasswordHash: hashDeliveryPassword(accessPassword),
      recipientName,
      recipientEmail: recipientEmail || undefined,
      deliveredAt,
      owner: ownerId,
      lovedOne: lovedOneId,
      memories: [],
    },
  })

  return {
    id: Number(created.id),
    recipientName,
    recipientEmail,
    deliveredAt,
    url: new URL(`/legacy/${token}`, origin).toString(),
    accessPassword,
  }
}

async function sendOpenWhenEmail({
  payload,
  owner,
  delivery,
}: {
  payload: Payload
  owner: OpenWhenDeliveryUser | null | undefined
  delivery: Awaited<ReturnType<typeof createOpenWhenDelivery>>
}) {
  if (!delivery.recipientEmail) {
    return false
  }

  const ownerName = getUserDisplayName(owner)

  await payload.sendEmail({
    to: delivery.recipientEmail,
    subject: `${ownerName} sent you an Open When message`,
    text: [
      `Hello ${delivery.recipientName},`,
      '',
      `${ownerName} has shared an Open When message with you through Memory Vault.`,
      `Open your private link here: ${delivery.url}`,
      `Password: ${delivery.accessPassword}`,
      '',
      'You can open the link and save the message to your Memory Vault recipient account.',
    ].join('\n'),
    html: renderBrandedEmail({
      eyebrow: 'Open When message',
      title: 'You received an Open When message',
      preview: `${ownerName} has shared an Open When message with you through Memory Vault.`,
      body: `
        <p style="margin:0 0 16px;">Hello ${escapeHtml(delivery.recipientName)},</p>
        <p style="margin:0 0 18px;">${escapeHtml(ownerName)} has shared an <strong>Open When</strong> message with you through Memory Vault.</p>
        <div style="margin:0 0 22px;border:1px solid #e7e5e4;border-radius:8px;background:#fafaf9;padding:16px;">
          <div style="margin:0 0 8px;color:#78716c;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;">Your access password</div>
          <div style="color:#1c1917;font-size:22px;font-weight:800;letter-spacing:.14em;">${escapeHtml(delivery.accessPassword)}</div>
          <p style="margin:10px 0 0;color:#57534e;font-size:14px;line-height:1.5;">Use this password when the page asks for it.</p>
        </div>
        <p style="margin:0 0 22px;">${emailButton({ href: delivery.url, label: 'Open your message' })}</p>
        <p style="margin:0;color:#57534e;">After opening it, you can save this message to your Memory Vault recipient account.</p>
      `,
    }),
  })

  return true
}

export async function sendDueOpenWhenMessages({
  payload,
  origin,
  now = new Date(),
}: {
  payload: Payload
  origin: string
  now?: Date
}) {
  const dueResult = await payload.find({
    collection: 'open-when-messages' as any,
    overrideAccess: true,
    depth: 2,
    limit: 100,
    sort: 'triggerDate',
    where: {
      and: [
        { allowSendWhileActive: { equals: true } },
        { triggerDate: { less_than_equal: now.toISOString() } },
        { sentAt: { exists: false } },
        { status: { equals: 'active' } },
      ],
    },
  })

  const summary = {
    checked: dueResult.docs?.length ?? 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    deliveries: [] as Array<{
      messageId: number
      deliveryId: number
      recipientEmail: string | null
      emailSent: boolean
    }>,
    errors: [] as Array<{ messageId: number | string; error: string }>,
  }

  for (const message of (dueResult.docs ?? []) as any[]) {
    const owner = typeof message.owner === 'object' && message.owner ? message.owner : null
    const lovedOnes = Array.isArray(message.lovedOnes) ? message.lovedOnes : []

    if (!owner || lovedOnes.length === 0) {
      summary.skipped += 1
      continue
    }

    let deliveredAny = false

    for (const lovedOne of lovedOnes) {
      try {
        const delivery = await createOpenWhenDelivery({
          payload,
          owner,
          lovedOne,
          origin,
        })
        const emailSent = await sendOpenWhenEmail({
          payload,
          owner,
          delivery,
        })

        deliveredAny = true
        summary.deliveries.push({
          messageId: Number(message.id),
          deliveryId: delivery.id,
          recipientEmail: delivery.recipientEmail || null,
          emailSent,
        })

        if (emailSent) {
          summary.sent += 1
        } else {
          summary.skipped += 1
        }
      } catch (error) {
        summary.failed += 1
        summary.errors.push({
          messageId: message.id,
          error: error instanceof Error ? error.message : 'Failed to send Open When message',
        })
      }
    }

    if (deliveredAny) {
      const sentAt = new Date().toISOString()
      await payload.update({
        collection: 'open-when-messages' as any,
        id: message.id,
        overrideAccess: true,
        data: {
          status: 'sent',
          sentAt,
          dateNotificationSent: sentAt,
        },
      })
    }
  }

  return summary
}
