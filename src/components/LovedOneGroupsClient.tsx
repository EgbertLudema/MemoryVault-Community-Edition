'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
  GROUP_COLOR_OPTIONS,
  getColorOption,
  getDefaultGroupLabel,
  getDefaultGroupPresetByKey,
  sortGroupsWithDefaultsFirst,
} from '@/lib/groupMeta'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { FamilyIcon } from './icons/FamilyIcon'
import { TwoPersonsIcon } from './icons/TwoPersonsIcon'
import { BabyIcon } from './icons/BabyIcon'
import { ShakeHandsIcon } from './icons/ShakeHandsIcon'
import { HouseIcon } from './icons/HouseIcon'
import { WorldIcon } from './icons/WorldIcon'
import { FriendsIcon } from './icons/FriendsIcon'
import { HeartIcon } from './icons/HeartIcon'
import { LockIcon } from './icons/LockIcon'

type Group = {
  id: string
  name: string
  isDefault?: boolean
  defaultKey?: string | null
  iconKey?: string | null
  colorKey?: string | null
}

type IconOption = {
  key: string
  label: string
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

type GroupColorOption = (typeof GROUP_COLOR_OPTIONS)[number]

export const ICON_OPTIONS: IconOption[] = [
  { key: 'heart', label: 'Heart', Icon: HeartIcon },
  { key: 'family', label: 'Family', Icon: FamilyIcon },
  { key: 'children', label: '2 people', Icon: TwoPersonsIcon },
  { key: 'grandchildren', label: 'Baby', Icon: BabyIcon },
  { key: 'friends', label: 'Friends', Icon: FriendsIcon },
  { key: 'handshake', label: 'Handshake', Icon: ShakeHandsIcon },
  { key: 'house', label: 'House', Icon: HouseIcon },
  { key: 'world', label: 'World', Icon: WorldIcon },
]

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function normalizeKey(value: unknown): string {
  return String(value ?? '').trim()
}

function getIconOption(iconKey: string | null | undefined): IconOption {
  const key = normalizeKey(iconKey)
  return ICON_OPTIONS.find((option) => option.key === key) ?? ICON_OPTIONS[0]
}

function getEffectiveGroupMeta(group: Group): { icon: IconOption; color: GroupColorOption } {
  const preset = getDefaultGroupPresetByKey(group.defaultKey)

  const resolvedIconKey =
    normalizeKey(group.iconKey) ||
    (group.isDefault && preset ? preset.iconKey : '') ||
    ICON_OPTIONS[0].key

  const resolvedColorKey =
    normalizeKey(group.colorKey) ||
    (group.isDefault && preset ? preset.colorKey : '') ||
    GROUP_COLOR_OPTIONS[0].key

  return {
    icon: getIconOption(resolvedIconKey),
    color: getColorOption(resolvedColorKey),
  }
}

export function LovedOneGroupsClient({ initialGroups }: { initialGroups: Group[] }) {
  const t = useTranslations('GroupsPage')
  const tGroups = useTranslations('GroupLabels')
  const router = useRouter()

  const [groups, setGroups] = React.useState<Group[]>(initialGroups)
  const [name, setName] = React.useState('')
  const [iconKey, setIconKey] = React.useState<string>(ICON_OPTIONS[0].key)
  const [colorKey, setColorKey] = React.useState<string>(GROUP_COLOR_OPTIONS[0].key)

  const [creating, setCreating] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  async function refreshGroups() {
    router.refresh()
  }

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError(t('groupNameRequired'))
      return
    }

    try {
      setCreating(true)

      const res = await fetch('/api/loved-one-groups', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          isDefault: false,
          iconKey,
          colorKey,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(t('createFailed', { status: res.status, details: text }))
      }

      setName('')
      setIconKey(ICON_OPTIONS[0].key)
      setColorKey(GROUP_COLOR_OPTIONS[0].key)
      await refreshGroups()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('genericError'))
    } finally {
      setCreating(false)
    }
  }

  async function onDelete(group: Group) {
    setError(null)

    const ok = window.confirm(t('deleteConfirm', { name: group.name }))
    if (!ok) {
      return
    }

    try {
      setDeletingId(group.id)

      const res = await fetch(`/api/loved-one-groups/${group.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(t('deleteFailed', { status: res.status, details: text }))
      }

      await refreshGroups()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('genericError'))
    } finally {
      setDeletingId(null)
    }
  }

  React.useEffect(() => {
    setGroups(initialGroups)
  }, [initialGroups])

  const createPreviewIcon = getIconOption(iconKey)
  const createPreviewColor = getColorOption(colorKey)
  const CreatePreviewIconComponent = createPreviewIcon.Icon

  const sortedGroups = sortGroupsWithDefaultsFirst(groups)

  return (
    <div className="grid gap-3.5">
      <div className="rounded-[14px] border border-[#eee] bg-white p-4">
        <div className="text-sm font-bold text-stone-800">{t('createGroup')}</div>

        <p className="mt-1.5 mb-3 text-[13px] text-[#555]">
          {t('createGroupBody')}
        </p>

        <form onSubmit={onCreate} className="grid gap-6">
          <div className="flex flex-wrap gap-4">
            <div
              aria-hidden="true"
              className="grid h-[42px] w-[42px] place-items-center rounded-xl border"
              style={{
                color: createPreviewColor.value,
                borderColor: `color-mix(in srgb, ${createPreviewColor.value} 40%, transparent)`,
                background: `color-mix(in srgb, ${createPreviewColor.value} 10%, transparent)`,
              }}
            >
              <CreatePreviewIconComponent width={20} height={20} />
            </div>

            <div className="min-w-[240px] flex-[1_1_260px]">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('createPlaceholder')}
                className="h-[42px] w-full rounded-xl border border-[#ddd] bg-white px-3 text-sm outline-none"
              />
            </div>

            <PrimaryButton type="submit" disabled={creating} className="h-[42px] px-3.5">
              {creating ? t('creating') : t('create')}
            </PrimaryButton>
          </div>

          <div className="grid gap-2.5">
            <div className="text-[13px] font-bold">{t('color')}</div>

            <div className="flex flex-wrap gap-2.5">
              {GROUP_COLOR_OPTIONS.map((opt) => {
                const active = opt.key === colorKey

                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setColorKey(opt.key)}
                    aria-pressed={active}
                    title={opt.label}
                    className={cn(
                      'cursor-pointer rounded-xl border px-3 py-2 text-xs font-medium transition duration-150',
                      active && 'ring-2 ring-purple-700 ring-offset-1 ring-offset-white',
                    )}
                    style={{
                      color: opt.value,
                      backgroundColor: `color-mix(in srgb, ${opt.value} 10%, transparent)`,
                      borderColor: `color-mix(in srgb, ${opt.value} 40%, transparent)`,
                    }}
                  >
                    <span className="block leading-none">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[13px] font-bold">{t('icon')}</div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {ICON_OPTIONS.map((opt) => {
                const active = opt.key === iconKey
                const IconComponent = opt.Icon

                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setIconKey(opt.key)}
                    aria-pressed={active}
                    title={opt.label}
                    className={cn(
                      'grid h-[42px] w-[42px] cursor-pointer place-items-center rounded-xl border transition duration-150',
                      active && 'ring-2 ring-purple-700 ring-offset-1 ring-offset-white',
                    )}
                    style={{
                      color: createPreviewColor.value,
                      backgroundColor: `color-mix(in srgb, ${createPreviewColor.value} 10%, transparent)`,
                      borderColor: `color-mix(in srgb, ${createPreviewColor.value} 40%, transparent)`,
                    }}
                  >
                    <IconComponent width={20} height={20} />
                  </button>
                )
              })}
            </div>
          </div>
        </form>

        {error ? <Alert kind="error" message={error} /> : null}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-[14px] border border-[#eee] bg-[#fafafa] p-5">
          <p className="m-0 text-[#444]">{t('empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {sortedGroups.map((g) => {
            const meta = getEffectiveGroupMeta(g)
            const GroupIconComponent = meta.icon.Icon
            const groupLabel = getDefaultGroupLabel(g.defaultKey, g.name, (key) => tGroups(key))

            return (
              <div key={g.id} className="rounded-[14px] border border-[#eee] bg-white p-[14px]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div
                      aria-hidden="true"
                      className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl border"
                      style={{
                        color: meta.color.value,
                        backgroundColor: `color-mix(in srgb, ${meta.color.value} 10%, transparent)`,
                        borderColor: `color-mix(in srgb, ${meta.color.value} 40%, transparent)`,
                      }}
                    >
                      <GroupIconComponent width={20} height={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{groupLabel}</div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#666]">
                        <span>{g.isDefault ? t('defaultGroup') : t('customGroup')}</span>

                        <span
                          className="inline-flex h-[24px] items-center rounded-lg border px-2 text-[11px] font-medium"
                          style={{
                            color: meta.color.value,
                            backgroundColor: `color-mix(in srgb, ${meta.color.value} 10%, transparent)`,
                            borderColor: `color-mix(in srgb, ${meta.color.value} 40%, transparent)`,
                          }}
                        >
                          {meta.color.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 sm:justify-end">
                    {g.isDefault ? (
                      <span className="inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[#eee] bg-[#fafafa] px-2.5 text-xs text-[#333]">
                        <LockIcon className="h-3.5 w-3.5 shrink-0" />
                        <span>{t('locked')}</span>
                      </span>
                    ) : (
                      <DeleteButton
                        onClick={() => onDelete(g)}
                        disabled={deletingId === g.id}
                        className="h-[34px] whitespace-nowrap px-3 text-xs"
                      >
                        {deletingId === g.id ? t('deleting') : t('delete')}
                      </DeleteButton>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Alert({ kind, message }: { kind: 'error' | 'success'; message: string }) {
  const isError = kind === 'error'

  return (
    <div
      className={cn(
        'mt-3 rounded-xl border p-3 text-[13px]',
        isError
          ? 'border-[#f2c9c9] bg-[#fff5f5] text-[#7a1f1f]'
          : 'border-[#cfe8d6] bg-[#f3fff6] text-[#1f5f2e]',
      )}
    >
      {message}
    </div>
  )
}
