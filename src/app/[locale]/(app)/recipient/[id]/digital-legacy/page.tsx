import { RecipientDigitalLegacyList } from '@/components/recipient/RecipientContentSections'
import { RecipientPageShell } from '@/components/recipient/RecipientPageShell'

export default async function RecipientDigitalLegacyPage({
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
      active="digital-legacy"
      breadcrumbLabel={t('subnav.digitalLegacy')}
      title={t('digitalLegacy.title')}
      body={t('digitalLegacy.body')}
    >
      {(delivery) => (
        <RecipientDigitalLegacyList
          items={delivery.data.digitalLegacyItems}
          labels={{
            empty: t('digitalLegacy.empty'),
          }}
        />
      )}
    </RecipientPageShell>
  )
}
import { getTranslations } from 'next-intl/server'
