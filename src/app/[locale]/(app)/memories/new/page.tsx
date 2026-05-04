// app/(app)/memories/new/page.tsx
'use client'

import { useRouter } from '@/i18n/navigation'
import { MemoryEditForm } from '@/components/MemoryEditForm'

export default function NewMemoryPage() {
  const router = useRouter()

  return (
    <MemoryEditForm
      mode="page"
      onClose={() => router.push('/memories')}
      onSaved={() => router.push('/memories')}
    />
  )
}
