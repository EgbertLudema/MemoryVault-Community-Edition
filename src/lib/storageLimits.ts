export function getStorageByteLimit(_user?: unknown) {
  return null
}

export function isWithinStorageLimit(nextUsageBytes: number, max = getStorageByteLimit()) {
  return max === null || nextUsageBytes <= max
}

export function getStorageLimitMessage(max = getStorageByteLimit()) {
  if (max === null) {
    return 'This MemoryVault edition does not limit storage'
  }

  return `Your plan can store up to ${formatStorageBytes(max)}`
}

export function formatStorageBytes(bytes: number) {
  const gibibyte = 1024 * 1024 * 1024
  const mebibyte = 1024 * 1024

  if (bytes >= gibibyte && bytes % gibibyte === 0) {
    return `${bytes / gibibyte} GB`
  }

  if (bytes >= mebibyte && bytes % mebibyte === 0) {
    return `${bytes / mebibyte} MB`
  }

  return `${(bytes / mebibyte).toFixed(1)} MB`
}
