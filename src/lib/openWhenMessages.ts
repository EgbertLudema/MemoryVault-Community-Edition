import { decryptSensitiveText, encryptSensitiveText } from '@/lib/encryptedFields'

export const ENCRYPTED_OPEN_WHEN_TITLE_PLACEHOLDER = 'Encrypted Open When message'
export const ENCRYPTED_OPEN_WHEN_TEXT_PLACEHOLDER = 'Encrypted Open When prompt'
export const ENCRYPTED_OPEN_WHEN_MESSAGE_PLACEHOLDER = 'Encrypted Open When body'

export function encryptOpenWhenFields(args: {
  title: string
  openWhenText: string
  message: string
}) {
  const encryptedTitle = encryptSensitiveText(args.title)
  const encryptedOpenWhenText = encryptSensitiveText(args.openWhenText)
  const encryptedMessage = encryptSensitiveText(args.message)

  return {
    title: ENCRYPTED_OPEN_WHEN_TITLE_PLACEHOLDER,
    titleCiphertext: encryptedTitle.ciphertext,
    titleEncryptionMetadata: encryptedTitle.metadata,
    openWhenText: ENCRYPTED_OPEN_WHEN_TEXT_PLACEHOLDER,
    openWhenTextCiphertext: encryptedOpenWhenText.ciphertext,
    openWhenTextEncryptionMetadata: encryptedOpenWhenText.metadata,
    message: ENCRYPTED_OPEN_WHEN_MESSAGE_PLACEHOLDER,
    messageCiphertext: encryptedMessage.ciphertext,
    messageEncryptionMetadata: encryptedMessage.metadata,
  }
}

export function serializeOpenWhenMessage<T extends Record<string, any>>(doc: T): T & {
  dateReached: boolean
} {
  const triggerDate = doc?.triggerDate ? new Date(String(doc.triggerDate)) : null
  const dateReached = Boolean(
    triggerDate &&
      !Number.isNaN(triggerDate.getTime()) &&
      triggerDate.getTime() <= Date.now() &&
      !doc?.allowSendWhileActive &&
      !doc?.sentAt,
  )

  return {
    ...doc,
    title: decryptSensitiveText({
      ciphertext: doc?.titleCiphertext,
      metadata: doc?.titleEncryptionMetadata,
      fallback:
        String(doc?.title ?? '').trim() === ENCRYPTED_OPEN_WHEN_TITLE_PLACEHOLDER
          ? ''
          : doc?.title,
    }),
    openWhenText: decryptSensitiveText({
      ciphertext: doc?.openWhenTextCiphertext,
      metadata: doc?.openWhenTextEncryptionMetadata,
      fallback:
        String(doc?.openWhenText ?? '').trim() === ENCRYPTED_OPEN_WHEN_TEXT_PLACEHOLDER
          ? ''
          : doc?.openWhenText,
    }),
    message: decryptSensitiveText({
      ciphertext: doc?.messageCiphertext,
      metadata: doc?.messageEncryptionMetadata,
      fallback:
        String(doc?.message ?? '').trim() === ENCRYPTED_OPEN_WHEN_MESSAGE_PLACEHOLDER
          ? ''
          : doc?.message,
    }),
    dateReached,
  }
}
