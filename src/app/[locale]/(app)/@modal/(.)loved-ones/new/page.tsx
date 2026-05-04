// app/(app)/@modal/(.)loved-ones/new/page.tsx
import { getTranslations } from 'next-intl/server'
import { Modal } from '@/components/Modal'
import { LovedOneForm } from '@/components/LovedOneForm'

export default async function LovedOnesNewModalPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'LovedOneForm' })
  return (
    <Modal title={t('modalCreateTitle')}>
      <LovedOneForm />
    </Modal>
  )
}
