import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

/**
 * Serves files written by Payload's built-in local-disk upload storage
 * (active when STORAGE_DRIVER=local - no storage plugin registered, see
 * payload.config.ts). Only ever called server-to-server by routes that
 * already did their own ownership check via getOwnedMediaBlobFromHeaders;
 * this route itself just resolves a filename to bytes, same security
 * posture as the "public but unguessable + encrypted" S3/Blob URLs used by
 * the other storage drivers.
 */
export async function GET(_req: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params
  const safeName = String(filename ?? '')

  if (!safeName || safeName.includes('/') || safeName.includes('\\') || safeName.includes('..')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const filePath = path.join(process.cwd(), 'media', safeName)
    const data = await fs.readFile(filePath)

    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        'content-type': 'application/octet-stream',
        'content-length': String(data.length),
        'cache-control': 'private, max-age=300',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
