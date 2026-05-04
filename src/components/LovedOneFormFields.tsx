'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { getDefaultGroupLabel } from '@/lib/groupMeta'
import { sortGroupsWithDefaultsFirst } from '@/lib/groupMeta'
import { getEffectiveGroupUiMeta, mapApiGroupToUiOption, type GroupUiOption } from '@/lib/groupUi'
import { GroupButton } from '@/components/ui/GroupButton'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { SecondaryButton } from './ui/SecondairyButton'

type LovedOneGroup = {
  id: string | number
  name: string
  isDefault?: boolean
  defaultKey?: string | null
  colorKey?: string | null
  iconKey?: string | null
}

export type LovedOneFormValues = {
  fullName: string
  nickname: string
  email: string
  relationship: string
  customNote: string
  groupIds: string[]
}

type LovedOneFormFieldsProps = {
  initialValues: LovedOneFormValues
  submitLabel: string
  submittingLabel: string
  onSubmit: (values: LovedOneFormValues) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
  deleteLabel?: string
  deletingLabel?: string
}

function normalizeGroupId(id: string | number): string {
  return String(id).trim()
}

function toggleId(list: string[], id: string): string[] {
  if (list.includes(id)) {
    return list.filter((x) => x !== id)
  }

  return [...list, id]
}

function toGroupUiOption(group: LovedOneGroup): GroupUiOption {
  return {
    id: String(group.id),
    label: group.name,
    name: group.name,
    isDefault: group.isDefault,
    defaultKey: group.defaultKey ?? null,
    iconKey: group.iconKey,
    colorKey: group.colorKey,
  }
}

function RequiredLabel({
  children,
  required = false,
}: {
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <span className="text-[13px] font-semibold">
      {children}
      {required ? <span className="ml-1 text-[#d20c17]">*</span> : null}
    </span>
  )
}

export function LovedOneFormFields({
  initialValues,
  submitLabel,
  submittingLabel,
  onSubmit,
  onCancel,
  onDelete,
  deleteLabel,
  deletingLabel,
}: LovedOneFormFieldsProps) {
  const t = useTranslations('LovedOneForm')
  const tGroups = useTranslations('GroupLabels')
  const [loading, setLoading] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const [groups, setGroups] = React.useState<LovedOneGroup[]>([])
  const [groupsLoading, setGroupsLoading] = React.useState(true)

  const [fullName, setFullName] = React.useState(initialValues.fullName)
  const [nickname, setNickname] = React.useState(initialValues.nickname)
  const [email, setEmail] = React.useState(initialValues.email)
  const [relationship, setRelationship] = React.useState(initialValues.relationship)
  const [customNote, setCustomNote] = React.useState(initialValues.customNote)
  const [groupIds, setGroupIds] = React.useState<string[]>(initialValues.groupIds)

  React.useEffect(() => {
    let mounted = true

    async function loadGroups() {
      try {
        setGroupsLoading(true)

        const res = await fetch('/api/loved-one-groups?limit=200&sort=name', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })

        if (!res.ok) {
          throw new Error(`Failed to load groups. Status: ${res.status}`)
        }

        const data = (await res.json()) as { docs?: any[] }
        const rawList = Array.isArray(data?.docs) ? data.docs : []
        const list = rawList
          .map((item) => mapApiGroupToUiOption(item))
          .filter((item): item is GroupUiOption => Boolean(item))
          .map((item) => ({
            id: item.id,
            name: item.name ?? item.label,
            isDefault: item.isDefault,
            defaultKey: item.defaultKey ?? null,
            colorKey: item.colorKey,
            iconKey: item.iconKey,
          }))

        if (!mounted) {
          return
        }

        setGroups(sortGroupsWithDefaultsFirst(list))
      } catch (e) {
        if (!mounted) {
          return
        }

        setError(e instanceof Error ? e.message : t('genericError'))
      } finally {
        if (mounted) {
          setGroupsLoading(false)
        }
      }
    }

    loadGroups()

    return () => {
      mounted = false
    }
  }, [t])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!fullName.trim()) {
      setError(t('fullNameRequired'))
      return
    }

    if (!relationship.trim()) {
      setError(t('relationshipRequired'))
      return
    }

    if (!email.trim()) {
      setError(t('emailRequired'))
      return
    }

    if (groupIds.length === 0) {
      setError(t('groupRequired'))
      return
    }

    try {
      setLoading(true)

      await onSubmit({
        fullName: fullName.trim(),
        nickname: nickname.trim(),
        email: email.trim(),
        relationship: relationship.trim(),
        customNote,
        groupIds,
      })

      setSuccess(t('saved'))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('genericError'))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) {
      return
    }

    setError(null)
    setSuccess(null)

    const ok = window.confirm(t('deleteConfirm', { name: fullName }))
    if (!ok) {
      return
    }

    try {
      setDeleting(true)
      await onDelete()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('genericError'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-[14px]">
      {error ? (
        <div className="rounded-xl border border-[#f2c9c9] bg-[#fff5f5] p-3 text-[13px] text-[#7a1f1f]">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-[#cfe8d6] bg-[#f3fff6] p-3 text-[13px] text-[#1f5f2e]">
          {success}
        </div>
      ) : null}

      <div className="grid gap-2">
        <label>
          <RequiredLabel required>{t('fullName')}</RequiredLabel>
        </label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t('fullNamePlaceholder')}
          className="h-[42px] rounded-xl border border-[#dddddd] bg-white px-3 text-[14px] outline-none"
        />
      </div>

      <div className="grid gap-2">
        <label>
          <RequiredLabel>{t('nickname')}</RequiredLabel>
        </label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t('nicknamePlaceholder')}
          className="h-[42px] rounded-xl border border-[#dddddd] bg-white px-3 text-[14px] outline-none"
        />
      </div>

      <div className="grid gap-2">
        <label>
          <RequiredLabel required>{t('email')}</RequiredLabel>
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          className="h-[42px] rounded-xl border border-[#dddddd] bg-white px-3 text-[14px] outline-none"
          inputMode="email"
        />
      </div>

      <div className="grid gap-2">
        <label>
          <RequiredLabel required>{t('relationship')}</RequiredLabel>
        </label>
        <input
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          placeholder={t('relationshipPlaceholder')}
          className="h-[42px] rounded-xl border border-[#dddddd] bg-white px-3 text-[14px] outline-none"
        />
      </div>

      <div className="grid gap-2">
        <label>
          <RequiredLabel>{t('customNote')}</RequiredLabel>
        </label>
        <textarea
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
          placeholder={t('customNotePlaceholder')}
          className="min-h-[110px] rounded-xl border border-[#dddddd] bg-white px-3 py-2.5 text-[14px] outline-none"
        />
        <div className="text-xs text-[#666666]">
          {t('customNoteHelp')}
        </div>
      </div>

      <div className="grid gap-2">
        <label>
          <RequiredLabel required>{t('groups')}</RequiredLabel>
        </label>

        <div
          className={`flex flex-wrap gap-2 rounded-xl border border-[#dddddd] bg-white p-[10px] ${
            groupsLoading ? 'opacity-70' : 'opacity-100'
          }`}
          aria-disabled={groupsLoading}
        >
          {groupsLoading ? (
            <span className="text-[13px] text-[#666666]">{t('loadingGroups')}</span>
          ) : null}

          {!groupsLoading && groups.length === 0 ? (
            <span className="text-[13px] text-[#666666]">{t('noGroupsFound')}</span>
          ) : null}

          {!groupsLoading
            ? groups.map((g) => {
                const id = normalizeGroupId(g.id)
                const selected = groupIds.includes(id)
                const meta = getEffectiveGroupUiMeta(toGroupUiOption(g))
                const IconComponent = meta.icon.Icon

                return (
                  <GroupButton
                    key={id}
                    label={getDefaultGroupLabel(g.defaultKey, g.name, (key) => tGroups(key))}
                    active={selected}
                    colorValue={meta.color.value}
                    onClick={() => setGroupIds((prev) => toggleId(prev, id))}
                    icon={<IconComponent className="h-4 w-4 shrink-0" />}
                  />
                )
              })
            : null}
        </div>

        <div className="text-xs text-[#666666]">
          {t('groupsManagePrefix')}{' '}
          <Link
            href="/loved-ones/groups"
            scroll={false}
            className="font-bold text-inherit no-underline"
          >
            /loved-ones/groups
          </Link>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap justify-between gap-2.5">
        {onDelete ? (
          <DeleteButton
            onClick={handleDelete}
            disabled={deleting || loading}
            className="h-10 px-[14px]"
          >
            {deleting ? deletingLabel ?? t('deleting') : deleteLabel ?? t('delete')}
          </DeleteButton>
        ) : (
          <div />
        )}

        <div className="flex gap-2.5">
          <SecondaryButton
            type="button"
            onClick={onCancel}
            className="h-10 cursor-pointer rounded-[10px] border border-[#dddddd] bg-white px-[14px] disabled:cursor-not-allowed disabled:opacity-80"
            disabled={loading || deleting}
          >
            {t('cancel')}
          </SecondaryButton>

          <PrimaryButton type="submit" disabled={loading || deleting} className="h-10 px-[14px]">
            {loading ? submittingLabel : submitLabel}
          </PrimaryButton>
        </div>
      </div>
    </form>
  )
}
