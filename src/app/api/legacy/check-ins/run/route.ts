import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { runLegacyCheckIns } from '@/lib/legacyCheckIns'

function getOrigin(req: Request) {
  const fromEnv = process.env.NEXT_PUBLIC_SERVER_URL || process.env.PAYLOAD_URL

  if (fromEnv) {
    return fromEnv.replace(/\/$/, '')
  }

  return new URL(req.url).origin
}

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET

  if (!secret) {
    return process.env.NODE_ENV !== 'production'
  }

  const header = req.headers.get('authorization') ?? ''
  return header === `Bearer ${secret}`
}

async function run(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config })
  const summary = await runLegacyCheckIns({
    payload,
    origin: getOrigin(req),
  })

  return NextResponse.json({ summary })
}

export async function GET(req: Request) {
  return run(req)
}

export async function POST(req: Request) {
  return run(req)
}
