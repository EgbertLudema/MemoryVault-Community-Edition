import crypto from 'crypto'
import type { Payload } from 'payload'
import { emailButton, escapeHtml, renderBrandedEmail } from '@/lib/emailTemplate'
import { hashDeliveryToken } from '@/lib/legacyDelivery'
import { createLegacyDeliveriesForUser } from '@/lib/legacyDeliveryServer'

const CHECK_IN_INTERVAL_DAYS = 30
const RESPONSE_WINDOW_DAYS = 14

type CheckInMode = 'user' | 'trusted'
type CheckInStage = 'none' | 'user-first' | 'user-reminder' | 'trusted-pending'
type TrustedAction = 'healthy' | 'unhealthy' | 'passed'

export type LegacyCheckInUser = {
  id: number
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  enableLegacyProtection?: boolean | null
  legacyProtectionContacts?: Array<
    number | { id?: number | null; fullName?: string | null; email?: string | null } | null
  > | null
  legacyCheckInMode?: CheckInMode | null
  legacyCheckInStage?: CheckInStage | null
  legacyNextCheckInAt?: string | null
  legacyCheckInDueAt?: string | null
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function isDue(value: string | null | undefined, now: Date) {
  if (!value) {
    return true
  }

  return new Date(value).getTime() <= now.getTime()
}

function createResponseToken() {
  const token = crypto.randomBytes(24).toString('base64url')
  return {
    token,
    tokenHash: hashDeliveryToken(token),
  }
}

function getContactEmail(contact: unknown) {
  if (!contact || typeof contact !== 'object') {
    return null
  }

  const email = String((contact as { email?: unknown }).email ?? '').trim()
  return email || null
}

function getContactName(contact: unknown) {
  if (!contact || typeof contact !== 'object') {
    return 'trusted contact'
  }

  return String((contact as { fullName?: unknown }).fullName ?? '').trim() || 'trusted contact'
}

function getUserDisplayName(user: LegacyCheckInUser) {
  const firstName = String(user.firstName ?? '').trim()
  const lastName = String(user.lastName ?? '').trim()
  return [firstName, lastName].filter(Boolean).join(' ').trim()
}

function makeUserCheckInEmail(user: LegacyCheckInUser, confirmUrl: string, reminder: boolean) {
  const greeting = getUserDisplayName(user) || 'there'
  const subject = reminder
    ? 'Reminder: please confirm your Memory Vault check-in'
    : 'Please confirm your Memory Vault check-in'

  return {
    subject,
    preview: 'Confirm that you are healthy to keep your Memory Vault check-ins on schedule.',
    text: [
      `Hello ${greeting},`,
      '',
      'Please confirm that you are healthy so Memory Vault can keep your legacy protection paused.',
      'Click "I am healthy" if you are safe and able to respond yourself. This will stop the current check-in and schedule the next one in 30 days.',
      `Confirm here: ${confirmUrl}`,
      '',
      `If you do not confirm within ${RESPONSE_WINDOW_DAYS} days, we will contact your trusted contacts.`,
    ].join('\n'),
    html: renderBrandedEmail({
      eyebrow: reminder ? 'Check-in reminder' : '30-day check-in',
      title: reminder ? 'Please confirm you are healthy' : 'Are you doing okay?',
      preview: 'Confirm that you are healthy to keep your Memory Vault check-ins on schedule.',
      body: `
        <p style="margin:0 0 16px;">Hello ${escapeHtml(greeting)},</p>
        <p style="margin:0 0 16px;">Please confirm that you are healthy so Memory Vault can keep your legacy protection paused.</p>
        <div style="margin:0 0 22px;border-left:4px solid #16a34a;border-radius:8px;background:#f0fdf4;padding:14px 16px;color:#166534;">
          <strong>I am healthy</strong> means you are safe and able to respond yourself. It stops the current check-in and schedules the next one in 30 days.
        </div>
        <p style="margin:0 0 22px;">${emailButton({ href: confirmUrl, label: 'I am healthy', background: '#16a34a' })}</p>
        <p style="margin:0;color:#57534e;">If you do not confirm within ${RESPONSE_WINDOW_DAYS} days, we will contact your trusted contacts.</p>
      `,
    }),
  }
}

function makeTrustedContactEmail(user: LegacyCheckInUser, contactName: string, baseUrl: string) {
  const userName = getUserDisplayName(user) || 'this Memory Vault user'
  const healthyUrl = `${baseUrl}&action=healthy`
  const unhealthyUrl = `${baseUrl}&action=unhealthy`
  const passedUrl = `${baseUrl}&action=passed`

  return {
    subject: `Please confirm the wellbeing of ${userName}`,
    preview: `Choose the option that best describes ${userName}.`,
    text: [
      `Hello ${contactName},`,
      '',
      `${userName} did not confirm their Memory Vault check-in. Please choose one option:`,
      'The person is healthy: choose this if they are safe and can keep receiving the 30-day check-ins themselves.',
      `The person is healthy: ${healthyUrl}`,
      'The person is not healthy: choose this if they are alive but should not receive the check-ins directly. Future 30-day check-ins will go to trusted contacts instead.',
      `The person is not healthy: ${unhealthyUrl}`,
      'The person has passed away: choose this only when they have passed away. Memory Vault will start delivery to linked recipients.',
      `The person has passed away: ${passedUrl}`,
    ].join('\n'),
    html: renderBrandedEmail({
      eyebrow: 'Trusted contact check-in',
      title: `Can you confirm ${userName}?`,
      preview: `Choose the option that best describes ${userName}.`,
      body: `
        <p style="margin:0 0 16px;">Hello ${escapeHtml(contactName)},</p>
        <p style="margin:0 0 22px;">${escapeHtml(userName)} did not confirm their Memory Vault check-in. Please choose the option that best describes the situation.</p>

        <div style="margin:0 0 16px;border:1px solid #bbf7d0;border-radius:8px;background:#f0fdf4;padding:16px;">
          <h2 style="margin:0 0 8px;color:#166534;font-size:17px;line-height:1.35;">The person is healthy</h2>
          <p style="margin:0 0 14px;color:#166534;">Choose this if they are safe and can keep receiving the 30-day check-ins themselves.</p>
          ${emailButton({ href: healthyUrl, label: 'The person is healthy', background: '#16a34a' })}
        </div>

        <div style="margin:0 0 16px;border:1px solid #fed7aa;border-radius:8px;background:#fff7ed;padding:16px;">
          <h2 style="margin:0 0 8px;color:#9a3412;font-size:17px;line-height:1.35;">The person is not healthy</h2>
          <p style="margin:0 0 14px;color:#9a3412;">Choose this if they are alive but should not receive the check-ins directly. Future 30-day check-ins will go to trusted contacts instead.</p>
          ${emailButton({ href: unhealthyUrl, label: 'The person is not healthy', background: '#f97316' })}
        </div>

        <div style="margin:0;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;padding:16px;">
          <h2 style="margin:0 0 8px;color:#991b1b;font-size:17px;line-height:1.35;">The person has passed away</h2>
          <p style="margin:0 0 14px;color:#991b1b;">Choose this only when they have passed away. Memory Vault will start delivery to linked recipients.</p>
          ${emailButton({ href: passedUrl, label: 'The person has passed away', background: '#dc2626' })}
        </div>
      `,
    }),
  }
}

export async function sendUserCheckIn(
  payload: Payload,
  user: LegacyCheckInUser,
  origin: string,
  reminder: boolean,
) {
  const email = String(user.email ?? '').trim()

  if (!email) {
    return false
  }

  const { token, tokenHash } = createResponseToken()
  const confirmUrl = new URL(`/api/legacy/check-in/respond?role=user&token=${token}`, origin).toString()
  const message = makeUserCheckInEmail(user, confirmUrl, reminder)
  const now = new Date()

  await payload.sendEmail({
    to: email,
    subject: message.subject,
    text: message.text,
    html: message.html,
  })

  await payload.update({
    collection: 'users',
    id: user.id,
    overrideAccess: true,
    data: {
      legacyCheckInMode: 'user',
      legacyCheckInStage: reminder ? 'user-reminder' : 'user-first',
      legacyCheckInSentAt: now.toISOString(),
      legacyCheckInDueAt: addDays(now, RESPONSE_WINDOW_DAYS).toISOString(),
      legacyCheckInTokenHash: tokenHash,
      legacyTrustedContactTokenHash: null,
    },
  })

  return true
}

export async function sendTrustedContactCheckIn(
  payload: Payload,
  user: LegacyCheckInUser,
  origin: string,
  repeatAfterDays = RESPONSE_WINDOW_DAYS,
) {
  const contacts = (user.legacyProtectionContacts ?? []).filter((contact) => getContactEmail(contact))

  if (contacts.length === 0) {
    return false
  }

  const { token, tokenHash } = createResponseToken()
  const baseUrl = new URL(
    `/api/legacy/check-in/respond?role=trusted&token=${token}`,
    origin,
  ).toString()
  const now = new Date()

  for (const contact of contacts) {
    const email = getContactEmail(contact)

    if (!email) {
      continue
    }

    const message = makeTrustedContactEmail(user, getContactName(contact), baseUrl)
    await payload.sendEmail({
      to: email,
      subject: message.subject,
      text: message.text,
      html: message.html,
    })
  }

  await payload.update({
    collection: 'users',
    id: user.id,
    overrideAccess: true,
    data: {
      legacyCheckInStage: 'trusted-pending',
      legacyCheckInSentAt: now.toISOString(),
      legacyCheckInDueAt: addDays(now, repeatAfterDays).toISOString(),
      legacyCheckInTokenHash: null,
      legacyTrustedContactTokenHash: tokenHash,
    },
  })

  return true
}

export async function runLegacyCheckIns({
  payload,
  origin,
  now = new Date(),
}: {
  payload: Payload
  origin: string
  now?: Date
}) {
  const result = await payload.find({
    collection: 'users',
    overrideAccess: true,
    depth: 2,
    limit: 500,
    where: {
      enableLegacyProtection: { equals: true },
    },
  })

  const summary = {
    usersChecked: result.docs.length,
    userCheckInsSent: 0,
    userRemindersSent: 0,
    trustedCheckInsSent: 0,
    skipped: 0,
  }

  for (const user of result.docs as LegacyCheckInUser[]) {
    const mode = user.legacyCheckInMode ?? 'user'
    const stage = user.legacyCheckInStage ?? 'none'

    if (stage === 'none' && isDue(user.legacyNextCheckInAt, now)) {
      const sent =
        mode === 'trusted'
          ? await sendTrustedContactCheckIn(payload, user, origin, CHECK_IN_INTERVAL_DAYS)
          : await sendUserCheckIn(payload, user, origin, false)

      if (sent && mode === 'trusted') {
        summary.trustedCheckInsSent += 1
      } else if (sent) {
        summary.userCheckInsSent += 1
      } else {
        summary.skipped += 1
      }

      continue
    }

    if (
      (stage === 'user-first' || stage === 'user-reminder') &&
      isDue(user.legacyCheckInDueAt, now)
    ) {
      if (await sendTrustedContactCheckIn(payload, user, origin)) {
        summary.trustedCheckInsSent += 1
      } else {
        summary.skipped += 1
      }

      continue
    }

    if (stage === 'trusted-pending' && mode === 'trusted' && isDue(user.legacyCheckInDueAt, now)) {
      if (await sendTrustedContactCheckIn(payload, user, origin, CHECK_IN_INTERVAL_DAYS)) {
        summary.trustedCheckInsSent += 1
      } else {
        summary.skipped += 1
      }

      continue
    }

    summary.skipped += 1
  }

  return summary
}

export async function handleUserCheckInResponse(payload: Payload, token: string) {
  const result = await payload.find({
    collection: 'users',
    overrideAccess: true,
    depth: 0,
    limit: 1,
    where: {
      and: [
        { enableLegacyProtection: { equals: true } },
        { legacyCheckInTokenHash: { equals: hashDeliveryToken(token) } },
      ],
    },
  })

  const user = result.docs[0]

  if (!user) {
    return false
  }

  const now = new Date()
  await payload.update({
    collection: 'users',
    id: user.id,
    overrideAccess: true,
    data: {
      legacyCheckInMode: 'user',
      legacyCheckInStage: 'none',
      legacyNextCheckInAt: addDays(now, CHECK_IN_INTERVAL_DAYS).toISOString(),
      legacyCheckInSentAt: null,
      legacyCheckInDueAt: null,
      legacyCheckInTokenHash: null,
      legacyTrustedContactTokenHash: null,
      legacyLastConfirmedAt: now.toISOString(),
    },
  })

  return true
}

export async function handleTrustedContactResponse({
  payload,
  token,
  action,
  origin,
}: {
  payload: Payload
  token: string
  action: TrustedAction
  origin: string
}) {
  const result = await payload.find({
    collection: 'users',
    overrideAccess: true,
    depth: 2,
    limit: 1,
    where: {
      and: [
        { enableLegacyProtection: { equals: true } },
        { legacyTrustedContactTokenHash: { equals: hashDeliveryToken(token) } },
      ],
    },
  })

  const user = result.docs[0] as LegacyCheckInUser | undefined

  if (!user) {
    return { handled: false as const, deliveries: [] }
  }

  const now = new Date()

  if (action === 'passed') {
    const deliveries = await createLegacyDeliveriesForUser({
      payload,
      user,
      origin,
    })

    await payload.update({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      data: {
        enableLegacyProtection: false,
        legacyCheckInStage: 'none',
        legacyNextCheckInAt: null,
        legacyCheckInSentAt: null,
        legacyCheckInDueAt: null,
        legacyCheckInTokenHash: null,
        legacyTrustedContactTokenHash: null,
        legacyLastTrustedResponseAt: now.toISOString(),
      },
    })

    return { handled: true as const, deliveries }
  }

  await payload.update({
    collection: 'users',
    id: user.id,
    overrideAccess: true,
    data: {
      legacyCheckInMode: action === 'unhealthy' ? 'trusted' : 'user',
      legacyCheckInStage: 'none',
      legacyNextCheckInAt: addDays(now, CHECK_IN_INTERVAL_DAYS).toISOString(),
      legacyCheckInSentAt: null,
      legacyCheckInDueAt: null,
      legacyCheckInTokenHash: null,
      legacyTrustedContactTokenHash: null,
      legacyLastTrustedResponseAt: now.toISOString(),
    },
  })

  return { handled: true as const, deliveries: [] }
}
