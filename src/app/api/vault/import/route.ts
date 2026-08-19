import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { encryptBufferServer } from '@/lib/serverEncryption'

const MAX_IMPORT_BYTES = 2 * 1024 * 1024 * 1024

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
        { type: { equals: 'import' } },
        { status: { in: ['queued', 'processing'] } },
      ],
    },
  })

  if (existing.docs.length > 0) {
    return NextResponse.json({ error: 'An import is already in progress' }, { status: 409 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A .zip archive is required' }, { status: 400 })
    }

    const looksLikeZip = file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip'
    if (!looksLikeZip) {
      return NextResponse.json({ error: 'File must be a .zip archive' }, { status: 400 })
    }

    if (file.size > MAX_IMPORT_BYTES) {
      return NextResponse.json({ error: 'Archive is too large' }, { status: 413 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const encrypted = encryptBufferServer(Buffer.from(arrayBuffer), 'application/zip')

    const sourceMedia = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: {
        purpose: 'vault-archive',
        isEncrypted: true,
        encryptionMetadata: encrypted.metadata,
        ownerUser: user.id,
      },
      file: {
        name: 'vault-import.encrypted.bin',
        data: encrypted.data,
        mimetype: 'application/octet-stream',
        size: encrypted.data.length,
      },
    })

    const job = await payload.create({
      collection: 'vault-jobs',
      overrideAccess: true,
      data: {
        type: 'import',
        status: 'queued',
        owner: user.id,
        sourceMedia: sourceMedia.id,
        requestedAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({ job }, { status: 202 })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to start import'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
