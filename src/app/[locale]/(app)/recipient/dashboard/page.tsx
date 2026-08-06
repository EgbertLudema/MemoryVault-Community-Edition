import { getTranslations } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { ShakeHandsIcon } from '@/components/icons/ShakeHandsIcon'
import { getRecipientUser } from '@/lib/recipientDeliveryServer'

export default async function RecipientOwnDashboardPage({
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

  return (
    <main className="h-full overflow-y-auto bg-[linear-gradient(180deg,#fafafa_0%,#f8fafc_100%)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:pb-24">
        <section
          data-tour="recipient-own-dashboard-hero"
          className="rounded-[30px] corner-shape-squircle border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(250,245,255,0.9))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-8"
        >
          <div className="inline-flex rounded-full bg-purple-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-purple-700">
            {t('ownDashboard.badge')}
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
            {t('ownDashboard.title')}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600 sm:text-base">
            {t('ownDashboard.body')}
          </p>
        </section>

        <section className="mt-6">
          <div className="rounded-[28px] corner-shape-squircle border border-dashed border-purple-200 bg-white/80 p-10 text-center text-stone-600">
            <ShakeHandsIcon className="mx-auto h-8 w-8 text-purple-400" />
            <p className="mt-4 text-sm leading-6">{t('ownDashboard.comingSoon')}</p>
          </div>
        </section>
      </div>
    </main>
  )
}
