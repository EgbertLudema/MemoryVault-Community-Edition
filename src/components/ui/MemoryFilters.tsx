// components/MemoryFilters.tsx
'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { PrimaryButton } from './PrimaryButton'
import { SegmentedSlider } from './SegmentedSlider'
import { GroupButton } from './GroupButton'
import { getDefaultGroupLabel } from '@/lib/groupMeta'
import { getEffectiveGroupUiMeta } from '@/lib/groupUi'
import { SearchIcon } from '@/components/icons/SearchIcon'
import { RotateLeftIcon } from '@/components/icons/RotateLeftIcon'

export type MemoryTypeFilter = 'all' | 'notes' | 'images' | 'videos'
export type GridMode = 'drag' | 'scroll'

export type GroupOption = {
  id: string | number
  name: string
  defaultKey?: string | null
  colorKey?: string | null
  colorValue?: string | null
  iconKey?: string | null
  isDefault?: boolean
}

export type MemoryFiltersValue = {
  search: string
  type: MemoryTypeFilter
  groupIds: Array<string | number>
  gridMode: GridMode
}

type MemoryFiltersProps = {
  value: MemoryFiltersValue
  onChange: (next: MemoryFiltersValue) => void
  groups?: GroupOption[]
  compact?: boolean
  compactOpen?: boolean
  onCompactOpenChange?: (next: boolean) => void
  hideHeader?: boolean
  dense?: boolean
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function normalizeId(id: string | number) {
  return String(id).trim()
}

function idsEqual(a: string | number, b: string | number) {
  return normalizeId(a) === normalizeId(b)
}

export function MemoryFilters(props: MemoryFiltersProps) {
  const t = useTranslations('MemoryFilters')
  const tGroups = useTranslations('GroupLabels')
  const {
    value,
    onChange,
    groups = [],
    compact = false,
    compactOpen,
    onCompactOpenChange,
    hideHeader = false,
    dense = false,
  } = props
  const [internalIsOpen, setInternalIsOpen] = React.useState(!compact)
  const [resetSpinTick, setResetSpinTick] = React.useState(0)
  const isOpen = compact ? (compactOpen ?? internalIsOpen) : internalIsOpen

  React.useEffect(() => {
    setInternalIsOpen(!compact)
  }, [compact])

  const setIsOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === 'function' ? next(isOpen) : next
    if (compact && onCompactOpenChange) {
      onCompactOpenChange(resolved)
      return
    }
    setInternalIsOpen(resolved)
  }

  const update = (patch: Partial<MemoryFiltersValue>) => {
    onChange({
      ...value,
      ...patch,
    })
  }

  const setGroup = (id: string | number | null) => {
    if (id === null) {
      update({ groupIds: [] })
      return
    }

    update({ groupIds: [id] })
  }

  const setType = (type: MemoryTypeFilter) => {
    update({ type })
  }

  const resetFilters = () => {
    onChange({
      search: '',
      type: 'all',
      groupIds: [],
      gridMode: value.gridMode,
    })
  }

  const hasActiveFilters = value.search.trim().length > 0 || value.type !== 'all' || value.groupIds.length > 0

  const fieldShellClassName = cn('flex flex-col gap-[6px]', dense && 'gap-1.5')
  const fieldControlBaseClassName = `
		${dense ? 'h-10' : 'h-11'}
		w-full
		border
		border-white/85
		bg-white/85
		px-3
		${dense ? 'text-sm' : 'text-[15px]'}
		rounded-2xl
		text-neutral-900
		outline-none
		ring-1
		ring-inset
		ring-stone-200/90
		focus:ring-2
		focus:ring-inset
		focus:ring-purple-200
		focus:border-purple-200
		transition-all
    shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_0_0_1px_rgba(148,163,184,0.08)]
	`

  const filtersContent = (
    <>
      <div className={cn('flex flex-col gap-3', dense && 'gap-2.5')}>
        <div className={cn('flex flex-col gap-3 lg:flex-row lg:items-center', dense && 'gap-2.5')}>
          <div className={cn(fieldShellClassName, 'min-w-0 flex-1')}>
            <div className="relative">
              <SearchIcon
                className={cn(
                  'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400',
                  dense ? 'h-4.5 w-4.5' : 'h-5 w-5',
                )}
              />
              <input
                value={value.search}
                onChange={(e) => update({ search: e.target.value })}
                placeholder={t('searchPlaceholder')}
                className={cn(fieldControlBaseClassName, 'pl-10')}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            onMouseEnter={() => {
              if (hasActiveFilters) {
                setResetSpinTick((value) => value + 1)
              }
            }}
            disabled={!hasActiveFilters}
            className={cn(
              dense
                ? 'inline-flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium transition-all lg:shrink-0'
                : 'inline-flex h-11 items-center justify-center gap-2 rounded-full border px-4 text-[15px] font-medium transition-all lg:shrink-0',
              hasActiveFilters
                ? 'cursor-pointer border-stone-200 bg-white/85 text-stone-700 shadow-[0_10px_24px_rgba(15,23,42,0.04)] hover:border-stone-300 hover:bg-white'
                : 'cursor-not-allowed border-stone-200/70 bg-white/60 text-stone-400',
            )}
          >
            <RotateLeftIcon
              key={resetSpinTick}
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                hasActiveFilters && 'animate-memory-filter-reset-spin',
              )}
            />
            {t('resetFilters')}
          </button>
        </div>
      </div>

      <div className={cn('flex flex-wrap gap-4', dense && 'gap-3')}>
        <div className={cn(fieldShellClassName, dense ? 'flex-1 min-w-[220px] max-w-[360px]' : 'flex-1 min-w-[220px] max-w-[400px]')}>
          <SegmentedSlider<MemoryTypeFilter>
            value={value.type}
            onChange={setType}
            options={[
              { label: t('typeAll'), value: 'all' },
              { label: t('typeNotes'), value: 'notes' },
              { label: t('typeImages'), value: 'images' },
              { label: t('typeVideos'), value: 'videos' },
            ]}
          />
        </div>

        <div className={cn(fieldShellClassName, 'flex-1 min-w-[220px]')}>
          {groups.length === 0 ? (
            <div className="text-[12px] text-neutral-500">{t('noGroupsAvailable')}</div>
          ) : (
            <div className="flex gap-[6px] flex-wrap justify-start">
              <GroupButton
                label={t('allGroups')}
                active={value.groupIds.length === 0}
                onClick={() => setGroup(null)}
                colorValue="gray"
              />

              {groups.map((g) => {
                const active = value.groupIds.some((x) => idsEqual(x, g.id))
                const label = getDefaultGroupLabel(g.defaultKey, g.name, (key) => tGroups(key))
                const meta = getEffectiveGroupUiMeta({
                  id: String(g.id),
                  label: label,
                  name: g.name,
                  isDefault: g.isDefault,
                  defaultKey: g.defaultKey ?? null,
                  iconKey: g.iconKey,
                  colorKey: g.colorKey,
                })
                const IconComponent = meta.icon.Icon

                return (
                  <GroupButton
                    key={normalizeId(g.id)}
                    label={label}
                    active={active}
                    onClick={() => setGroup(g.id)}
                    colorValue={g.colorValue ?? meta.color.value}
                    icon={<IconComponent className="h-4 w-4 shrink-0" />}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )

  if (compact) {
    return (
      <div className="z-120 w-fit">
        <div className="relative flex w-fit flex-col items-end">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="pointer-events-auto inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-white/70 bg-white/84 px-4 text-sm font-semibold text-neutral-900 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all hover:bg-white"
            aria-label={isOpen ? t('closeFilters') : t('openFilters')}
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <>
                <span className="relative block h-4 w-4 shrink-0">
                  <span className="absolute left-0 top-[7px] h-0.5 w-4 rounded-full bg-current rotate-45 transition-all" />
                  <span className="absolute left-0 top-[7px] h-0.5 w-4 rounded-full bg-current -rotate-45 transition-all" />
                </span>
                <span>{t('closeFilters')}</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0 fill-current"
                  aria-hidden="true"
                >
                  <path d="m18,5.92c0-2.162-1.758-3.92-3.92-3.92H3.92C1.758,2,0,3.758,0,5.92c0,.935.335,1.841.944,2.551l5.056,5.899v3.63c0,.315.148.611.4.8l4,3c.177.132.388.2.6.2.152,0,.306-.035.447-.105.339-.169.553-.516.553-.895v-6.63l5.056-5.899c.609-.71.944-1.616.944-2.551Zm-2.462,1.25l-5.297,6.18c-.155.181-.241.412-.241.651v5l-2-1.5v-3.5c0-.239-.085-.47-.241-.651L2.462,7.169c-.298-.348-.462-.792-.462-1.25,0-1.059.861-1.92,1.92-1.92h10.16c1.059,0,1.92.861,1.92,1.92,0,.458-.164.902-.462,1.25Zm8.462,12.831c0,.552-.448,1-1,1h-8c-.552,0-1-.448-1-1s.448-1,1-1h8c.552,0,1,.448,1,1Zm0-4c0,.552-.448,1-1,1h-8c-.552,0-1-.448-1-1s.448-1,1-1h8c.552,0,1,.448,1,1Zm-6-5h5c.552,0,1,.448,1,1s-.448,1-1,1h-5c-.552,0-1-.448-1-1s.448-1,1-1Z" />
                </svg>
                <span>{t('filters')}</span>
              </>
            )}
          </button>

          <div
            className={cn(
              'absolute right-0 top-[calc(100%+12px)] w-[min(92vw,460px)] origin-top-right overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-md transition-all duration-300',
              isOpen
                ? 'pointer-events-auto max-h-[80svh] translate-y-0 opacity-100'
                : 'pointer-events-none max-h-0 -translate-y-2 opacity-0',
            )}
          >
            <div className="border-b border-neutral-200/80 px-5 py-4">
              <h1 className="text-xl font-semibold text-neutral-950">{t('refineMemories')}</h1>
            </div>

            <div className="flex max-h-[calc(80svh-88px)] flex-col gap-4 overflow-y-auto p-5">
              {filtersContent}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'w-full rounded-[28px] corner-shape-squircle border border-white/75 bg-white/55 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-sm pointer-events-auto flex flex-col',
        dense ? 'gap-3 p-4' : 'gap-4 p-5 sm:p-6',
      )}
    >
      {!hideHeader ? (
        <div className="flex flex-row justify-between gap-4 py-1">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-950">{t('memories')}</h1>
            <p className="mt-1 text-sm text-stone-600">
              {t('browseBody')}
            </p>
          </div>
          <PrimaryButton href="/memories/new" className="rounded-full">
            {t('addMemory')}
          </PrimaryButton>
        </div>
      ) : null}
      {filtersContent}
    </div>
  )
}
