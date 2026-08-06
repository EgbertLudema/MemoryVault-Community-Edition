import { Link } from '@/i18n/navigation'
import { BulletListIcon } from '@/components/icons/BulletListIcon'
import { MailIcon } from '@/components/icons/MailIcon'
import { MemoryBookIcon } from '@/components/icons/MemoryBookIcon'
import { RecipientPageShell } from '@/components/recipient/RecipientPageShell'

export default async function RecipientCollectionPage({
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
      active="dashboard"
      breadcrumbLabel={t('subnav.dashboard')}
      title={t('collection.title')}
      body={t('collection.body')}
    >
      {(delivery) => (
        <div className="grid gap-4 lg:grid-cols-3">
          <Link
            href={`/recipient/${delivery.id}/memories`}
            className="rounded-[28px] corner-shape-squircle border border-white/75 bg-white/88 p-6 text-inherit no-underline shadow-[0_16px_45px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-purple-200"
          >
            <MemoryBookIcon className="h-6 w-6 text-purple-700" />
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-stone-950">
              {t('labels.memories')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {t('collection.memoriesBody', { count: delivery.data.memories.length })}
            </p>
          </Link>
          <Link
            href={`/recipient/${delivery.id}/open-when-messages`}
            className="rounded-[28px] corner-shape-squircle border border-white/75 bg-white/88 p-6 text-inherit no-underline shadow-[0_16px_45px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-purple-200"
          >
            <MailIcon className="h-6 w-6 text-purple-700" />
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-stone-950">
              {t('labels.openWhen')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {t('collection.openWhenBody', { count: delivery.data.openWhenMessages.length })}
            </p>
          </Link>
          <Link
            href={`/recipient/${delivery.id}/digital-legacy`}
            className="rounded-[28px] corner-shape-squircle border border-white/75 bg-white/88 p-6 text-inherit no-underline shadow-[0_16px_45px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-purple-200"
          >
            <BulletListIcon className="h-6 w-6 text-purple-700" />
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-stone-950">
              {t('labels.digitalLegacy')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {t('collection.digitalLegacyBody', {
                count: delivery.data.digitalLegacyItems.length,
              })}
            </p>
          </Link>
        </div>
      )}
    </RecipientPageShell>
  )
}
import { getTranslations } from 'next-intl/server'
