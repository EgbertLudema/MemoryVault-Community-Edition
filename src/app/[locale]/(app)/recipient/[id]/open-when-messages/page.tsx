import { RecipientOpenWhenList } from '@/components/recipient/RecipientContentSections'
import { RecipientPageShell } from '@/components/recipient/RecipientPageShell'

export default async function RecipientOpenWhenMessagesPage({
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
      active="open-when"
      breadcrumbLabel={t('subnav.openWhen')}
      title={t('openWhen.title')}
      body={t('openWhen.body')}
    >
      {(delivery) => (
        <RecipientOpenWhenList
          openWhenMessages={delivery.data.openWhenMessages}
          labels={{
            noOpenWhen: t('openWhen.empty'),
            fallbackOpenWhen: t('openWhen.fallbackOpenWhen'),
            fallbackTitle: t('openWhen.fallbackTitle'),
            undated: t('labels.undated'),
          }}
        />
      )}
    </RecipientPageShell>
  )
}
import { getTranslations } from 'next-intl/server'
