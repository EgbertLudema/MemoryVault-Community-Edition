import { redirect } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import { BulletListIcon } from '@/components/icons/BulletListIcon'
import { MailIcon } from '@/components/icons/MailIcon'
import { MemoryBookIcon } from '@/components/icons/MemoryBookIcon'
import { RecipientHelpTour } from '@/components/onboarding/RecipientHelpTour'
import { getRecipientDeliverySummaries, getRecipientUser } from '@/lib/recipientDeliveryServer'

function formatDate(value: string, fallback: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return fallback
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export default async function RecipientDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'RecipientPages' })
  const user = await getRecipientUser()

  if (!user) {
    redirect({ href: '/login', locale })
    return null
  }

  const deliveries = await getRecipientDeliverySummaries(user.id)
  const memoryCount = deliveries.reduce((total, delivery) => total + delivery.memoryCount, 0)
  const openWhenCount = deliveries.reduce((total, delivery) => total + delivery.openWhenCount, 0)
  const digitalLegacyCount = deliveries.reduce(
    (total, delivery) => total + delivery.digitalLegacyCount,
    0,
  )

  return (
    <main className="h-full overflow-y-auto bg-[linear-gradient(180deg,#fafafa_0%,#f8fafc_100%)]">
      <RecipientHelpTour />
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:pb-24">
        <section
          data-tour="recipient-dashboard-hero"
          className="rounded-[30px] corner-shape-squircle border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(250,245,255,0.9))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-8"
        >
          <div className="inline-flex rounded-full bg-purple-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-purple-700">
            {t('dashboard.badge')}
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
            {t('dashboard.title')}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600 sm:text-base">
            {t('dashboard.body')}
          </p>

          <div data-tour="recipient-dashboard-stats" className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl corner-shape-squircle border border-purple-100 bg-white/80 p-5">
              <div className="flex items-center gap-3">
                <MemoryBookIcon className="h-5 w-5 text-purple-700" />
                <div className="text-sm font-semibold text-stone-600">{t('labels.memories')}</div>
              </div>
              <div className="mt-3 text-3xl font-bold text-stone-950">{memoryCount}</div>
            </div>
            <div className="rounded-2xl corner-shape-squircle border border-purple-100 bg-white/80 p-5">
              <div className="flex items-center gap-3">
                <MailIcon className="h-5 w-5 text-purple-700" />
                <div className="text-sm font-semibold text-stone-600">{t('labels.openWhen')}</div>
              </div>
              <div className="mt-3 text-3xl font-bold text-stone-950">{openWhenCount}</div>
            </div>
            <div className="rounded-2xl corner-shape-squircle border border-purple-100 bg-white/80 p-5">
              <div className="flex items-center gap-3">
                <BulletListIcon className="h-5 w-5 text-purple-700" />
                <div className="text-sm font-semibold text-stone-600">
                  {t('labels.digitalLegacy')}
                </div>
              </div>
              <div className="mt-3 text-3xl font-bold text-stone-950">{digitalLegacyCount}</div>
            </div>
          </div>
        </section>

        <section data-tour="recipient-dashboard-list" className="mt-6 grid gap-4">
          {deliveries.length === 0 ? (
            <div
              data-tour="recipient-dashboard-collection"
              className="rounded-[28px] corner-shape-squircle border border-dashed border-purple-200 bg-white/80 p-10 text-center text-stone-600"
            >
              {t('dashboard.empty')}
            </div>
          ) : null}

          {deliveries.map((delivery) => (
            <Link
              key={delivery.id}
              href={`/recipient/${delivery.id}`}
              data-tour="recipient-dashboard-collection"
              className="block rounded-[28px] corner-shape-squircle border border-white/75 bg-white/88 p-5 text-inherit no-underline shadow-[0_16px_45px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-purple-200"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-700">
                    {t('dashboard.sharedCollection')}
                  </div>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-stone-950">
                    {t('forRecipient', { name: delivery.recipientName })}
                  </h2>
                  {delivery.ownerDisplayName ? (
                    <div className="mt-3 flex items-center gap-2.5">
                      {delivery.ownerProfileImageSrc ? (
                        <img
                          src={delivery.ownerProfileImageSrc}
                          alt=""
                          className="h-9 w-9 rounded-full border border-white bg-stone-100 object-cover shadow-sm"
                        />
                      ) : (
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                          {delivery.ownerDisplayName.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 text-sm text-stone-600">
                        {t('labels.sharedBy', { name: delivery.ownerDisplayName })}
                      </div>
                    </div>
                  ) : null}
                  <p className="mt-1 text-sm text-stone-500">
                    {formatDate(delivery.deliveredAt, t('dashboard.recentlyShared'))}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                    {t('dashboard.memoryCount', { count: delivery.memoryCount })}
                  </span>
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                    {t('dashboard.openWhenCount', { count: delivery.openWhenCount })}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {t('dashboard.digitalLegacyCount', {
                      count: delivery.digitalLegacyCount,
                    })}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}
import { getTranslations } from 'next-intl/server'
