import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { sendTrustedContactCheckIn, type LegacyCheckInUser } from '@/lib/legacyCheckIns'

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
      { error: 'Enable legacy protection before sending a trusted contact test email.' },
      { status: 400 },
    )
  }

  try {
    const payload = await getPayload({ config })
    const userResult = await payload.findByID({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      depth: 2,
    })
    const sent = await sendTrustedContactCheckIn(
      payload,
      userResult as LegacyCheckInUser,
      getOrigin(req),
      30,
    )

    if (!sent) {
      return NextResponse.json(
        { error: 'No trusted contacts with email addresses were found.' },
        { status: 400 },
      )
    }

    return NextResponse.json({ message: 'Test trusted contact email sent' })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to send trusted contact test email'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
