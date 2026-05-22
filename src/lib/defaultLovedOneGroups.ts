import type { Payload, PayloadRequest } from 'payload'
import { DEFAULT_GROUP_DEFINITIONS } from '@/lib/groupMeta'

export async function ensureDefaultLovedOneGroups(
  payload: Payload,
  userId: number,
  req?: PayloadRequest,
) {
  const existing = await payload.find({
    collection: 'loved-one-groups',
    overrideAccess: true,
    req,
    where: {
      user: { equals: userId },
    },
    limit: 200,
  })

  const existingKeys = new Set(
    (existing.docs ?? []).map((group) => String(group.defaultKey ?? '').trim().toLowerCase()),
  )

  for (const group of DEFAULT_GROUP_DEFINITIONS) {
    if (existingKeys.has(group.key)) {
      continue
    }

    await payload.create({
      collection: 'loved-one-groups',
      overrideAccess: true,
      req,
      data: {
        name: group.name,
        isDefault: true,
        defaultKey: group.key,
        iconKey: group.iconKey,
        colorKey: group.colorKey,
        user: userId,
      },
    })
  }
}
