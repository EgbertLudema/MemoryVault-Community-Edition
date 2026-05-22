'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Sidebar } from '@/components/layout/Sidebar'
import { AppHelpButton } from '@/components/onboarding/AppHelpButton'
import { AppIntroTour } from '@/components/onboarding/AppIntroTour'
import { AccountCircleIcon } from '@/components/icons/AccountCircleIcon'
import { HouseIcon } from '@/components/icons/HouseIcon'
import { MemoryBookIcon } from '@/components/icons/MemoryBookIcon'
import { TwoPersonsIcon } from '@/components/icons/TwoPersonsIcon'
import { WorldIcon } from '@/components/icons/WorldIcon'
import { Link, usePathname } from '@/i18n/navigation'

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
  const displayName = props.userFullName?.trim() || sidebarT('accountFallback')

  const navItems = [
    {
      label: t('dashboard'),
      href: '/dashboard',
      icon: <HouseIcon className={mobileIconClass} />,
    },
    {
      label: t('memories'),
      href: '/memories',
      icon: <MemoryBookIcon className={mobileIconClass} />,
    },
    {
      label: t('lovedOnes'),
      href: '/loved-ones',
      icon: <TwoPersonsIcon className={mobileIconClass} />,
    },
    {
      label: t('website'),
      href: '/',
      icon: <WorldIcon className={mobileIconClass} />,
    },
    {
      label: t('account'),
      href: '/account',
      icon: props.userProfileImageSrc?.trim() ? (
        <span className="relative inline-flex h-6 w-6">
          <span className="inline-flex h-6 w-6 overflow-hidden rounded-full border border-current/20">
            <img
              src={props.userProfileImageSrc.trim()}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          </span>
        </span>
      ) : (
        <AccountCircleIcon className={mobileIconClass} />
      ),
    },
  ]

  return (
    <nav
      aria-label="Primary"
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
                  'flex h-14 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[10px] font-medium leading-none transition-colors active:scale-[0.98]',
                  active ? 'bg-purple-100 text-purple-600' : 'text-stone-500 hover:bg-stone-50',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span className="relative flex h-6 items-center justify-center">
                  {item.icon}
                  {item.href === '/account' && props.legacyProtectionNeedsAttention ? (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-white bg-amber-500" />
                  ) : null}
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
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
