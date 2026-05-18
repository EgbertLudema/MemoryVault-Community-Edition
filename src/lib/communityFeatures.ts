export const FEATURE_KEYS = {
  unlimitedMemoryContentItems: 'unlimited_memory_content_items',
  videoMemories: 'video_memories',
  customLovedOneGroups: 'custom_loved_one_groups',
  legacyDelivery: 'legacy_delivery',
} as const

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS]
export type UserFeatureState = Record<string, unknown>

export function hasFeature(_feature: FeatureKey) {
  return true
}

export function hasFeatureForUser(
  _user: UserFeatureState | null | undefined,
  _feature: FeatureKey,
) {
  return true
}

export function getLimit(_limit: 'memoryContentItems' | 'memories' | 'lovedOnes') {
  return null
}

export function getLimitForUser(
  _user: UserFeatureState | null | undefined,
  _limit: 'memoryContentItems' | 'memories' | 'lovedOnes',
) {
  return null
}
