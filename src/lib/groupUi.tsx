// lib/groupUi.tsx
import * as React from 'react'
import { GROUP_COLOR_OPTIONS, getColorOption, getDefaultGroupPresetByKey } from '@/lib/groupMeta'
import { FamilyIcon } from '@/components/icons/FamilyIcon'
import { TwoPersonsIcon } from '@/components/icons/TwoPersonsIcon'
import { BabyIcon } from '@/components/icons/BabyIcon'
import { ShakeHandsIcon } from '@/components/icons/ShakeHandsIcon'
import { HouseIcon } from '@/components/icons/HouseIcon'
import { WorldIcon } from '@/components/icons/WorldIcon'
import { FriendsIcon } from '@/components/icons/FriendsIcon'
import { HeartIcon } from '@/components/icons/HeartIcon'

export type GroupUiOption = {
  id: string
  label: string
  name?: string
  isDefault?: boolean
  defaultKey?: string | null
  iconKey?: string | null
  colorKey?: string | null
}

export type GroupIconOption = {
  key: string
  label: string
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

export type GroupColorOption = (typeof GROUP_COLOR_OPTIONS)[number]

export const GROUP_ICON_OPTIONS: GroupIconOption[] = [
  { key: 'heart', label: 'Heart', Icon: HeartIcon },
  { key: 'family', label: 'Family', Icon: FamilyIcon },
  { key: 'children', label: '2 people', Icon: TwoPersonsIcon },
  { key: 'grandchildren', label: 'Baby', Icon: BabyIcon },
  { key: 'friends', label: 'Friends', Icon: FriendsIcon },
  { key: 'handshake', label: 'Handshake', Icon: ShakeHandsIcon },
  { key: 'house', label: 'House', Icon: HouseIcon },
  { key: 'world', label: 'World', Icon: WorldIcon },
]

export function normalizeGroupIconKey(value: unknown): string {
  return String(value ?? '').trim()
}

export function getGroupIconOption(iconKey: string | null | undefined): GroupIconOption {
  const key = normalizeGroupIconKey(iconKey)
  return GROUP_ICON_OPTIONS.find((option) => option.key === key) ?? GROUP_ICON_OPTIONS[0]
}

export function getEffectiveGroupUiMeta(group: GroupUiOption): {
  icon: GroupIconOption
  color: GroupColorOption
} {
  const preset = getDefaultGroupPresetByKey(group.defaultKey)

  const resolvedIconKey =
    normalizeGroupIconKey(group.iconKey) ||
    (group.isDefault && preset ? preset.iconKey : '') ||
    GROUP_ICON_OPTIONS[0].key

  const resolvedColorKey =
    String(group.colorKey ?? '').trim() ||
    (group.isDefault && preset ? preset.colorKey : '') ||
    GROUP_COLOR_OPTIONS[0].key

  return {
    icon: getGroupIconOption(resolvedIconKey),
    color: getColorOption(resolvedColorKey),
  }
}

export function mapApiGroupToUiOption(it: any): GroupUiOption | null {
  const id = String(it?.id ?? '')
  const label = String(it?.title ?? it?.name ?? it?.fullName ?? it?.label ?? it?.slug ?? id)

  if (!id || !label) {
    return null
  }

  return {
    id,
    label,
    name: String(it?.name ?? label),
    isDefault: Boolean(it?.isDefault),
    defaultKey: it?.defaultKey ?? null,
    iconKey: it?.iconKey ?? null,
    colorKey: it?.colorKey ?? null,
  }
}
