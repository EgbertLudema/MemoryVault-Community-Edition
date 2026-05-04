'use client'

import gsap from 'gsap'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { DashboardLoadReveal } from '@/components/dashboard/DashboardLoadReveal'
import { SearchIcon } from '@/components/icons/SearchIcon'
import { RotateLeftIcon } from '@/components/icons/RotateLeftIcon'
import { getDefaultGroupLabel } from '@/lib/groupMeta'
import { getEffectiveGroupUiMeta } from '@/lib/groupUi'
import { GroupButton } from '@/components/ui/GroupButton'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { LovedOneCard } from '@/components/ui/LovedOneCard'

type LovedOneGroup = {
  id: string
  name: string
  isDefault?: boolean
  defaultKey?: string | null
  iconKey?: string | null
  colorKey?: string | null
}

type LovedOne = {
  id: string
  fullName: string
  nickname?: string | null
  email?: string | null
  relationship: string
  customNote?: string | null
  groups: Array<string | LovedOneGroup>
  createdAt?: string
  updatedAt?: string
}

export function LovedOnesDirectoryClient({ lovedOnes }: { lovedOnes: LovedOne[] }) {
  const t = useTranslations('LovedOnesPage')
  const tGroups = useTranslations('GroupLabels')
  const [query, setQuery] = useState('')
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  const previousRectsRef = useRef(new Map<string, DOMRect>())
  const pendingAnimationRef = useRef(false)
  const [resetSpinTick, setResetSpinTick] = useState(0)

  const availableGroups = useMemo(() => {
    const groupMap = new Map<string, LovedOneGroup>()

    lovedOnes.forEach((person) => {
      const groups = Array.isArray(person.groups) ? person.groups : []
      groups.forEach((group) => {
        if (typeof group === 'string' || !group?.id || !group?.name) {
          return
        }

        const id = String(group.id).trim()
        if (!groupMap.has(id)) {
          groupMap.set(id, {
            id,
            name: group.name,
            isDefault: group.isDefault,
            defaultKey: group.defaultKey ?? null,
            iconKey: group.iconKey ?? null,
            colorKey: group.colorKey ?? null,
          })
        }
      })
    })

    return Array.from(groupMap.values())
  }, [lovedOnes])

  const filteredLovedOnes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return lovedOnes.filter((person) => {
      const personGroupIds = (Array.isArray(person.groups) ? person.groups : [])
        .filter((group): group is LovedOneGroup => typeof group !== 'string' && Boolean(group?.id))
        .map((group) => String(group.id).trim())

      const matchesGroup =
        selectedGroupIds.length === 0 ||
        selectedGroupIds.some((groupId) => personGroupIds.includes(groupId))

      if (!matchesGroup) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      const haystack = [
        person.fullName,
        person.nickname ?? '',
        person.relationship,
        person.email ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [lovedOnes, query, selectedGroupIds])

  const snapshotLayout = () => {
    const nextRects = new Map<string, DOMRect>()

    for (const [id, element] of cardRefs.current.entries()) {
      nextRects.set(id, element.getBoundingClientRect())
    }

    previousRectsRef.current = nextRects
    pendingAnimationRef.current = nextRects.size > 0
  }

  useLayoutEffect(() => {
    if (!pendingAnimationRef.current) {
      return
    }

    const activeAnimations: HTMLDivElement[] = []

    cardRefs.current.forEach((element, id) => {
      const previousRect = previousRectsRef.current.get(id)
      const currentRect = element.getBoundingClientRect()

      activeAnimations.push(element)
      gsap.killTweensOf(element)

      if (previousRect) {
        const deltaX = previousRect.left - currentRect.left
        const deltaY = previousRect.top - currentRect.top

        if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
          gsap.fromTo(
            element,
            {
              x: deltaX,
              y: deltaY,
            },
            {
              x: 0,
              y: 0,
              duration: 0.38,
              ease: 'power2.out',
              clearProps: 'transform',
            },
          )
        }
        return
      }

      gsap.fromTo(
        element,
        {
          autoAlpha: 0,
          y: 18,
          scale: 0.97,
        },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.36,
          ease: 'power2.out',
          clearProps: 'opacity,transform,visibility',
        },
      )
    })

    pendingAnimationRef.current = false
    previousRectsRef.current = new Map()

    return () => {
      activeAnimations.forEach((element) => gsap.killTweensOf(element))
    }
  }, [filteredLovedOnes])

  if (lovedOnes.length === 0) {
    return (
      <div className="mt-6 rounded-[28px] corner-shape-squircle border border-dashed border-rose-200 bg-[linear-gradient(135deg,rgba(255,245,247,0.95),rgba(255,255,255,0.97))] p-8 text-center">
        <div className="mx-auto max-w-md">
          <div className="text-lg font-semibold text-gray-900">{t('emptyTitle')}</div>
          <p className="mt-2 text-sm leading-6 text-stone-600">{t('emptyBody')}</p>

          <div className="mt-5 flex justify-center">
            <PrimaryButton href="/loved-ones/new" className="rounded-full px-5 py-3">
              {t('addLovedOne')}
            </PrimaryButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full flex-1">
            <SearchIcon
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => {
                snapshotLayout()
                setQuery(event.target.value)
              }}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              className="h-12 w-full rounded-full border border-rose-100 bg-rose-50/70 pl-11 pr-4 text-sm text-stone-700 outline-none transition placeholder:text-stone-400 focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-200"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                snapshotLayout()
                setQuery('')
                setSelectedGroupIds([])
              }}
              onMouseEnter={() => {
                if (query.trim() || selectedGroupIds.length > 0) {
                  setResetSpinTick((value) => value + 1)
                }
              }}
              disabled={!query.trim() && selectedGroupIds.length === 0}
              className={[
                'inline-flex h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium transition-all',
                query.trim() || selectedGroupIds.length > 0
                  ? 'cursor-pointer border-stone-200 bg-white/85 text-stone-700 shadow-[0_10px_24px_rgba(15,23,42,0.04)] hover:border-stone-300 hover:bg-white'
                  : 'cursor-not-allowed border-stone-200/70 bg-white/60 text-stone-400',
              ].join(' ')}
            >
              <RotateLeftIcon
                key={resetSpinTick}
                className={[
                  'h-3.5 w-3.5 shrink-0',
                  query.trim() || selectedGroupIds.length > 0
                    ? 'animate-memory-filter-reset-spin'
                    : '',
                ].join(' ')}
              />
              {t('resetFilters')}
            </button>

            <div className="rounded-full border border-rose-100 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">
              {t('peopleCount', { count: filteredLovedOnes.length })}
            </div>
          </div>
        </div>

        {availableGroups.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <GroupButton
              label={t('allGroups')}
              active={selectedGroupIds.length === 0}
              onClick={() => {
                snapshotLayout()
                setSelectedGroupIds([])
              }}
              colorValue="gray"
            />

            {availableGroups.map((group) => {
              const meta = getEffectiveGroupUiMeta({
                id: group.id,
                label: group.name,
                name: group.name,
                isDefault: group.isDefault,
                defaultKey: group.defaultKey ?? null,
                iconKey: group.iconKey ?? null,
                colorKey: group.colorKey ?? null,
              })
              const IconComponent = meta.icon.Icon
              const label = getDefaultGroupLabel(group.defaultKey, group.name, (key) =>
                tGroups(key),
              )
              const isActive = selectedGroupIds.includes(group.id)

              return (
                <GroupButton
                  key={group.id}
                  label={label}
                  active={isActive}
                  colorValue={meta.color.value}
                  onClick={() => {
                    snapshotLayout()
                    setSelectedGroupIds((current) =>
                      current.includes(group.id) ? [] : [group.id],
                    )
                  }}
                  icon={<IconComponent className="h-4 w-4 shrink-0" />}
                />
              )
            })}
          </div>
        ) : null}
      </div>

      {filteredLovedOnes.length === 0 ? (
        <div className="mt-6 rounded-[28px] corner-shape-squircle border border-dashed border-rose-200 bg-[linear-gradient(135deg,rgba(255,245,247,0.95),rgba(255,255,255,0.97))] p-8 text-center">
          <div className="mx-auto max-w-md">
            <div className="text-lg font-semibold text-gray-900">{t('searchEmptyTitle')}</div>
            <p className="mt-2 text-sm leading-6 text-stone-600">{t('searchEmptyBody')}</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredLovedOnes.map((person, index) => (
            <DashboardLoadReveal key={person.id} delayMs={180 + index * 45}>
              <div
                ref={(element) => {
                  if (element) {
                    cardRefs.current.set(person.id, element)
                    return
                  }

                  cardRefs.current.delete(person.id)
                }}
              >
                <LovedOneCard lovedOne={person} tourTarget={index === 0} />
              </div>
            </DashboardLoadReveal>
          ))}
        </div>
      )}

      <div className="mt-6">
        <PrimaryButton href="/loved-ones/new" className="rounded-full px-5 py-3">
          {t('addAnother')}
        </PrimaryButton>
      </div>
    </>
  )
}
