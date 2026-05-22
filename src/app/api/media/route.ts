import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { REST_POST } from '@payloadcms/next/routes'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { encryptBufferServer } from '@/lib/serverEncryption'
import {
  formatUploadBytes,
  getUploadKindForMimeType,
  getUploadLimitForMimeType,
} from '@/lib/uploadLimits'

const payloadPost = REST_POST(config)

function toEncryptedBlobName(fileName: string) {
  const safeName = fileName.trim() || 'upload'
  const baseName = safeName.replace(/\.[^./\\]+$/, '') || 'upload'

  return `${baseName}.encrypted.bin`
}

function uploadLimitError(file: File) {
  const limit = getUploadLimitForMimeType(file.type)
  const limitLabel = limit === null ? null : formatUploadBytes(limit)
  const actualLabel = formatUploadBytes(file.size)

  return {
    error:
      limitLabel === null
        ? 'Unsupported file type. Upload an image or video file.'
        : `File is too large. Choose a file up to ${limitLabel}. This file is ${actualLabel}.`,
    code: limitLabel === null ? 'UPLOAD_UNSUPPORTED_TYPE' : 'UPLOAD_FILE_TOO_LARGE',
    limitBytes: limit,
    actualBytes: file.size,
  }
}

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
    const posterFile = poster instanceof File ? poster : null
    const videoPosterFile = file instanceof File && file.type.startsWith('video/') ? posterFile : null
    const alt = String(formData.get('alt') ?? '').trim()
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A file is required' }, { status: 400 })
    }

    const uploadKind = getUploadKindForMimeType(file.type)
    const uploadLimit = getUploadLimitForMimeType(file.type)

    if (!uploadKind || uploadLimit === null) {
      return NextResponse.json(uploadLimitError(file), { status: 400 })
    }

    if (file.size > uploadLimit) {
      return NextResponse.json(uploadLimitError(file), { status: 413 })
    }

    if (videoPosterFile) {
      const posterKind = getUploadKindForMimeType(videoPosterFile.type)
      const posterLimit = getUploadLimitForMimeType(videoPosterFile.type)

      if (posterKind !== 'image' || posterLimit === null) {
        return NextResponse.json({ error: 'Video poster must be an image file' }, { status: 400 })
      }

      if (videoPosterFile.size > posterLimit) {
        return NextResponse.json(uploadLimitError(videoPosterFile), { status: 413 })
      }
    }

    const arrayBuffer = await file.arrayBuffer()
    const encryptedFile = encryptBufferServer(
      Buffer.from(arrayBuffer),
      file.type || 'application/octet-stream',
    )
    const payloadFile = {
      name: toEncryptedBlobName(file.name),
      data: encryptedFile.data,
      mimetype: 'application/octet-stream',
      size: encryptedFile.data.length,
    }
    let encryptedPoster: ReturnType<typeof encryptBufferServer> | null = null

    if (videoPosterFile) {
      const posterArrayBuffer = await videoPosterFile.arrayBuffer()
      encryptedPoster = encryptBufferServer(Buffer.from(posterArrayBuffer), videoPosterFile.type || 'image/jpeg')
    }

    const payload = await getPayload({ config })
    const doc = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: {
        alt: alt || undefined,
        isEncrypted: true,
        encryptionMetadata: encryptedFile.metadata,
        ownerUser: Number(user.id),
      },
      file: payloadFile,
      user,
    })

    let posterUrl: string | undefined

    if (videoPosterFile && encryptedPoster) {
      const posterPayloadFile = {
        name: toEncryptedBlobName(videoPosterFile.name),
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
          ownerUser: Number(user.id),
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
