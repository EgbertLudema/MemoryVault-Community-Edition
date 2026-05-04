// components/LovedOneForm.tsx
'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { LovedOneFormFields, type LovedOneFormValues } from '@/components/LovedOneFormFields'

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

export function LovedOneForm() {
  const t = useTranslations('LovedOneForm')
  const router = useRouter()

  function closeModal() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }

    router.replace('/loved-ones')
  }

  async function handleCreate(values: LovedOneFormValues) {
    const payloadGroupIds = values.groupIds.map((id) => toPayloadId(id))

    const res = await fetch('/api/loved-ones', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: values.fullName,
        nickname: values.nickname || undefined,
        email: values.email || undefined,
        relationship: values.relationship,
        customNote: values.customNote || undefined,
        groups: payloadGroupIds,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || t('createFailed', { status: res.status }))
    }

    closeModal()

    setTimeout(() => {
      router.refresh()
    }, 50)
  }

  return (
    <LovedOneFormFields
      initialValues={{
        fullName: '',
        nickname: '',
        email: '',
        relationship: '',
        customNote: '',
        groupIds: [],
      }}
      submitLabel={t('create')}
      submittingLabel={t('creating')}
      onSubmit={handleCreate}
      onCancel={closeModal}
    />
  )
}
