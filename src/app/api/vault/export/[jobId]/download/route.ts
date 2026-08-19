import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { getMediaFileUrl } from '@/lib/mediaAccess'
import { buildVaultOwnerExportFilename } from '@/lib/exportArchive'
import { hashDeliveryToken } from '@/lib/legacyDelivery'
import { decryptBufferServer, isServerEncrypted } from '@/lib/serverEncryption'

function toNumberId(value: unknown) {
  const raw = String(value ?? '').trim()

  if (!/^\d+$/.test(raw)) {
    return NaN
  }

  return Number(raw)
}

async function isAuthorizedForJob(req: Request, job: any, token: string) {
  if (job.tokenHash && token) {
    const expected = Buffer.from(hashDeliveryToken(token))
    const actual = Buffer.from(String(job.tokenHash))

    if (expected.length === actual.length && crypto.timingSafeEqual(expected, actual)) {
      return true
    }
  }

  const user = await getAppUserFromHeaders(req.headers)
  const ownerId = typeof job.owner === 'object' ? job.owner?.id : job.owner

  return Boolean(user && Number(user.id) === Number(ownerId))
}

export async function GET(req: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params
  const id = toNumberId(jobId)

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const url = new URL(req.url)
  const token = url.searchParams.get('token') ?? ''

  const payload = await getPayload({ config })
  const job = await payload
    .findByID({ collection: 'vault-jobs', id, overrideAccess: true, depth: 1 })
    .catch(() => null)

  if (!job || job.type !== 'export' || job.status !== 'completed') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (job.expiresAt && new Date(String(job.expiresAt)).getTime() < Date.now()) {
    return NextResponse.json({ error: 'This export link has expired' }, { status: 410 })
  }

  if (!(await isAuthorizedForJob(req, job, token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const media = typeof job.resultMedia === 'object' ? (job.resultMedia as any) : null
  const fileUrl = media ? getMediaFileUrl(media) : null

  if (!media || !fileUrl) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const upstream = await fetch(fileUrl, { cache: 'no-store' })

  if (!upstream.ok) {
    return NextResponse.json({ error: 'Failed to load archive' }, { status: 500 })
  }

  const buffer = Buffer.from(await upstream.arrayBuffer())
  const decrypted = isServerEncrypted(media.encryptionMetadata)
    ? decryptBufferServer(buffer, media.encryptionMetadata)
    : buffer

  const owner = typeof job.owner === 'object' ? (job.owner as any) : null
  const ownerName = [owner?.firstName, owner?.lastName].filter(Boolean).join(' ').trim()
  const filenameOut = buildVaultOwnerExportFilename(ownerName)

  return new Response(decrypted, {
    status: 200,
    headers: {
      'content-type': 'application/zip',
      'content-length': String(decrypted.length),
      'content-disposition': `attachment; filename="${filenameOut}"`,
      'cache-control': 'private, no-store',
    },
  })
}
