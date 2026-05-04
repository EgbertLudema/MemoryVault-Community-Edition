'use client'

import { useRouter } from '@/i18n/navigation'
import { MemoryEditForm, type EditableMemory } from '@/components/MemoryEditForm'

export function MemoryDetailPageClient({
  memory,
  mode = 'page',
}: {
  memory: EditableMemory
  mode?: 'page' | 'modal'
}) {
  const router = useRouter()

  function close() {
    if (mode === 'modal') {
      router.back()
      return
    }

    router.push('/memories')
  }

  return (
    <MemoryEditForm
      memory={memory}
      mode={mode}
      onClose={close}
      onSaved={close}
      onDeleted={() => router.replace('/memories')}
    />
  )
}
