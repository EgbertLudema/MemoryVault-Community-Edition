export const FEATURE_KEYS = {
  unlimitedMemoryContentItems: 'unlimited_memory_content_items',
  videoMemories: 'video_memories',
  customLovedOneGroups: 'custom_loved_one_groups',
  legacyDelivery: 'legacy_delivery',
  openWhenPhotos: 'open_when_photos',
} as const

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS]
export type UserFeatureState = unknown

export function hasFeature(_feature: FeatureKey) {
  return true
}

export function hasFeatureForUser(_user: UserFeatureState, _feature: FeatureKey) {
  return true
}

export function getLimit(
  _limit: 'memoryContentItems' | 'memories' | 'lovedOnes' | 'storageBytes' | 'openWhenMessages',
) {
  return null
}

export function getLimitForUser(
  _user: UserFeatureState,
  _limit: 'memoryContentItems' | 'memories' | 'lovedOnes' | 'storageBytes' | 'openWhenMessages',
) {
  return null
}
