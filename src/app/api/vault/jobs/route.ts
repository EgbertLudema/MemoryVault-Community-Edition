import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'

export async function GET(req: Request) {
  const user = await getAppUserFromHeaders(req.headers)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'vault-jobs',
    overrideAccess: true,
    depth: 0,
    limit: 10,
    sort: '-requestedAt',
    where: { owner: { equals: user.id } },
  })

  const jobs = (result.docs ?? []).map((job: any) => ({
    id: job.id,
    type: job.type,
    status: job.status,
    summary: job.summary ?? null,
    errorMessage: job.errorMessage ?? null,
    requestedAt: job.requestedAt,
    completedAt: job.completedAt ?? null,
    expiresAt: job.expiresAt ?? null,
    downloadAvailable: job.type === 'export' && job.status === 'completed',
  }))

  return NextResponse.json({ jobs })
}
