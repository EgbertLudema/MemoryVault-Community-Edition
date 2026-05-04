'use client'

// components/ui/LovedOneCard.tsx
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { RedirectIcon } from '@/components/icons/RedirectIcon'
import { getDefaultGroupLabel } from '@/lib/groupMeta'
import { getEffectiveGroupUiMeta, type GroupUiOption } from '@/lib/groupUi'
import { getEffectiveLovedOneNote } from '@/lib/lovedOneNotes'
import { EditIcon } from '@/components/icons/EditIcon'

type LovedOneGroup = {
  id: string
  name: string
  isDefault?: boolean
  defaultKey?: string | null
  colorKey?: string | null
  iconKey?: string | null
}

type LovedOne = {
  id: string
  fullName: string
  nickname?: string | null
  email?: string | null
  relationship: string
  customNote?: string | null
  groups?: Array<string | LovedOneGroup>
  createdAt?: string
  updatedAt?: string
}

function getDisplayGroups(groups: Array<string | LovedOneGroup> | undefined): LovedOneGroup[] {
  if (!Array.isArray(groups)) {
    return []
  }

  return groups.filter((group): group is LovedOneGroup => {
    return typeof group !== 'string' && !!group?.name
  })
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '').trim()

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(17, 17, 17, ${alpha})`
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function toGroupUiOption(group: LovedOneGroup): GroupUiOption {
  return {
    id: group.id,
    label: group.name,
    name: group.name,
    isDefault: group.isDefault,
    defaultKey: group.defaultKey ?? null,
    iconKey: group.iconKey,
    colorKey: group.colorKey,
  }
}

export function LovedOneCard({
  lovedOne,
  tourTarget = false,
}: {
  lovedOne: LovedOne
  tourTarget?: boolean
}) {
  const t = useTranslations('LovedOneCard')
  const tGroups = useTranslations('GroupLabels')
  const displayGroups = getDisplayGroups(lovedOne.groups)
  const note = getEffectiveLovedOneNote(lovedOne.customNote)
  const cardTourId = tourTarget ? 'loved-ones-first-card' : undefined
  const editTourId = tourTarget ? 'loved-ones-first-card-edit' : undefined

  return (
    <article
      className="rounded-[24px] corner-shape-squircle border border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(255,249,250,0.95))] p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition-all duration-200 ease-out hover:-translate-y-1 hover:border-rose-200 hover:shadow-[0_18px_40px_rgba(244,114,182,0.12)]"
      data-tour={cardTourId}
    >
      <Link
        href={`/loved-ones/person/${lovedOne.id}`}
        scroll={false}
        prefetch={false}
        className="block text-inherit no-underline"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="inline-flex rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
              {t('lovedOne')}
            </div>

            <h2 className="m-0 mt-4 truncate text-[18px] font-bold tracking-tight text-[#111111]">
              {lovedOne.fullName}
            </h2>

            {lovedOne.nickname ? (
              <p className="mb-0 mt-1.5 truncate text-[14px] text-[#666666]">
                &quot;{lovedOne.nickname}&quot;
              </p>
            ) : null}
          </div>

          {displayGroups.length > 0 ? (
            <div className="flex max-w-[48%] flex-wrap justify-end gap-2">
              {displayGroups.map((group) => {
                const meta = getEffectiveGroupUiMeta(toGroupUiOption(group))
                const IconComponent = meta.icon.Icon
                const colorValue = meta.color.value

                const badgeStyle = {
                  borderColor: hexToRgba(colorValue, 0.22),
                  backgroundColor: hexToRgba(colorValue, 0.1),
                  color: colorValue,
                }
                const groupLabel = getDefaultGroupLabel(
                  group.defaultKey,
                  group.name,
                  (key) => tGroups(key),
                )

                return (
                  <span
                    key={group.id}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full corner-shape-squircle border px-[10px] py-[6px] text-[12px] font-medium backdrop-blur-sm"
                    style={badgeStyle}
                  >
                    <IconComponent className="h-3.5 w-3.5 shrink-0" />
                    <span>{groupLabel}</span>
                  </span>
                )
              })}
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          <p className="m-0 text-[14px] text-[#444444]">
            <span className="font-semibold">{t('relationship')}:</span> {lovedOne.relationship}
          </p>

          {lovedOne.email ? (
            <p className="m-0 truncate text-[14px] text-[#444444]">
              <span className="font-semibold">{t('email')}:</span> {lovedOne.email}
            </p>
          ) : null}
        </div>

        <div className="mt-4 rounded-[18px] border border-rose-100 bg-rose-50/70 p-3">
          <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.14em] text-rose-700">
            {t('note')}
          </p>
          <p className="m-0 mt-2 text-[14px] leading-6 text-[#5b4450]">{note}</p>
        </div>
      </Link>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/loved-ones/person/${lovedOne.id}`}
          scroll={false}
          prefetch={false}
          className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700 no-underline transition-colors duration-200 hover:text-rose-800"
          data-tour={editTourId}
        >
          <EditIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{t('editDetails')}</span>
        </Link>

        <Link
          href={`/loved-ones/preview/${lovedOne.id}`}
          prefetch={false}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-2 text-sm font-semibold text-purple-700 no-underline transition hover:border-purple-300 hover:bg-purple-100 hover:text-purple-800"
        >
          {t('viewRecipientPage')}
          <RedirectIcon className="h-4 w-4 shrink-0" />
        </Link>
      </div>
    </article>
  )
}
