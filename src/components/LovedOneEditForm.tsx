// components/LovedOneEditForm.tsx
'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { LovedOneFormFields, type LovedOneFormValues } from '@/components/LovedOneFormFields'

type LovedOneGroup = {
  id: string | number
  name: string
  isDefault?: boolean
  colorKey?: string | null
}

type LovedOne = {
  id: string | number
  fullName: string
  nickname?: string | null
  email?: string | null
  relationship: string
  customNote?: string | null
  groups?: Array<string | number | LovedOneGroup> | null
  group?: string | number | LovedOneGroup
}

function toPayloadId(id: string | number): string | number {
  if (typeof id === 'number') {
    return id
  }

  const trimmed = id.trim()

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed)
  }

  return trimmed
}

function normalizeGroupId(id: string | number): string {
  return String(id).trim()
}

function extractInitialGroupIds(lovedOne: LovedOne): string[] {
  const rawGroups = lovedOne.groups

  if (Array.isArray(rawGroups) && rawGroups.length > 0) {
    return rawGroups
      .map((g) => {
        if (typeof g === 'string' || typeof g === 'number') {
          return normalizeGroupId(g)
        }

        return g?.id != null ? normalizeGroupId(g.id) : ''
      })
      .filter(Boolean)
  }

  const rawGroup = lovedOne.group

  if (rawGroup != null) {
    if (typeof rawGroup === 'string' || typeof rawGroup === 'number') {
      return [normalizeGroupId(rawGroup)]
    }

    if (typeof rawGroup === 'object' && rawGroup.id != null) {
      return [normalizeGroupId(rawGroup.id)]
    }
  }

  return []
}

export function LovedOneEditForm({ lovedOne }: { lovedOne: LovedOne }) {
  const t = useTranslations('LovedOneForm')
  const router = useRouter()

  function closeModal() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }

    router.replace('/loved-ones')
  }

  async function handleSave(values: LovedOneFormValues) {
    const payloadGroupIds = values.groupIds.map((id) => toPayloadId(id))

    const res = await fetch(`/api/loved-ones/${toPayloadId(String(lovedOne.id))}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: values.fullName,
        nickname: values.nickname || null,
        email: values.email || null,
        relationship: values.relationship,
        customNote: values.customNote || null,
        groups: payloadGroupIds,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || t('saveFailed', { status: res.status }))
    }

    closeModal()

    setTimeout(() => {
      router.refresh()
    }, 50)
  }

  async function handleDelete() {
    const res = await fetch(`/api/loved-ones/${toPayloadId(String(lovedOne.id))}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || t('deleteFailed', { status: res.status }))
    }

    router.replace('/loved-ones')
    router.refresh()
  }

  return (
    <LovedOneFormFields
      initialValues={{
        fullName: lovedOne.fullName || '',
        nickname: lovedOne.nickname || '',
        email: lovedOne.email || '',
        relationship: lovedOne.relationship || '',
        customNote: lovedOne.customNote || '',
        groupIds: extractInitialGroupIds(lovedOne),
      }}
      submitLabel={t('saveChanges')}
      submittingLabel={t('saving')}
      deleteLabel={t('delete')}
      deletingLabel={t('deleting')}
      onSubmit={handleSave}
      onDelete={handleDelete}
      onCancel={closeModal}
    />
  )
}
