'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Sidebar } from '@/components/layout/Sidebar'
import { AppHelpButton } from '@/components/onboarding/AppHelpButton'
import { AppIntroTour } from '@/components/onboarding/AppIntroTour'
import { AccountCircleIcon } from '@/components/icons/AccountCircleIcon'
import { HouseIcon } from '@/components/icons/HouseIcon'
import { MailIcon } from '@/components/icons/MailIcon'
import { MemoryBookIcon } from '@/components/icons/MemoryBookIcon'
import { OpenBookIcon } from '@/components/icons/OpenBookIcon'
import { TwoPersonsIcon } from '@/components/icons/TwoPersonsIcon'
import { WorldIcon } from '@/components/icons/WorldIcon'
import { XIcon } from '@/components/icons/XIcon'
import { LogoutButton } from '@/components/ui/LogoutButton'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { analytics } from '@/lib/analytics'

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const mobileIconClass = 'h-[20px] w-[20px]'

function MobileBottomNav(props: {
  userFullName?: string | null
  userProfileImageSrc?: string | null
  legacyProtectionNeedsAttention?: boolean
}) {
  const t = useTranslations('MobileNav')
  const sidebarT = useTranslations('Sidebar')
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const displayName = props.userFullName?.trim() || sidebarT('accountFallback')

  const navItems = [
    {
      label: t('dashboard'),
      href: '/dashboard',
      icon: <HouseIcon className={mobileIconClass} />,
    },
    {
      label: t('lovedOnes'),
      href: '/loved-ones',
      icon: <TwoPersonsIcon className={mobileIconClass} />,
    },
    {
      label: t('memories'),
      href: '/memories',
      icon: <MemoryBookIcon className={mobileIconClass} />,
    },
    {
      label: t('openWhen'),
      href: '/open-when-messages',
      icon: <MailIcon className={mobileIconClass} />,
    },
    {
      label: t('recipient'),
      href: '/recipient',
      icon: <OpenBookIcon className={mobileIconClass} />,
    },
  ]

  const drawerItems = [
    {
      label: t('account'),
      href: '/account',
      icon: props.userProfileImageSrc?.trim() ? (
        <span className="relative inline-flex h-8 w-8">
          <span className="inline-flex h-8 w-8 overflow-hidden rounded-full border border-current/20">
            <img
              src={props.userProfileImageSrc.trim()}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          </span>
          {props.legacyProtectionNeedsAttention ? (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-amber-500" />
          ) : null}
        </span>
      ) : (
        <AccountCircleIcon className="h-5 w-5" />
      ),
    },
    {
      label: t('website'),
      href: '/',
      icon: <WorldIcon className="h-5 w-5" />,
    },
  ]

  async function handleLogout() {
    setMenuOpen(false)

    try {
      const response = await fetch('/api/app-auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        analytics.capture('logout_completed', { source: 'account' })
        analytics.reset()
      }
    } catch {
      // Ignore logout errors
    }

    router.push('/')
    router.refresh()
  }

  return (
    <>
      {menuOpen ? (
        <button
          type="button"
          aria-label={t('closeMenu')}
          className="fixed inset-0 z-40 bg-black/25 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed bottom-0 right-0 top-0 z-50 flex w-[min(340px,calc(100vw-24px))] flex-col border-l border-stone-200 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] shadow-[0_0_45px_rgba(15,23,42,0.18)] transition-transform duration-300 lg:hidden',
          menuOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-hidden={!menuOpen}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-bold tracking-tight text-stone-950">{t('menu')}</div>
            <div className="truncate text-sm text-stone-500">{displayName}</div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-stone-600"
            aria-label={t('closeMenu')}
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 grid gap-2" aria-label={t('menu')}>
          {drawerItems.map((item) => {
            const active = !item.href.startsWith('http') && (pathname === item.href || pathname.startsWith(`${item.href}/`))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold no-underline transition',
                  active ? 'bg-purple-100 text-purple-700' : 'text-stone-600 hover:bg-stone-50',
                )}
                aria-current={active ? 'page' : undefined}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-4">
          <LanguageSwitcher variant="full" />
        </div>

        <div className="mt-auto">
          <LogoutButton onLogout={handleLogout} variant="sidebar" />
        </div>
      </aside>

      <nav
        aria-label="Primary"
        data-tour="mobile-bottom-nav"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-6 gap-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[10px] font-medium leading-tight transition-colors active:scale-[0.98]',
                    active ? 'bg-purple-100 text-purple-600' : 'text-stone-500 hover:bg-stone-50',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="relative flex h-6 items-center justify-center">{item.icon}</span>
                  <span className="max-w-full truncate pb-0.5">{item.label}</span>
                </Link>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={cn(
                'flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[10px] font-medium leading-tight text-stone-500 transition-colors hover:bg-stone-50 active:scale-[0.98]',
                menuOpen && 'bg-purple-100 text-purple-600',
              )}
              aria-label={t('menu')}
              aria-expanded={menuOpen}
            >
              <span className="flex h-6 w-6 flex-col items-center justify-center gap-1">
                <span className="h-0.5 w-5 rounded-full bg-current" />
                <span className="h-0.5 w-5 rounded-full bg-current" />
                <span className="h-0.5 w-5 rounded-full bg-current" />
              </span>
              <span className="max-w-full truncate pb-0.5">{t('menu')}</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  )
}

export function AppShell(props: {
  children: React.ReactNode
  userId: number
  userFullName?: string | null
  userProfileImageSrc?: string | null
  appIntroCompleted?: boolean | null
  enableLegacyProtection?: boolean | null
  legacyProtectionPendingEnable?: boolean | null
}) {
  const legacyProtectionNeedsAttention =
    !props.enableLegacyProtection || Boolean(props.legacyProtectionPendingEnable)

  React.useEffect(() => {
    analytics.identify(props.userId)
  }, [props.userId])

  return (
    <div className="h-dvh w-full overflow-hidden bg-neutral-50">
      <AppIntroTour
        userId={props.userId}
        userFullName={props.userFullName}
        initialCompleted={props.appIntroCompleted}
      />
      <AppHelpButton />
      <div className="flex h-full w-full overflow-hidden">
        <Sidebar
          userFullName={props.userFullName}
          userProfileImageSrc={props.userProfileImageSrc}
          legacyProtectionNeedsAttention={legacyProtectionNeedsAttention}
        />

        <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden pb-[calc(4.35rem+env(safe-area-inset-bottom))] lg:pb-0">
          {props.children}
        </main>
      </div>
      <MobileBottomNav
        userFullName={props.userFullName}
        userProfileImageSrc={props.userProfileImageSrc}
        legacyProtectionNeedsAttention={legacyProtectionNeedsAttention}
      />
    </div>
  )
}
