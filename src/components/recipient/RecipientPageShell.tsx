import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { RecipientBreadcrumbs } from '@/components/recipient/RecipientBreadcrumbs'
import { RecipientSubNav } from '@/components/recipient/RecipientSubNav'
import { RecipientHelpTour } from '@/components/onboarding/RecipientHelpTour'
import { getClaimedRecipientDelivery, getRecipientUser } from '@/lib/recipientDeliveryServer'

type RecipientPageShellProps = {
  locale: string
  deliveryId: string
  active: 'dashboard' | 'memories' | 'open-when' | 'digital-legacy'
  breadcrumbLabel: string
  title: string
  body: string
  children: (
    delivery: NonNullable<Awaited<ReturnType<typeof getClaimedRecipientDelivery>>>,
  ) => ReactNode
}

export async function RecipientPageShell({
  locale,
  deliveryId,
  active,
  breadcrumbLabel,
  title,
  body,
  children,
}: RecipientPageShellProps) {
  const t = await getTranslations({ locale, namespace: 'RecipientPages' })
  const user = await getRecipientUser()

  if (!user) {
    redirect({ href: '/login', locale })
    return null
  }

  const delivery = await getClaimedRecipientDelivery(user.id, deliveryId)

  if (!delivery) {
    redirect({ href: '/recipient', locale })
    return null
  }

  return (
    <main className="h-full overflow-y-auto bg-[linear-gradient(180deg,#fafafa_0%,#f8fafc_100%)]">
      <RecipientHelpTour />
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:pb-24">
        <RecipientBreadcrumbs
          rootLabel={t('breadcrumbs.root')}
          ariaLabel={t('breadcrumbs.aria')}
          items={[
            {
              label: t('breadcrumbs.forRecipient', { name: delivery.data.recipientName }),
              href: `/recipient/${delivery.id}`,
            },
            ...(active === 'dashboard' ? [] : [{ label: breadcrumbLabel }]),
          ]}
        />

        <section
          data-tour="recipient-detail-hero"
          className="mt-5 rounded-[30px] corner-shape-squircle border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(250,245,255,0.9))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-8"
        >
          <div className="inline-flex rounded-full bg-purple-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-purple-700">
            {t('forRecipient', { name: delivery.data.recipientName })}
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
            {title}
          </h1>
          {delivery.data.ownerDisplayName ? (
            <div className="mt-4 flex items-center gap-3">
              {delivery.data.ownerProfileImageSrc ? (
                <img
                  src={delivery.data.ownerProfileImageSrc}
                  alt=""
                  className="h-11 w-11 rounded-full border border-white bg-stone-100 object-cover shadow-sm"
                />
              ) : (
                <span className="grid h-11 w-11 place-items-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                  {delivery.data.ownerDisplayName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 text-sm font-semibold text-stone-700">
                {t('labels.sharedBy', { name: delivery.data.ownerDisplayName })}
              </div>
            </div>
          ) : null}
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600 sm:text-base">{body}</p>
          <div data-tour="recipient-subnav" className="mt-6">
            <RecipientSubNav
              deliveryId={delivery.id}
              active={active}
              labels={{
                aria: t('subnav.aria'),
                dashboard: t('subnav.dashboard'),
                memories: t('subnav.memories'),
                openWhen: t('subnav.openWhen'),
                digitalLegacy: t('subnav.digitalLegacy'),
              }}
            />
          </div>
        </section>

        <section data-tour="recipient-content" className="mt-6">
          {children(delivery)}
        </section>
      </div>
    </main>
  )
}
