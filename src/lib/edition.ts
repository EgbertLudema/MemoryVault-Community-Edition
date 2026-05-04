export const MEMORYVAULT_EDITIONS = ['oss', 'cloud'] as const

export type MemoryVaultEdition = (typeof MEMORYVAULT_EDITIONS)[number]

function normalizeEdition(value: string | undefined): MemoryVaultEdition {
  return value === 'cloud' ? 'cloud' : 'oss'
}

export function getMemoryVaultEdition(): MemoryVaultEdition {
  return normalizeEdition(
    process.env.NEXT_PUBLIC_MEMORYVAULT_EDITION ?? process.env.MEMORYVAULT_EDITION,
  )
}

export function isOpenSourceEdition() {
  return getMemoryVaultEdition() === 'oss'
}

export function isCloudEdition() {
  return getMemoryVaultEdition() === 'cloud'
}
