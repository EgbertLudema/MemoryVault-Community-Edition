import type { Payload } from 'payload'
import {
  buildExportMediaPath,
  createZip,
  readZip,
  type ZipEntry,
} from '@/lib/exportArchive'
import { getMediaFileUrl, getPosterFileUrl } from '@/lib/mediaAccess'
import { decryptBufferServer, encryptBufferServer, isServerEncrypted } from '@/lib/serverEncryption'
import {
  decryptSensitiveText,
  encryptSensitiveText,
  getLovedOneDisplayEmail,
  getLovedOneDisplayNote,
  getMemoryDisplayTitle,
  ENCRYPTED_MEMORY_TITLE_PLACEHOLDER,
} from '@/lib/encryptedFields'
import { encryptOpenWhenFields, serializeOpenWhenMessage } from '@/lib/openWhenMessages'
import { encryptDigitalLegacyItemFields, serializeDigitalLegacyItem } from '@/lib/digitalLegacy'
import { getMemoryContentItemLimit, getMemoryCountLimit } from '@/lib/memoryLimits'
import { getLovedOneCountLimit } from '@/lib/lovedOneLimits'
import { getOpenWhenMessageCountLimit } from '@/lib/openWhenLimits'
import { getStorageByteLimit, isWithinStorageLimit } from '@/lib/storageLimits'
import { getUserStorageUsageBytes } from '@/lib/storageUsageServer'

// Kept local (not imported from '@/lib/entitlements') so this file - which ships to
// Community Edition - has no dependency on the cloud-only entitlements module.
export type VaultTransferBillingState = {
  subscriptionPlan?: string | null
  subscriptionStatus?: string | null
}

export const VAULT_EXPORT_SCHEMA_VERSION = 1

export type VaultTransferSummary = {
  lovedOneGroups: number
  lovedOnes: number
  memories: number
  media: number
  openWhenMessages: number
  digitalLegacyItems: number
}

function emptySummary(): VaultTransferSummary {
  return {
    lovedOneGroups: 0,
    lovedOnes: 0,
    memories: 0,
    media: 0,
    openWhenMessages: 0,
    digitalLegacyItems: 0,
  }
}

function toId(value: unknown) {
  const raw =
    typeof value === 'object' && value && 'id' in (value as Record<string, unknown>)
      ? (value as { id?: unknown }).id
      : value
  const numeric = Number(String(raw ?? '').trim())
  return Number.isFinite(numeric) ? numeric : null
}

function toIds(values: unknown): number[] {
  if (!Array.isArray(values)) {
    return []
  }
  return values.map((value) => toId(value)).filter((value): value is number => value !== null)
}

async function findAllOwned(
  payload: Payload,
  collection: string,
  ownerField: string,
  ownerId: number,
  depth: number,
) {
  const docs: any[] = []
  let page = 1

  while (true) {
    const result = await payload.find({
      collection: collection as any,
      overrideAccess: true,
      depth,
      limit: 100,
      page,
      where: { [ownerField]: { equals: ownerId } },
    })

    docs.push(...(result.docs ?? []))

    if (!result.hasNextPage) {
      return docs
    }

    page += 1
  }
}

async function fetchBlobBuffer(fileUrl: string) {
  const upstream = await fetch(fileUrl, { cache: 'no-store' })

  if (!upstream.ok) {
    throw new Error(`Failed to fetch blob at ${fileUrl}`)
  }

  return Buffer.from(await upstream.arrayBuffer())
}

async function loadDecryptedMediaBuffer(media: any) {
  const fileUrl = getMediaFileUrl(media)
  if (!fileUrl) {
    return null
  }

  const buffer = await fetchBlobBuffer(fileUrl)
  const encryptionMetadata = media?.encryptionMetadata

  return isServerEncrypted(encryptionMetadata)
    ? decryptBufferServer(buffer, encryptionMetadata)
    : buffer
}

async function loadDecryptedPosterBuffer(media: any) {
  const fileUrl = getPosterFileUrl(media)
  if (!fileUrl) {
    return null
  }

  const buffer = await fetchBlobBuffer(fileUrl)
  const encryptionMetadata = media?.posterEncryptionMetadata

  return isServerEncrypted(encryptionMetadata)
    ? decryptBufferServer(buffer, encryptionMetadata)
    : buffer
}

/**
 * Builds the full vault export archive for one user: a data.json describing every
 * owned record (with sensitive fields decrypted to plaintext) plus the original
 * media/poster bytes, zipped and then re-encrypted as a whole for storage at rest.
 */
export async function buildVaultExportZip(payload: Payload, ownerId: number) {
  const [userDoc, groups, lovedOnes, memories, openWhenMessages, digitalLegacyItems] =
    await Promise.all([
      payload.findByID({ collection: 'users', id: ownerId, overrideAccess: true, depth: 0 }),
      findAllOwned(payload, 'loved-one-groups', 'user', ownerId, 0),
      findAllOwned(payload, 'loved-ones', 'user', ownerId, 0),
      findAllOwned(payload, 'memories', 'owner', ownerId, 2),
      findAllOwned(payload, 'open-when-messages', 'owner', ownerId, 2),
      findAllOwned(payload, 'digital-legacy-items', 'owner', ownerId, 0),
    ])

  const mediaEntries: ZipEntry[] = []
  const usedMediaNames = new Set<string>()
  const mediaRegistry = new Map<number, { id: number; path: string; mimeType: string; posterPath?: string }>()

  async function registerMedia(mediaValue: unknown): Promise<number | null> {
    const media = typeof mediaValue === 'object' && mediaValue ? (mediaValue as any) : null
    const mediaId = toId(media ?? mediaValue)
    if (mediaId === null) {
      return null
    }

    if (mediaRegistry.has(mediaId)) {
      return mediaId
    }

    if (!media) {
      return null
    }

    const buffer = await loadDecryptedMediaBuffer(media)
    if (!buffer) {
      return null
    }

    const mimeType = String(media.encryptionMetadata?.originalType ?? media.mimeType ?? '')
    const exportPath = buildExportMediaPath(
      String(media.filename ?? '').trim(),
      `media-${mediaId}`,
      usedMediaNames,
      mimeType,
    )
    mediaEntries.push({ name: exportPath, data: buffer })

    let posterPath: string | undefined
    const posterBuffer = await loadDecryptedPosterBuffer(media)
    if (posterBuffer) {
      posterPath = buildExportMediaPath(
        `poster-${mediaId}.jpg`,
        `poster-${mediaId}`,
        usedMediaNames,
        'image/jpeg',
      )
      mediaEntries.push({ name: posterPath, data: posterBuffer })
    }

    mediaRegistry.set(mediaId, { id: mediaId, path: exportPath, mimeType, posterPath })
    return mediaId
  }

  const memoryEntries = []
  for (const memory of memories) {
    const content = Array.isArray(memory.content) ? memory.content : []
    const exportedContent = []

    for (const item of content) {
      if (item?.type === 'note') {
        exportedContent.push({
          type: 'note',
          note: decryptSensitiveText({
            ciphertext: item.noteCiphertext,
            metadata: item.noteEncryptionMetadata,
            fallback: item.note,
          }),
        })
        continue
      }

      if (item?.type === 'image' || item?.type === 'video') {
        const mediaId = await registerMedia(item.media)
        if (mediaId !== null) {
          exportedContent.push({ type: item.type, media: mediaId })
        }
      }
    }

    memoryEntries.push({
      id: memory.id,
      title: getMemoryDisplayTitle(memory),
      memoryDate: memory.memoryDate,
      groups: toIds(memory.groups),
      lovedOnes: toIds(memory.lovedOnes),
      content: exportedContent,
    })
  }

  const openWhenEntries = []
  for (const message of openWhenMessages) {
    const attachmentIds: number[] = []
    for (const attachment of Array.isArray(message.attachments) ? message.attachments : []) {
      const mediaId = await registerMedia(attachment)
      if (mediaId !== null) {
        attachmentIds.push(mediaId)
      }
    }

    const decryptedMessage = serializeOpenWhenMessage(message)

    openWhenEntries.push({
      id: message.id,
      title: decryptedMessage.title,
      openWhenText: decryptedMessage.openWhenText,
      message: decryptedMessage.message,
      iconKey: message.iconKey ?? null,
      colorKey: message.colorKey ?? null,
      lovedOnes: toIds(message.lovedOnes),
      attachments: attachmentIds,
      triggerDate: message.triggerDate ?? null,
      allowSendWhileActive: Boolean(message.allowSendWhileActive),
      status: message.status,
    })
  }

  const data = {
    schemaVersion: VAULT_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    owner: {
      firstName: userDoc?.firstName ?? '',
      lastName: userDoc?.lastName ?? '',
      email: userDoc?.email ?? '',
    },
    media: Array.from(mediaRegistry.values()),
    lovedOneGroups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      isDefault: Boolean(group.isDefault),
      defaultKey: group.defaultKey ?? null,
      iconKey: group.iconKey ?? null,
      colorKey: group.colorKey ?? null,
    })),
    lovedOnes: lovedOnes.map((lovedOne) => ({
      id: lovedOne.id,
      fullName: lovedOne.fullName,
      nickname: lovedOne.nickname ?? null,
      email: getLovedOneDisplayEmail(lovedOne) || null,
      relationship: lovedOne.relationship,
      customNote: getLovedOneDisplayNote(lovedOne) || null,
      groups: toIds(lovedOne.groups),
    })),
    memories: memoryEntries,
    openWhenMessages: openWhenEntries,
    digitalLegacyItems: digitalLegacyItems.map((item) => {
      const decryptedItem = serializeDigitalLegacyItem(item)

      return {
        id: item.id,
        title: decryptedItem.title,
        category: decryptedItem.category,
        notes: decryptedItem.notes || null,
        priority: decryptedItem.priority,
        checked: decryptedItem.checked,
        isDefault: decryptedItem.isDefault,
        sortOrder: decryptedItem.sortOrder,
        lovedOnes: toIds(item.lovedOnes),
      }
    }),
  }

  const entries: ZipEntry[] = [
    { name: 'data.json', data: Buffer.from(JSON.stringify(data, null, 2), 'utf8') },
    ...mediaEntries,
  ]

  const summary: VaultTransferSummary = {
    lovedOneGroups: data.lovedOneGroups.length,
    lovedOnes: data.lovedOnes.length,
    memories: data.memories.length,
    media: data.media.length,
    openWhenMessages: data.openWhenMessages.length,
    digitalLegacyItems: data.digitalLegacyItems.length,
  }

  return { zipBuffer: createZip(entries), summary }
}

type ImportOutcome = {
  summary: VaultTransferSummary
  stoppedReason: string | null
}

/**
 * Applies a previously exported vault archive to `ownerId`'s account. Always
 * creates new records (never overwrites/merges), except default loved-one
 * groups are matched by defaultKey to avoid duplicating every account's
 * built-in "Family"/"Friends" groups on each import.
 */
export async function applyVaultImportZip(
  payload: Payload,
  ownerId: number,
  zipBuffer: Buffer,
  billingState: VaultTransferBillingState | null,
): Promise<ImportOutcome> {
  const entries = readZip(zipBuffer)
  const dataEntry = entries.find((entry) => entry.name === 'data.json')

  if (!dataEntry) {
    throw new Error('Archive is missing data.json')
  }

  const data = JSON.parse(dataEntry.data.toString('utf8'))

  if (data?.schemaVersion !== VAULT_EXPORT_SCHEMA_VERSION) {
    throw new Error(`Unsupported export schema version: ${data?.schemaVersion}`)
  }

  const fileByPath = new Map(entries.map((entry) => [entry.name, entry.data]))
  const summary = emptySummary()
  let stoppedReason: string | null = null

  // --- loved-one groups (dedup default groups by defaultKey) ---
  const existingGroups = await findAllOwned(payload, 'loved-one-groups', 'user', ownerId, 0)
  const existingDefaultKeys = new Map(
    existingGroups
      .filter((group) => group.defaultKey)
      .map((group) => [String(group.defaultKey).trim().toLowerCase(), group.id as number]),
  )
  const groupIdMap = new Map<number, number>()

  for (const group of data.lovedOneGroups ?? []) {
    const defaultKey = group.defaultKey ? String(group.defaultKey).trim().toLowerCase() : null

    if (group.isDefault && defaultKey && existingDefaultKeys.has(defaultKey)) {
      groupIdMap.set(group.id, existingDefaultKeys.get(defaultKey)!)
      continue
    }

    const created = await payload.create({
      collection: 'loved-one-groups',
      overrideAccess: true,
      data: {
        name: group.name,
        isDefault: Boolean(group.isDefault),
        defaultKey: group.defaultKey ?? undefined,
        iconKey: group.iconKey ?? undefined,
        colorKey: group.colorKey ?? undefined,
        user: ownerId,
      },
    })

    groupIdMap.set(group.id, created.id as number)
    summary.lovedOneGroups += 1

    if (group.isDefault && defaultKey) {
      existingDefaultKeys.set(defaultKey, created.id as number)
    }
  }

  // --- loved ones ---
  const lovedOneCountLimit = getLovedOneCountLimit(billingState ?? undefined)
  const lovedOneIdMap = new Map<number, number>()

  if (lovedOneCountLimit !== null) {
    const existingCount = await payload.count({
      collection: 'loved-ones',
      overrideAccess: true,
      where: { user: { equals: ownerId } },
    })

    if (existingCount.totalDocs + (data.lovedOnes ?? []).length > lovedOneCountLimit) {
      stoppedReason = `Your plan allows at most ${lovedOneCountLimit} loved ones; skipped importing loved ones to stay within that limit.`
    }
  }

  if (!stoppedReason) {
    for (const lovedOne of data.lovedOnes ?? []) {
      const email = String(lovedOne.email ?? '').trim()
      const customNote = String(lovedOne.customNote ?? '').trim()
      const encryptedEmail = encryptSensitiveText(email)
      const encryptedNote = encryptSensitiveText(customNote)

      const created = await payload.create({
        collection: 'loved-ones',
        overrideAccess: true,
        data: {
          fullName: lovedOne.fullName,
          nickname: lovedOne.nickname ?? undefined,
          email: null,
          emailCiphertext: encryptedEmail.ciphertext,
          emailEncryptionMetadata: encryptedEmail.metadata,
          relationship: lovedOne.relationship,
          customNote: null,
          customNoteCiphertext: encryptedNote.ciphertext,
          customNoteEncryptionMetadata: encryptedNote.metadata,
          groups: (lovedOne.groups ?? [])
            .map((id: number) => groupIdMap.get(id))
            .filter((id: number | undefined): id is number => id !== undefined),
          user: ownerId,
        },
      })

      lovedOneIdMap.set(lovedOne.id, created.id as number)
      summary.lovedOnes += 1
    }
  }

  // --- media (re-encrypt and re-upload) ---
  const storageLimit = getStorageByteLimit(billingState ?? undefined)
  let currentStorageUsage = storageLimit !== null ? await getUserStorageUsageBytes(ownerId) : 0
  const mediaIdMap = new Map<number, number>()
  let mediaStorageLimitHit = false

  for (const mediaMeta of data.media ?? []) {
    const bytes = fileByPath.get(mediaMeta.path)
    if (!bytes) {
      continue
    }

    const posterBytes = mediaMeta.posterPath ? fileByPath.get(mediaMeta.posterPath) : null
    const attemptedBytes = bytes.length + (posterBytes?.length ?? 0)

    if (storageLimit !== null && !isWithinStorageLimit(currentStorageUsage + attemptedBytes, storageLimit)) {
      mediaStorageLimitHit = true
      break
    }

    const encryptedFile = encryptBufferServer(bytes, mediaMeta.mimeType || 'application/octet-stream')
    const created = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: {
        purpose: 'content',
        isEncrypted: true,
        encryptionMetadata: encryptedFile.metadata,
        ownerUser: ownerId,
      },
      file: {
        name: `imported-${mediaMeta.id}.encrypted.bin`,
        data: encryptedFile.data,
        mimetype: 'application/octet-stream',
        size: encryptedFile.data.length,
      },
    })

    if (posterBytes) {
      const encryptedPoster = encryptBufferServer(posterBytes, 'image/jpeg')
      const posterDoc = await payload.create({
        collection: 'media',
        overrideAccess: true,
        data: {
          purpose: 'content',
          isEncrypted: true,
          encryptionMetadata: encryptedPoster.metadata,
          ownerUser: ownerId,
        },
        file: {
          name: `imported-poster-${mediaMeta.id}.encrypted.bin`,
          data: encryptedPoster.data,
          mimetype: 'application/octet-stream',
          size: encryptedPoster.data.length,
        },
      })

      if (typeof posterDoc?.url === 'string') {
        await payload.update({
          collection: 'media',
          id: created.id,
          overrideAccess: true,
          data: {
            posterUrl: posterDoc.url,
            posterEncryptionMetadata: encryptedPoster.metadata,
          },
        })
      }
    }

    mediaIdMap.set(mediaMeta.id, created.id as number)
    currentStorageUsage += attemptedBytes
    summary.media += 1
  }

  if (mediaStorageLimitHit) {
    stoppedReason = `Your plan's storage limit was reached; stopped importing after ${summary.media} media file(s).`
  }

  // --- memories ---
  if (!stoppedReason) {
    const memoryContentItemLimit = getMemoryContentItemLimit(billingState ?? undefined)
    const memoryCountLimit = getMemoryCountLimit(billingState ?? undefined)
    let existingMemoryCount = 0

    if (memoryCountLimit !== null) {
      const existing = await payload.count({
        collection: 'memories',
        overrideAccess: true,
        where: { owner: { equals: ownerId } },
      })
      existingMemoryCount = existing.totalDocs
    }

    for (const memory of data.memories ?? []) {
      if (memoryCountLimit !== null && existingMemoryCount + summary.memories >= memoryCountLimit) {
        stoppedReason = `Your plan allows at most ${memoryCountLimit} memories; stopped importing after ${summary.memories}.`
        break
      }

      const content = (memory.content ?? [])
        .map((item: any) => {
          if (item.type === 'note') {
            const encrypted = encryptSensitiveText(String(item.note ?? '').trim())
            return {
              type: 'note',
              noteCiphertext: encrypted.ciphertext ?? undefined,
              noteEncryptionMetadata: encrypted.metadata ?? undefined,
            }
          }

          const newMediaId = mediaIdMap.get(item.media)
          if (newMediaId === undefined) {
            return null
          }

          return { type: item.type, media: newMediaId }
        })
        .filter(Boolean)

      if (content.length === 0) {
        continue
      }

      if (memoryContentItemLimit !== null && content.length > memoryContentItemLimit) {
        content.length = memoryContentItemLimit
      }

      const encryptedTitle = encryptSensitiveText(String(memory.title ?? '').trim())
      const groupIds = (memory.groups ?? [])
        .map((id: number) => groupIdMap.get(id))
        .filter((id: number | undefined): id is number => id !== undefined)
      const lovedOneIds = (memory.lovedOnes ?? [])
        .map((id: number) => lovedOneIdMap.get(id))
        .filter((id: number | undefined): id is number => id !== undefined)

      if (groupIds.length === 0 && lovedOneIds.length === 0) {
        continue
      }

      await payload.create({
        collection: 'memories',
        overrideAccess: true,
        data: {
          title: ENCRYPTED_MEMORY_TITLE_PLACEHOLDER,
          titleCiphertext: encryptedTitle.ciphertext ?? undefined,
          titleEncryptionMetadata: encryptedTitle.metadata ?? undefined,
          memoryDate: memory.memoryDate,
          owner: ownerId,
          groups: groupIds,
          lovedOnes: lovedOneIds,
          content,
        },
      })

      summary.memories += 1
    }
  }

  // --- open-when messages ---
  if (!stoppedReason) {
    const openWhenCountLimit = getOpenWhenMessageCountLimit(billingState ?? undefined)
    let existingOpenWhenCount = 0

    if (openWhenCountLimit !== null) {
      const existing = await payload.count({
        collection: 'open-when-messages',
        overrideAccess: true,
        where: { owner: { equals: ownerId } },
      })
      existingOpenWhenCount = existing.totalDocs
    }

    for (const message of data.openWhenMessages ?? []) {
      if (
        openWhenCountLimit !== null &&
        existingOpenWhenCount + summary.openWhenMessages >= openWhenCountLimit
      ) {
        stoppedReason = `Your plan allows at most ${openWhenCountLimit} Open When messages; stopped importing after ${summary.openWhenMessages}.`
        break
      }

      const lovedOneIds = (message.lovedOnes ?? [])
        .map((id: number) => lovedOneIdMap.get(id))
        .filter((id: number | undefined): id is number => id !== undefined)

      if (lovedOneIds.length === 0) {
        continue
      }

      const attachmentIds = (message.attachments ?? [])
        .map((id: number) => mediaIdMap.get(id))
        .filter((id: number | undefined): id is number => id !== undefined)

      const encryptedFields = encryptOpenWhenFields({
        title: String(message.title ?? '').trim(),
        openWhenText: String(message.openWhenText ?? '').trim(),
        message: String(message.message ?? '').trim(),
      })

      await payload.create({
        collection: 'open-when-messages',
        overrideAccess: true,
        data: {
          ...encryptedFields,
          iconKey: message.iconKey ?? undefined,
          colorKey: message.colorKey ?? undefined,
          owner: ownerId,
          lovedOnes: lovedOneIds,
          attachments: attachmentIds,
          triggerDate: message.triggerDate ?? undefined,
          allowSendWhileActive: Boolean(message.allowSendWhileActive),
          status: message.status === 'draft' ? 'draft' : 'active',
        },
      })

      summary.openWhenMessages += 1
    }
  }

  // --- digital legacy checklist items ---
  if (!stoppedReason) {
    for (const item of data.digitalLegacyItems ?? []) {
      const lovedOneIds = (item.lovedOnes ?? [])
        .map((id: number) => lovedOneIdMap.get(id))
        .filter((id: number | undefined): id is number => id !== undefined)

      const encryptedFields = encryptDigitalLegacyItemFields({
        title: String(item.title ?? '').trim(),
        notes: String(item.notes ?? '').trim(),
      })

      await payload.create({
        collection: 'digital-legacy-items',
        overrideAccess: true,
        data: {
          ...encryptedFields,
          category: item.category || 'access',
          priority: item.priority ?? 'normal',
          checked: Boolean(item.checked),
          isDefault: false,
          sortOrder: item.sortOrder ?? 0,
          owner: ownerId,
          lovedOnes: lovedOneIds,
        },
      })

      summary.digitalLegacyItems += 1
    }
  }

  return { summary, stoppedReason }
}
