'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Modal } from '@/components/Modal'
import { MemoryEditForm, type EditableMemory } from '@/components/MemoryEditForm'

export function MemoryEditModalClient({ memory }: { memory: EditableMemory }) {
  const t = useTranslations('MemoryEditForm')
  const router = useRouter()

  return (
    <Modal
      title={t('modalEditTitle', { title: memory.title || t('modalFallbackTitle') })}
      size="wide"
    >
      <MemoryEditForm
        memory={memory}
        mode="modal"
        onClose={() => router.back()}
        onSaved={() => router.back()}
        onDeleted={() => router.replace('/memories')}
      />
    </Modal>
  )
}
