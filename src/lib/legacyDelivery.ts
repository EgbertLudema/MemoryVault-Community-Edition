import crypto from 'crypto'

type LegacyRecipientInput = {
  id: number | string
  fullName?: string | null
  nickname?: string | null
  email?: string | null
  groups?: Array<number | string | { id?: number | string | null } | null> | null
}

type LegacyMemoryInput = {
  id: number | string
  groups?: Array<number | string | { id?: number | string | null } | null> | null
  lovedOnes?: Array<number | string | { id?: number | string | null } | null> | null
}

export type ResolvedLegacyRecipient = {
  lovedOneId: number
  recipientName: string
  recipientEmail: string | null
  memoryIds: number[]
}

function toNumberId(value: unknown) {
  const raw = String(
    typeof value === 'object' && value && 'id' in value ? (value as { id?: unknown }).id : value,
  ).trim()

  if (!/^\d+$/.test(raw)) {
    return NaN
  }

  return Number(raw)
}

function pickRecipientName(recipient: LegacyRecipientInput) {
  const nickname = String(recipient.nickname ?? '').trim()
  if (nickname) {
    return nickname
  }

  const fullName = String(recipient.fullName ?? '').trim()
  if (fullName) {
    return fullName
  }

  return `Loved one #${recipient.id}`
}

function extractIds(values: Array<number | string | { id?: number | string | null } | null> | null | undefined) {
  return (values ?? [])
    .map((value) => toNumberId(value))
    .filter((value) => Number.isFinite(value))
}

export function createDeliveryToken() {
  const token = crypto.randomBytes(24).toString('base64url')
  return {
    token,
    tokenHash: hashDeliveryToken(token),
  }
}

export function hashDeliveryToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function createDeliveryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const password = Array.from(
    { length: 12 },
    () => alphabet[crypto.randomInt(alphabet.length)],
  ).join('')

  return `${password.slice(0, 4)}-${password.slice(4, 8)}-${password.slice(8, 12)}`
}

function normalizeDeliveryPassword(password: string) {
  return password.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function hashDeliveryPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('base64url')
  const hash = crypto.scryptSync(normalizeDeliveryPassword(password), salt, 64).toString('base64url')

  return `scrypt$${salt}$${hash}`
}

export function verifyDeliveryPassword(password: string, storedHash: string | null | undefined) {
  const parts = String(storedHash ?? '').split('$')

  if (parts.length !== 3 || parts[0] !== 'scrypt' || !parts[1] || !parts[2]) {
    return false
  }

  const [, salt, expectedHash] = parts
  let actual: Buffer
  let expected: Buffer

  try {
    actual = crypto.scryptSync(normalizeDeliveryPassword(password), salt, 64)
    expected = Buffer.from(expectedHash, 'base64url')
  } catch {
    return false
  }

  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected)
}

export function toAbsoluteAssetUrl(origin: string, url: string | null | undefined) {
  const safeUrl = String(url ?? '').trim()
  if (!safeUrl) {
    return ''
  }

  if (/^https?:\/\//i.test(safeUrl)) {
    return safeUrl
  }

  return `${origin.replace(/\/$/, '')}/${safeUrl.replace(/^\//, '')}`
}

export function resolveLegacyRecipients(
  lovedOnes: LegacyRecipientInput[],
  memories: LegacyMemoryInput[],
): ResolvedLegacyRecipient[] {
  return lovedOnes
    .map((lovedOne) => {
      const lovedOneId = toNumberId(lovedOne.id)
      if (!Number.isFinite(lovedOneId)) {
        return null
      }

      const lovedOneGroupIds = new Set(extractIds(lovedOne.groups))
      const memoryIds = memories
        .filter((memory) => {
          const directLovedOneIds = new Set(extractIds(memory.lovedOnes))
          if (directLovedOneIds.has(lovedOneId)) {
            return true
          }

          const memoryGroupIds = extractIds(memory.groups)
          return memoryGroupIds.some((groupId) => lovedOneGroupIds.has(groupId))
        })
        .map((memory) => toNumberId(memory.id))
        .filter((value) => Number.isFinite(value))

      if (memoryIds.length === 0) {
        return null
      }

      return {
        lovedOneId,
        recipientName: pickRecipientName(lovedOne),
        recipientEmail: String(lovedOne.email ?? '').trim() || null,
        memoryIds: Array.from(new Set(memoryIds)),
      }
    })
    .filter((recipient): recipient is ResolvedLegacyRecipient => Boolean(recipient))
}
