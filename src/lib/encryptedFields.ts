import { decryptTextServer, encryptTextServer, isServerEncrypted } from '@/lib/serverEncryption'

export const ENCRYPTED_MEMORY_TITLE_PLACEHOLDER = 'Encrypted memory'

export function encryptSensitiveText(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return {
      ciphertext: null,
      metadata: null,
    }
  }

  const encrypted = encryptTextServer(trimmed)
  return {
    ciphertext: encrypted.ciphertext,
    metadata: encrypted.metadata,
  }
}

export function decryptSensitiveText(args: {
  ciphertext?: unknown
  fallback?: unknown
  metadata?: unknown
}) {
  if (isServerEncrypted(args.metadata)) {
    const decrypted = decryptTextServer(args.ciphertext, args.metadata).trim()
    if (decrypted) {
      return decrypted
    }
  }

  return String(args.fallback ?? '').trim()
}

export function getMemoryDisplayTitle(memory: any, fallback = 'Untitled memory') {
  const title = decryptSensitiveText({
    ciphertext: memory?.titleCiphertext,
    metadata: memory?.titleEncryptionMetadata,
    fallback:
      String(memory?.title ?? '').trim() === ENCRYPTED_MEMORY_TITLE_PLACEHOLDER
        ? ''
        : memory?.title,
  })

  return title || fallback
}

export function getLovedOneDisplayNote(lovedOne: any) {
  return decryptSensitiveText({
    ciphertext: lovedOne?.customNoteCiphertext,
    metadata: lovedOne?.customNoteEncryptionMetadata,
    fallback: lovedOne?.customNote,
  })
}

export function serializeLovedOneSensitiveFields<T extends Record<string, any>>(lovedOne: T): T {
  return {
    ...lovedOne,
    customNote: getLovedOneDisplayNote(lovedOne),
  }
}
