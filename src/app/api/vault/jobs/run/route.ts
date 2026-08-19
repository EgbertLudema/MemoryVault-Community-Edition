import { NextResponse } from 'next/server'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import crypto from 'crypto'
import { buildVaultExportZip, applyVaultImportZip } from '@/lib/vaultTransfer'
import { decryptBufferServer, encryptBufferServer, isServerEncrypted } from '@/lib/serverEncryption'
import { getMediaFileUrl } from '@/lib/mediaAccess'
import { hashDeliveryToken } from '@/lib/legacyDelivery'
import { emailButton, escapeHtml, renderBrandedEmail } from '@/lib/emailTemplate'

export const maxDuration = 300

const EXPORT_RETENTION_DAYS = 7
const MAX_JOBS_PER_RUN = 3

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

function ownerIdOf(job: any) {
  return typeof job.owner === 'object' ? job.owner?.id : job.owner
}

function ownerEmailOf(job: any) {
  return typeof job.owner === 'object' ? job.owner?.email : null
}

async function fetchDecryptedMediaBuffer(media: any) {
  const fileUrl = getMediaFileUrl(media)
  if (!fileUrl) {
    return null
  }

  const upstream = await fetch(fileUrl, { cache: 'no-store' })

  if (!upstream.ok) {
    throw new Error('Failed to load archive from storage')
  }

  const buffer = Buffer.from(await upstream.arrayBuffer())

  return isServerEncrypted(media.encryptionMetadata)
    ? decryptBufferServer(buffer, media.encryptionMetadata)
    : buffer
}

async function processExportJob(payload: Payload, job: any, origin: string) {
  const ownerId = Number(ownerIdOf(job))
  const { zipBuffer, summary } = await buildVaultExportZip(payload, ownerId)
  const encrypted = encryptBufferServer(zipBuffer, 'application/zip')

  const resultMedia = await payload.create({
    collection: 'media',
    overrideAccess: true,
    data: {
      purpose: 'vault-archive',
      isEncrypted: true,
      encryptionMetadata: encrypted.metadata,
      ownerUser: ownerId,
    },
    file: {
      name: 'vault-export.encrypted.bin',
      data: encrypted.data,
      mimetype: 'application/octet-stream',
      size: encrypted.data.length,
    },
  })

  const token = crypto.randomBytes(24).toString('base64url')
  const tokenHash = hashDeliveryToken(token)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000)

  await payload.update({
    collection: 'vault-jobs',
    id: job.id,
    overrideAccess: true,
    data: {
      status: 'completed',
      resultMedia: resultMedia.id,
      tokenHash,
      summary,
      completedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    },
  })

  const email = ownerEmailOf(job)
  if (!email) {
    return
  }

  const downloadUrl = new URL(`/api/vault/export/${job.id}/download?token=${token}`, origin).toString()

  await payload.sendEmail({
    to: email,
    subject: 'Your MemoryVault export is ready',
    text: `Your MemoryVault export is ready to download: ${downloadUrl}\n\nThis link expires in ${EXPORT_RETENTION_DAYS} days.`,
    html: renderBrandedEmail({
      eyebrow: 'Vault export',
      title: 'Your export is ready',
      preview: 'Your MemoryVault export archive is ready to download.',
      body: `
        <p style="margin:0 0 16px;">Your MemoryVault export is ready. It includes your memories, loved ones, photos and videos, Open When messages, and checklist data.</p>
        <p style="margin:0 0 22px;color:#57534e;">This link expires in ${EXPORT_RETENTION_DAYS} days.</p>
        <p style="margin:0;">${emailButton({ href: downloadUrl, label: 'Download your export' })}</p>
      `,
      footerText: 'Memory Vault sends this because you requested a vault export.',
    }),
  })
}

async function processImportJob(payload: Payload, job: any) {
  const ownerId = Number(ownerIdOf(job))
  const sourceMedia =
    typeof job.sourceMedia === 'object'
      ? job.sourceMedia
      : await payload.findByID({ collection: 'media', id: job.sourceMedia, overrideAccess: true })

  const zipBuffer = await fetchDecryptedMediaBuffer(sourceMedia)

  if (!zipBuffer) {
    throw new Error('Import archive could not be loaded')
  }

  const ownerDoc =
    typeof job.owner === 'object'
      ? job.owner
      : await payload.findByID({ collection: 'users', id: ownerId, overrideAccess: true })

  const { summary, stoppedReason } = await applyVaultImportZip(payload, ownerId, zipBuffer, ownerDoc)

  await payload.update({
    collection: 'vault-jobs',
    id: job.id,
    overrideAccess: true,
    data: {
      status: 'completed',
      summary,
      errorMessage: stoppedReason ?? undefined,
      completedAt: new Date().toISOString(),
    },
  })

  const email = ownerDoc?.email
  if (!email) {
    return
  }

  const summaryText = `Imported ${summary.memories} memories, ${summary.lovedOnes} loved ones, ${summary.media} media files, ${summary.openWhenMessages} Open When messages, and ${summary.digitalLegacyItems} checklist items.`

  await payload.sendEmail({
    to: email,
    subject: stoppedReason
      ? 'Your MemoryVault import finished with some items skipped'
      : 'Your MemoryVault import is complete',
    text: stoppedReason ? `${summaryText}\n\n${stoppedReason}` : summaryText,
    html: renderBrandedEmail({
      eyebrow: 'Vault import',
      title: stoppedReason ? 'Import finished with items skipped' : 'Your import is complete',
      preview: summaryText,
      body: `
        <p style="margin:0 0 16px;">${escapeHtml(summaryText)}</p>
        ${stoppedReason ? `<p style="margin:0;color:#92400e;">${escapeHtml(stoppedReason)}</p>` : ''}
      `,
      footerText: 'Memory Vault sends this because you requested a vault import.',
    }),
  })
}

async function notifyFailure(payload: Payload, job: any, message: string) {
  const email = ownerEmailOf(job)
  if (!email) {
    return
  }

  const label = job.type === 'export' ? 'export' : 'import'

  await payload
    .sendEmail({
      to: email,
      subject: `Your MemoryVault ${label} failed`,
      text: `We couldn't finish your ${label}: ${message}. Please try again, and contact support if this keeps happening.`,
      html: renderBrandedEmail({
        eyebrow: job.type === 'export' ? 'Vault export' : 'Vault import',
        title: 'Something went wrong',
        body: `<p style="margin:0;">We couldn't finish your ${label}. Please try again, and contact support if this keeps happening.</p>`,
      }),
    })
    .catch((error) => console.warn('Failed to send vault job failure email', error))
}

async function expireOldExports(payload: Payload) {
  const expired = await payload.find({
    collection: 'vault-jobs',
    overrideAccess: true,
    depth: 0,
    limit: 50,
    where: {
      and: [
        { status: { equals: 'completed' } },
        { type: { equals: 'export' } },
        { expiresAt: { less_than: new Date().toISOString() } },
      ],
    },
  })

  for (const job of expired.docs ?? []) {
    const mediaId = typeof (job as any).resultMedia === 'object' ? (job as any).resultMedia?.id : (job as any).resultMedia

    if (mediaId) {
      await payload.delete({ collection: 'media', id: mediaId, overrideAccess: true }).catch(() => {})
    }

    await payload.update({
      collection: 'vault-jobs',
      id: job.id,
      overrideAccess: true,
      data: { status: 'expired', resultMedia: null },
    })
  }
}

async function run(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config })
  const origin = getOrigin(req)

  const queued = await payload.find({
    collection: 'vault-jobs',
    overrideAccess: true,
    depth: 1,
    limit: MAX_JOBS_PER_RUN,
    sort: 'requestedAt',
    where: { status: { equals: 'queued' } },
  })

  const results: Array<{ id: number | string; status: string }> = []

  for (const job of queued.docs ?? []) {
    await payload.update({
      collection: 'vault-jobs',
      id: job.id,
      overrideAccess: true,
      data: { status: 'processing', startedAt: new Date().toISOString() },
    })

    try {
      if (job.type === 'export') {
        await processExportJob(payload, job, origin)
      } else {
        await processImportJob(payload, job)
      }

      results.push({ id: job.id, status: 'completed' })
    } catch (error) {
      console.error('Vault job failed', job.id, error)
      const message = error instanceof Error ? error.message : 'Unknown error'

      await payload.update({
        collection: 'vault-jobs',
        id: job.id,
        overrideAccess: true,
        data: { status: 'failed', errorMessage: message, completedAt: new Date().toISOString() },
      })

      await notifyFailure(payload, job, message)
      results.push({ id: job.id, status: 'failed' })
    } finally {
      if (job.type === 'import') {
        const sourceMediaId =
          typeof job.sourceMedia === 'object' ? job.sourceMedia?.id : job.sourceMedia

        if (sourceMediaId) {
          await payload
            .delete({ collection: 'media', id: sourceMediaId, overrideAccess: true })
            .catch(() => {})
        }
      }
    }
  }

  await expireOldExports(payload)

  return NextResponse.json({ processed: results.length, results })
}

export async function GET(req: Request) {
  return run(req)
}

export async function POST(req: Request) {
  return run(req)
}
