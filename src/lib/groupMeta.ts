// lib/groupMeta.ts
import {
  COLOR_MAP,
  COLOR_OPTIONS,
  getColorOptionByKey,
  getColorValue,
} from '@/lib/colors'

export const GROUP_COLOR_OPTIONS = COLOR_OPTIONS
export const GROUP_COLOR_MAP: Record<string, string> = COLOR_MAP

export const DEFAULT_GROUP_DEFINITIONS = [
  { key: 'lover', name: 'Lover', iconKey: 'heart', colorKey: 'red' },
  { key: 'children', name: 'Children', iconKey: 'children', colorKey: 'blue' },
  { key: 'grandchildren', name: 'Grandchildren', iconKey: 'grandchildren', colorKey: 'purple' },
  { key: 'family', name: 'Family', iconKey: 'family', colorKey: 'green' },
  { key: 'friends', name: 'Friends', iconKey: 'friends', colorKey: 'yellow' },
  { key: 'general', name: 'General', iconKey: 'world', colorKey: 'gray' },
] as const

export type DefaultGroupKey = (typeof DEFAULT_GROUP_DEFINITIONS)[number]['key']

export const DEFAULT_GROUP_ORDER = DEFAULT_GROUP_DEFINITIONS.map((group) => group.key)

export const DEFAULT_GROUP_PRESETS_BY_KEY: Record<string, { iconKey: string; colorKey: string }> =
  Object.fromEntries(
    DEFAULT_GROUP_DEFINITIONS.map((group) => [
      group.key,
      { iconKey: group.iconKey, colorKey: group.colorKey },
    ]),
  )

export function normalizeGroupPresetName(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

export function normalizeDefaultGroupKey(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

export function getDefaultGroupDefinitionByKey(key: unknown) {
  const normalized = normalizeDefaultGroupKey(key)
  return DEFAULT_GROUP_DEFINITIONS.find((group) => group.key === normalized) ?? null
}

export function getDefaultGroupPresetByKey(key: unknown) {
  return DEFAULT_GROUP_PRESETS_BY_KEY[normalizeDefaultGroupKey(key)] ?? null
}

export function getDefaultGroupLabel(
  defaultKey: unknown,
  fallbackName?: unknown,
  translate?: (key: DefaultGroupKey) => string,
) {
  const definition = getDefaultGroupDefinitionByKey(defaultKey)

  if (!definition) {
    return normalizeGroupName(fallbackName)
  }

  return translate ? translate(definition.key) : definition.name
}

export function normalizeGroupName(value: unknown): string {
  return String(value ?? '').trim()
}

export function getColorValueFromKey(colorKey?: string | null): string | null {
  return getColorValue(colorKey)
}

export function getColorOption(colorKey?: string | null) {
  return getColorOptionByKey(colorKey)
}

export function sortGroupsWithDefaultsFirst<
  T extends { name?: string | null; isDefault?: boolean; defaultKey?: string | null },
>(groups: T[]): T[] {
  return [...groups].sort((a, b) => {
    if (a.isDefault && !b.isDefault) {
      return -1
    }

    if (!a.isDefault && b.isDefault) {
      return 1
    }

    if (a.isDefault && b.isDefault) {
      const aIndex = (DEFAULT_GROUP_ORDER as readonly string[]).indexOf(
        normalizeDefaultGroupKey(a.defaultKey),
      )
      const bIndex = (DEFAULT_GROUP_ORDER as readonly string[]).indexOf(
        normalizeDefaultGroupKey(b.defaultKey),
      )

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex
      }

      if (aIndex !== -1) {
        return -1
      }

      if (bIndex !== -1) {
        return 1
      }
    }

    return normalizeGroupName(a.name).localeCompare(normalizeGroupName(b.name))
  })
}
