'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Sidebar } from '@/components/layout/Sidebar'
import { AppHelpButton } from '@/components/onboarding/AppHelpButton'
import { AppIntroTour } from '@/components/onboarding/AppIntroTour'
import { AccountCircleIcon } from '@/components/icons/AccountCircleIcon'
import { BulletListIcon } from '@/components/icons/BulletListIcon'
import { HouseIcon } from '@/components/icons/HouseIcon'
import { LockIcon } from '@/components/icons/LockIcon'
import { MailIcon } from '@/components/icons/MailIcon'
import { MemoryBookIcon } from '@/components/icons/MemoryBookIcon'
import { OpenBookIcon } from '@/components/icons/OpenBookIcon'
import { TwoPersonsIcon } from '@/components/icons/TwoPersonsIcon'
import { XIcon } from '@/components/icons/XIcon'
import { LogoutButton } from '@/components/ui/LogoutButton'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { analytics } from '@/lib/analytics'
import { formatStorageBytes } from '@/lib/storageLimits'

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const mobileIconClass = 'h-[20px] w-[20px]'

const OWN_VAULT_PREFIXES = [
  '/dashboard',
  '/loved-ones',
  '/digital-legacy',
  '/open-when-messages',
  '/memories',
]

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function MobileBottomNav(props: {
  userFullName?: string | null
  userProfileImageSrc?: string | null
  legacyProtectionNeedsAttention?: boolean
  plan?: 'free' | 'pro' | 'community'
  storageUsedBytes?: number
  storageLimitBytes?: number | null
  memoryCount?: number
  memoryCountLimit?: number | null
  openWhenMessageCount?: number
  openWhenMessageCountLimit?: number | null
}) {
  const t = useTranslations('MobileNav')
  const sidebarT = useTranslations('Sidebar')
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const displayName = props.userFullName?.trim() || sidebarT('accountFallback')

  const [sidebarMode, setSidebarMode] = React.useState<'own' | 'recipient'>(() =>
    pathname?.startsWith('/recipient') ? 'recipient' : 'own',
  )

  React.useEffect(() => {
    if (pathname?.startsWith('/recipient')) {
      setSidebarMode('recipient')
    } else if (matchesPrefix(pathname, OWN_VAULT_PREFIXES)) {
      setSidebarMode('own')
    }
    // Neutral pages shared between both modes (e.g. /feature-ideas, /account)
    // intentionally leave the current mode untouched.
  }, [pathname])

  const isRecipientMode = sidebarMode === 'recipient'

  const planLabel =
    props.plan === 'pro'
      ? sidebarT('planPro')
      : props.plan === 'community'
        ? sidebarT('planCommunity')
        : sidebarT('planFree')
  const storageLimitBytes = props.storageLimitBytes
  const storageUsedBytes = props.storageUsedBytes ?? 0
  const storagePercent =
    storageLimitBytes && storageLimitBytes > 0
      ? Math.min(100, Math.round((storageUsedBytes / storageLimitBytes) * 100))
      : 0
  const storageLimitReached = Boolean(storageLimitBytes) && storageUsedBytes >= storageLimitBytes!
  const memoryLimitReached =
    props.memoryCountLimit != null &&
    props.memoryCount !== undefined &&
    props.memoryCount >= props.memoryCountLimit
  const openWhenLimitReached =
    props.openWhenMessageCountLimit != null &&
    props.openWhenMessageCount !== undefined &&
    props.openWhenMessageCount >= props.openWhenMessageCountLimit

  const ownVaultNavItems = [
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
    ...(props.plan === 'community'
      ? []
      : [
          {
            label: t('digitalLegacy'),
            href: '/digital-legacy',
            icon: <BulletListIcon className={mobileIconClass} />,
          },
        ]),
    {
      label: t('openWhen'),
      href: '/open-when-messages',
      icon: <MailIcon className={mobileIconClass} />,
    },
    {
      label: t('memories'),
      href: '/memories',
      icon: <MemoryBookIcon className={mobileIconClass} />,
    },
  ]

  const recipientNavItems = [
    {
      label: t('dashboard'),
      href: '/recipient/dashboard',
      icon: <HouseIcon className={mobileIconClass} />,
    },
    {
      label: sidebarT('sharedVaults'),
      href: '/recipient',
      icon: <OpenBookIcon className={mobileIconClass} />,
    },
  ]

  const navItems = isRecipientMode ? recipientNavItems : ownVaultNavItems

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

        <div
          role="tablist"
          aria-label={sidebarT('modeToggleLabel')}
          className="mt-6 flex items-center gap-1 rounded-xl corner-shape-squircle bg-stone-50 p-1"
        >
          <Link
            href="/dashboard"
            role="tab"
            aria-selected={!isRecipientMode}
            onClick={() => setMenuOpen(false)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg corner-shape-squircle px-2 py-2 text-xs font-semibold transition-colors duration-200',
              !isRecipientMode ? 'bg-white text-purple-600 shadow-sm' : 'text-stone-500',
            )}
          >
            <LockIcon className="h-[14px] w-[14px] shrink-0" />
            {sidebarT('modeOwnVault')}
          </Link>
          <Link
            href="/recipient/dashboard"
            role="tab"
            aria-selected={isRecipientMode}
            onClick={() => setMenuOpen(false)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg corner-shape-squircle px-2 py-2 text-xs font-semibold transition-colors duration-200',
              isRecipientMode ? 'bg-white text-purple-600 shadow-sm' : 'text-stone-500',
            )}
          >
            <OpenBookIcon className="h-[14px] w-[14px] shrink-0" />
            {sidebarT('recipient')}
          </Link>
        </div>

        <nav className="mt-4 grid gap-2" aria-label={t('menu')}>
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

        {props.plan !== undefined ? (
          <Link
            href="/account"
            onClick={() => setMenuOpen(false)}
            className="mt-4 block rounded-xl corner-shape-squircle border border-stone-200/80 bg-stone-50 px-4 py-3 text-xs transition-colors duration-200 hover:border-purple-200 hover:bg-purple-50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-stone-700">{planLabel}</span>
              {storageLimitBytes ? (
                <span className={cn(storageLimitReached ? 'font-bold text-red-600' : 'text-stone-500')}>
                  {formatStorageBytes(storageUsedBytes)} / {formatStorageBytes(storageLimitBytes)}
                </span>
              ) : null}
            </div>

            {storageLimitBytes ? (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                <div
                  className={cn('h-full rounded-full', storageLimitReached ? 'bg-red-600' : 'bg-purple-500')}
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
            ) : (
              <div className="mt-1 text-stone-500">{sidebarT('storageUnlimited')}</div>
            )}

            {props.plan === 'free' && props.memoryCount !== undefined && props.memoryCountLimit ? (
              <div className="mt-2 flex items-center justify-between text-stone-500">
                <span>{sidebarT('memoriesShort')}</span>
                <span className={cn(memoryLimitReached && 'font-bold text-red-600')}>
                  {props.memoryCount} / {props.memoryCountLimit}
                </span>
              </div>
            ) : null}

            {props.plan === 'free' &&
            props.openWhenMessageCount !== undefined &&
            props.openWhenMessageCountLimit ? (
              <div className="mt-1 flex items-center justify-between text-stone-500">
                <span>{sidebarT('openWhenShort')}</span>
                <span className={cn(openWhenLimitReached && 'font-bold text-red-600')}>
                  {props.openWhenMessageCount} / {props.openWhenMessageCountLimit}
                </span>
              </div>
            ) : null}
          </Link>
        ) : null}

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
        <ul
          className="grid gap-0.5"
          style={{ gridTemplateColumns: `repeat(${navItems.length + 1}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => {
            const active =
              item.href === '/recipient'
                ? pathname === '/recipient' ||
                  (pathname.startsWith('/recipient/') && !pathname.startsWith('/recipient/dashboard'))
                : pathname === item.href || pathname.startsWith(`${item.href}/`)

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
  plan?: 'free' | 'pro' | 'community'
  storageUsedBytes?: number
  storageLimitBytes?: number | null
  memoryCount?: number
  memoryCountLimit?: number | null
  openWhenMessageCount?: number
  openWhenMessageCountLimit?: number | null
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
          plan={props.plan}
          storageUsedBytes={props.storageUsedBytes}
          storageLimitBytes={props.storageLimitBytes}
          memoryCount={props.memoryCount}
          memoryCountLimit={props.memoryCountLimit}
          openWhenMessageCount={props.openWhenMessageCount}
          openWhenMessageCountLimit={props.openWhenMessageCountLimit}
        />

        <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden pb-[calc(4.35rem+env(safe-area-inset-bottom))] lg:pb-0">
          {props.children}
        </main>
      </div>
      <MobileBottomNav
        userFullName={props.userFullName}
        userProfileImageSrc={props.userProfileImageSrc}
        legacyProtectionNeedsAttention={legacyProtectionNeedsAttention}
        plan={props.plan}
        storageUsedBytes={props.storageUsedBytes}
        storageLimitBytes={props.storageLimitBytes}
        memoryCount={props.memoryCount}
        memoryCountLimit={props.memoryCountLimit}
        openWhenMessageCount={props.openWhenMessageCount}
        openWhenMessageCountLimit={props.openWhenMessageCountLimit}
      />
    </div>
  )
}
