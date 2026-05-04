import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { REST_POST } from '@payloadcms/next/routes'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { encryptBufferServer } from '@/lib/serverEncryption'

const payloadPost = REST_POST(config)

export async function POST(req: Request) {
  const user = await getAppUserFromHeaders(req.headers)

  if (!user) {
    return payloadPost(req, {
      params: Promise.resolve({
        slug: ['media'],
      }),
    } as any)
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const poster = formData.get('poster')
    const alt = String(formData.get('alt') ?? '').trim()
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A file is required' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const encryptedFile = encryptBufferServer(
      Buffer.from(arrayBuffer),
      file.type || 'application/octet-stream',
    )
    const payloadFile = {
      name: file.name,
      data: encryptedFile.data,
      mimetype: 'application/octet-stream',
      size: encryptedFile.data.length,
    }

    const payload = await getPayload({ config })
    const doc = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: {
        alt: alt || undefined,
        isEncrypted: true,
        encryptionMetadata: encryptedFile.metadata,
      },
      file: payloadFile,
      user,
    })

    let posterUrl: string | undefined

    if (file.type.startsWith('video/') && poster instanceof File) {
      const posterArrayBuffer = await poster.arrayBuffer()
      const encryptedPoster = encryptBufferServer(Buffer.from(posterArrayBuffer), poster.type || 'image/jpeg')
      const posterPayloadFile = {
        name: poster.name,
        data: encryptedPoster.data,
        mimetype: 'application/octet-stream',
        size: encryptedPoster.data.length,
      }

      const posterDoc = await payload.create({
        collection: 'media',
        overrideAccess: true,
        data: {
          alt: alt || `${file.name} poster`,
          isEncrypted: true,
          encryptionMetadata: encryptedPoster.metadata,
        },
        file: posterPayloadFile,
        user,
      })

      posterUrl = typeof posterDoc?.url === 'string' ? posterDoc.url : undefined

      if (posterUrl) {
        await payload.update({
          collection: 'media',
          id: doc.id,
          overrideAccess: true,
          data: {
            posterUrl,
            posterEncryptionMetadata: encryptedPoster.metadata,
          },
          user,
        })
      }
    }

    return NextResponse.json(
      {
        doc: {
          ...doc,
          posterUrl: posterUrl ?? (typeof doc?.posterUrl === 'string' ? doc.posterUrl : undefined),
          posterEncryptionMetadata:
            typeof doc?.posterEncryptionMetadata === 'object'
              ? doc.posterEncryptionMetadata
              : undefined,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Failed to upload media'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
