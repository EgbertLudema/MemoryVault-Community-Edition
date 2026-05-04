// app/(app)/@modal/(.)memories/new/page.tsx
'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/Modal'
import { MemoryEditForm } from '@/components/MemoryEditForm'

export default function NewMemoryModalPage() {
  const t = useTranslations('MemoryEditForm')
  const router = useRouter()

  return (
    <Modal title={t('newTitle')} size="wide">
      <MemoryEditForm mode="modal" onClose={() => router.back()} onSaved={() => router.back()} />
    </Modal>
  )
}
