import { getLimit } from '@/lib/entitlements'

export function getMemoryContentItemLimit() {
  return getLimit('memoryContentItems')
}

export function isWithinMemoryContentItemLimit(count: number, max = getMemoryContentItemLimit()) {
  return max === null || count <= max
}

export function getMemoryContentLimitMessage(max = getMemoryContentItemLimit()) {
  if (max === null) {
    return 'This MemoryVault edition does not limit content items per memory'
  }

  return `Each memory can have at most ${max} content items`
}
