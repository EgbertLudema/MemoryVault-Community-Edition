import { isOpenSourceEdition } from '@/lib/edition'

export const FEATURE_KEYS = {
  unlimitedMemoryContentItems: 'unlimited_memory_content_items',
  videoMemories: 'video_memories',
  customLovedOneGroups: 'custom_loved_one_groups',
  legacyDelivery: 'legacy_delivery',
} as const

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS]

export type Entitlements = {
  features: Record<FeatureKey, boolean>
  limits: {
    memoryContentItems: number | null
  }
}

const OSS_ENTITLEMENTS: Entitlements = {
  features: {
    [FEATURE_KEYS.unlimitedMemoryContentItems]: true,
    [FEATURE_KEYS.videoMemories]: true,
    [FEATURE_KEYS.customLovedOneGroups]: true,
    [FEATURE_KEYS.legacyDelivery]: true,
  },
  limits: {
    memoryContentItems: null,
  },
}

const CLOUD_DEFAULT_ENTITLEMENTS: Entitlements = {
  features: {
    [FEATURE_KEYS.unlimitedMemoryContentItems]: false,
    [FEATURE_KEYS.videoMemories]: true,
    [FEATURE_KEYS.customLovedOneGroups]: true,
    [FEATURE_KEYS.legacyDelivery]: true,
  },
  limits: {
    memoryContentItems: 6,
  },
}

export function getBaseEntitlements(): Entitlements {
  return isOpenSourceEdition() ? OSS_ENTITLEMENTS : CLOUD_DEFAULT_ENTITLEMENTS
}

export function hasFeature(feature: FeatureKey) {
  return getBaseEntitlements().features[feature] === true
}

export function getLimit(limit: keyof Entitlements['limits']) {
  return getBaseEntitlements().limits[limit]
}
