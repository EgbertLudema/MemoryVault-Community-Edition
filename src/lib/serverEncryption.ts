import crypto from 'crypto'

type ServerEnvelope = {
  mode: 'server'
  v: 1
  alg: 'AES-256-GCM'
  iv: string
  tag: string
  originalType?: string
}

function getKey() {
  const raw =
    process.env.APP_ENCRYPTION_KEY ||
    process.env.PAYLOAD_SECRET ||
    'memory-vault-development-encryption-key'

  return crypto.createHash('sha256').update(raw).digest()
}

export function isServerEncrypted(metadata: unknown): metadata is ServerEnvelope {
  return Boolean(
    metadata &&
      typeof metadata === 'object' &&
      (metadata as { mode?: unknown }).mode === 'server',
  )
}

export function encryptBufferServer(data: Buffer, originalType?: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    data: encrypted,
    metadata: {
      mode: 'server' as const,
      v: 1 as const,
      alg: 'AES-256-GCM' as const,
      iv: iv.toString('base64url'),
      tag: tag.toString('base64url'),
      originalType,
    },
  }
}

export function decryptBufferServer(data: Buffer, metadata: unknown) {
  if (!isServerEncrypted(metadata)) {
    return data
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getKey(),
    Buffer.from(metadata.iv, 'base64url'),
  )
  decipher.setAuthTag(Buffer.from(metadata.tag, 'base64url'))

  return Buffer.concat([decipher.update(data), decipher.final()])
}

export function encryptTextServer(value: string) {
  const encrypted = encryptBufferServer(Buffer.from(value, 'utf8'), 'text/plain')
  return {
    ciphertext: encrypted.data.toString('base64url'),
    metadata: encrypted.metadata,
  }
}

export function decryptTextServer(ciphertext: unknown, metadata: unknown) {
  const raw = String(ciphertext ?? '').trim()
  if (!raw) {
    return ''
  }

  try {
    return decryptBufferServer(Buffer.from(raw, 'base64url'), metadata).toString('utf8')
  } catch {
    return ''
  }
}
