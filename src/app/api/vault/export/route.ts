import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'

export async function POST(req: Request) {
  const user = await getAppUserFromHeaders(req.headers)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'vault-jobs',
    overrideAccess: true,
    depth: 0,
    limit: 1,
    where: {
      and: [
        { owner: { equals: user.id } },
        { type: { equals: 'export' } },
        { status: { in: ['queued', 'processing'] } },
      ],
    },
  })

  if (existing.docs.length > 0) {
    return NextResponse.json({ job: existing.docs[0] }, { status: 202 })
  }

  const job = await payload.create({
    collection: 'vault-jobs',
    overrideAccess: true,
    data: {
      type: 'export',
      status: 'queued',
      owner: user.id,
      requestedAt: new Date().toISOString(),
    },
  })

  return NextResponse.json({ job }, { status: 202 })
}
