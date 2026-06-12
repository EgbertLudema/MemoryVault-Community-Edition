import { RecipientMemoryGrid } from '@/components/recipient/RecipientContentSections'
import { RecipientPageShell } from '@/components/recipient/RecipientPageShell'

export default async function RecipientMemoriesPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const t = await getTranslations({ locale, namespace: 'RecipientPages' })

  return (
    <RecipientPageShell
      locale={locale}
      deliveryId={id}
      active="memories"
      breadcrumbLabel={t('subnav.memories')}
      title={t('memories.title')}
      body={t('memories.body')}
    >
      {(delivery) => (
        <RecipientMemoryGrid
          memories={delivery.data.memories}
          labels={{
            undated: t('labels.undated'),
            noMemories: t('memories.empty'),
          }}
        />
      )}
    </RecipientPageShell>
  )
}
import { getTranslations } from 'next-intl/server'
