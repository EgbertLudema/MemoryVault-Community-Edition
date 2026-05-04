import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { sendUserCheckIn, type LegacyCheckInUser } from '@/lib/legacyCheckIns'

function getOrigin(req: Request) {
  const fromEnv = process.env.NEXT_PUBLIC_SERVER_URL || process.env.PAYLOAD_URL

  if (fromEnv) {
    return fromEnv.replace(/\/$/, '')
  }

  return new URL(req.url).origin
}

export async function POST(req: Request) {
  const user = await getAppUserFromHeaders(req.headers)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!user.enableLegacyProtection) {
    return NextResponse.json(
      { error: 'Enable legacy protection before sending a test check-in email.' },
      { status: 400 },
    )
  }

  try {
    const payload = await getPayload({ config })
    const sent = await sendUserCheckIn(payload, user as LegacyCheckInUser, getOrigin(req), false)

    if (!sent) {
      return NextResponse.json({ error: 'No email address found for this account.' }, { status: 400 })
    }

    return NextResponse.json({ message: `Test check-in email sent to ${user.email}` })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send test check-in email'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
