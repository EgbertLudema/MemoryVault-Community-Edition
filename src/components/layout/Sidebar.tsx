'use client'

import gsap from 'gsap'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { usePersistentState } from '@/app/_hooks/usePersistentState'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { formatStorageBytes } from '@/lib/storageLimits'
import { AccountCircleIcon } from '../icons/AccountCircleIcon'
import { BulletListIcon } from '../icons/BulletListIcon'
import { HouseIcon } from '../icons/HouseIcon'
import { LockIcon } from '../icons/LockIcon'
import { MailIcon } from '../icons/MailIcon'
import { MemoryBookIcon } from '../icons/MemoryBookIcon'
import { OpenBookIcon } from '../icons/OpenBookIcon'
import { TwoPersonsIcon } from '../icons/TwoPersonsIcon'
import { CollapseButton } from '../ui/CollapseButton'
import { LogoutButton } from '../ui/LogoutButton'
import { MemoryVaultLogo } from '../ui/MemoryVaultLogo'

type NavItem = {
  label: string
  href: string
  icon?: React.ReactNode
}

type HighlightStyle = {
  top: number
  left: number
  width: number
  height: number
  opacity: number
  scaleX: number
  scaleY: number
  transformOrigin: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function getHighlightStyle(
  target: HTMLElement | null | undefined,
  container: HTMLElement | null | undefined,
): HighlightStyle {
  if (!target || !container) {
    return {
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      opacity: 0,
      scaleX: 1,
      scaleY: 1,
      transformOrigin: 'center center',
    }
  }

  const targetRect = target.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  return {
    top: targetRect.top - containerRect.top,
    left: targetRect.left - containerRect.left,
    width: targetRect.width,
    height: targetRect.height,
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    transformOrigin: 'center center',
  }
}

function getHiddenHighlightStyle(current: HighlightStyle): HighlightStyle {
  return {
    ...current,
    opacity: 0,
    scaleX: 0.35,
    scaleY: 1,
    transformOrigin: 'left center',
  }
}

const linkBaseClass =
  'group flex items-center gap-3 rounded-xl corner-shape-squircle px-4 py-3 text-sm font-medium transition-colors duration-200'

const iconWrapperClass =
  'inline-flex h-5 w-5 shrink-0 items-center justify-center self-center transition-colors duration-200 ease-out'

const iconSvgClass = 'block h-[18px] w-[18px] pointer-events-none'
const iconMotionClass =
  'inline-flex h-full w-full items-center justify-center origin-center transform-gpu transition-transform duration-200 ease-out motion-reduce:transform-none group-hover:-rotate-2 group-hover:scale-105'

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

export function Sidebar(props: {
  userFullName?: string | null
  userProfileImageSrc?: string | null
  legacyProtectionNeedsAttention?: boolean
  mobileOpen?: boolean
  onMobileClose?: () => void
  plan?: 'free' | 'pro' | 'community'
  storageUsedBytes?: number
  storageLimitBytes?: number | null
  memoryCount?: number
  memoryCountLimit?: number | null
  openWhenMessageCount?: number
  openWhenMessageCountLimit?: number | null
}) {
  const t = useTranslations('Sidebar')
  const pathname = usePathname()
  const router = useRouter()

  const [collapsed, setCollapsed] = usePersistentState<boolean>('ui.sidebar.collapsed', false)
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null)
  const [highlightStyle, setHighlightStyle] = React.useState<HighlightStyle>({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    opacity: 0,
    scaleX: 1,
    scaleY: 1,
    transformOrigin: 'center center',
  })
  const displayName = props.userFullName?.trim() || t('accountFallback')
  const mobileOpen = props.mobileOpen ?? false
  const effectiveCollapsed = mobileOpen ? false : collapsed

  const sidebarRef = React.useRef<HTMLElement | null>(null)
  const navListRef = React.useRef<HTMLUListElement | null>(null)
  const itemRefs = React.useRef<Record<string, HTMLElement | null>>({})
  const hasAnimatedMobileSidebarRef = React.useRef(false)

  const modeToggleRef = React.useRef<HTMLDivElement | null>(null)
  const modeTogglePillRef = React.useRef<HTMLDivElement | null>(null)
  const ownVaultTabRef = React.useRef<HTMLElement | null>(null)
  const recipientTabRef = React.useRef<HTMLElement | null>(null)
  const hasPositionedModeTogglePillRef = React.useRef(false)

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

  const updateModeTogglePill = React.useCallback(
    (animate: boolean) => {
      const container = modeToggleRef.current
      const pill = modeTogglePillRef.current
      const activeTab = isRecipientMode ? recipientTabRef.current : ownVaultTabRef.current

      if (!container || !pill || !activeTab) {
        return
      }

      const containerRect = container.getBoundingClientRect()
      const tabRect = activeTab.getBoundingClientRect()
      const target = {
        x: tabRect.left - containerRect.left,
        y: tabRect.top - containerRect.top,
        width: tabRect.width,
        height: tabRect.height,
        opacity: 1,
      }

      gsap.killTweensOf(pill)

      if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set(pill, target)
        return
      }

      gsap.to(pill, { ...target, duration: 0.45, ease: 'back.out(1.5)' })
    },
    [isRecipientMode],
  )

  React.useLayoutEffect(() => {
    updateModeTogglePill(hasPositionedModeTogglePillRef.current)
    hasPositionedModeTogglePillRef.current = true
  }, [updateModeTogglePill, effectiveCollapsed])

  React.useEffect(() => {
    const handleResize = () => updateModeTogglePill(false)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateModeTogglePill])

  const ownVaultNavItems: NavItem[] = [
    {
      label: t('dashboard'),
      href: '/dashboard',
      icon: <HouseIcon className={iconSvgClass} />,
    },
    {
      label: t('myLovedOnes'),
      href: '/loved-ones',
      icon: <TwoPersonsIcon className={iconSvgClass} />,
    },
    ...(props.plan === 'community'
      ? []
      : [
          {
            label: t('digitalLegacy'),
            href: '/digital-legacy',
            icon: <BulletListIcon className={iconSvgClass} />,
          },
        ]),
    {
      label: t('openWhenMessages'),
      href: '/open-when-messages',
      icon: <MailIcon className={iconSvgClass} />,
    },
    {
      label: t('myMemories'),
      href: '/memories',
      icon: <MemoryBookIcon className={iconSvgClass} />,
    },
  ]

  const recipientNavItems: NavItem[] = [
    {
      label: t('dashboard'),
      href: '/recipient/dashboard',
      icon: <HouseIcon className={iconSvgClass} />,
    },
    {
      label: t('sharedVaults'),
      href: '/recipient',
      icon: <OpenBookIcon className={iconSvgClass} />,
    },
  ]

  const navItems: NavItem[] = isRecipientMode ? recipientNavItems : ownVaultNavItems

  const itemIsActive = React.useCallback(
    (href: string) => {
      if (href === '/recipient') {
        return (
          pathname === '/recipient' ||
          (pathname?.startsWith('/recipient/') && !pathname.startsWith('/recipient/dashboard'))
        )
      }

      return pathname === href || (href !== '/' && pathname?.startsWith(href))
    },
    [pathname],
  )

  const accountActive = pathname.startsWith('/account')

  const planLabel =
    props.plan === 'pro' ? t('planPro') : props.plan === 'community' ? t('planCommunity') : t('planFree')
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

  const highlightedKey = hoveredKey

  const updateHighlight = React.useCallback(() => {
    const nextStyle = getHighlightStyle(
      highlightedKey ? itemRefs.current[highlightedKey] : null,
      navListRef.current,
    )

    setHighlightStyle((current) =>
      nextStyle.opacity === 0 ? getHiddenHighlightStyle(current) : nextStyle,
    )
  }, [highlightedKey])

  React.useLayoutEffect(() => {
    updateHighlight()
  }, [updateHighlight, effectiveCollapsed])

  React.useEffect(() => {
    document.documentElement.style.setProperty('--app-sidebar-width', collapsed ? '66px' : '300px')
  }, [collapsed])

  React.useEffect(() => {
    window.addEventListener('resize', updateHighlight)
    return () => window.removeEventListener('resize', updateHighlight)
  }, [updateHighlight])

  React.useLayoutEffect(() => {
    const sidebar = sidebarRef.current
    if (!sidebar) {
      return
    }

    const mobileQuery = window.matchMedia('(max-width: 1023px)')
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const syncSidebarPosition = () => {
      gsap.killTweensOf(sidebar)

      if (!mobileQuery.matches) {
        gsap.set(sidebar, { clearProps: 'transform' })
        return
      }

      if (reduceMotionQuery.matches) {
        gsap.set(sidebar, { x: 0, xPercent: mobileOpen ? 0 : -100 })
        hasAnimatedMobileSidebarRef.current = true
        return
      }

      if (mobileOpen) {
        gsap.to(sidebar, {
          x: 0,
          xPercent: 0,
          duration: 0.32,
          ease: 'power2.out',
        })
      } else if (hasAnimatedMobileSidebarRef.current) {
        gsap.to(sidebar, {
          x: 0,
          xPercent: -100,
          duration: 0.3,
          ease: 'power2.inOut',
        })
      } else {
        gsap.set(sidebar, { x: 0, xPercent: -100 })
      }

      hasAnimatedMobileSidebarRef.current = true
    }

    syncSidebarPosition()
    mobileQuery.addEventListener('change', syncSidebarPosition)
    reduceMotionQuery.addEventListener('change', syncSidebarPosition)

    return () => {
      mobileQuery.removeEventListener('change', syncSidebarPosition)
      reduceMotionQuery.removeEventListener('change', syncSidebarPosition)
      gsap.killTweensOf(sidebar)
    }
  }, [mobileOpen])

  async function handleLogout() {
    props.onMobileClose?.()

    try {
      await fetch('/api/app-auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Ignore logout errors
    }

    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      ref={sidebarRef}
      data-tour="app-sidebar"
      className={cn(
        'mobile-sidebar-panel fixed inset-y-0 -left-4 z-50 hidden h-dvh w-[min(316px,calc(100vw-16px))] border-r border-neutral-200 bg-white pl-4 shadow-sm lg:sticky lg:left-auto lg:top-0 lg:z-10 lg:flex lg:h-screen lg:pl-0',
        'lg:transition-[width] lg:duration-400 lg:ease-out',
        collapsed ? 'lg:w-[66px]' : 'lg:w-[300px]',
      )}
      aria-label="Sidebar"
    >
      <div className="flex min-h-0 w-full flex-col">
        <div className="hidden items-end justify-end px-4 pt-3 lg:flex">
          <CollapseButton collapsed={collapsed} setCollapsed={setCollapsed} />
        </div>

        <div className="flex items-center justify-end px-4 pt-3 lg:hidden">
          <CollapseButton collapsed={false} setCollapsed={() => props.onMobileClose?.()} />
        </div>

        <div className="flex items-center justify-between gap-2 px-2 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center">
              <MemoryVaultLogo />
            </div>

            {!effectiveCollapsed && (
              <div className="min-w-0">
                <div className="truncate bg-linear-to-r from-[#825EBA] via-purple-500 to-[#A479E3] bg-clip-text font-serif text-3xl font-semibold text-transparent">
                  Memory Vault
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-2 pb-2">
          <div
            ref={modeToggleRef}
            role="tablist"
            aria-label={t('modeToggleLabel')}
            className={cn(
              'relative flex items-center gap-1 rounded-xl corner-shape-squircle bg-stone-50 p-1',
              effectiveCollapsed && 'flex-col',
            )}
          >
            <div
              ref={modeTogglePillRef}
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 rounded-lg corner-shape-squircle bg-white shadow-sm"
              style={{ opacity: 0 }}
            />

            <Link
              ref={(element) => {
                ownVaultTabRef.current = element
              }}
              href="/dashboard"
              role="tab"
              aria-selected={!isRecipientMode}
              title={effectiveCollapsed ? t('modeOwnVault') : undefined}
              onClick={props.onMobileClose}
              className={cn(
                'relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg corner-shape-squircle px-2 py-1.5 text-xs font-semibold transition-colors duration-200',
                effectiveCollapsed && 'w-full flex-none',
                !isRecipientMode ? 'text-purple-600' : 'text-stone-500 hover:text-stone-700',
              )}
            >
              <LockIcon className="h-[14px] w-[14px] shrink-0" />
              {!effectiveCollapsed && <span className="truncate">{t('modeOwnVault')}</span>}
            </Link>
            <Link
              ref={(element) => {
                recipientTabRef.current = element
              }}
              href="/recipient/dashboard"
              role="tab"
              aria-selected={isRecipientMode}
              title={effectiveCollapsed ? t('recipient') : undefined}
              onClick={props.onMobileClose}
              className={cn(
                'relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg corner-shape-squircle px-2 py-1.5 text-xs font-semibold transition-colors duration-200',
                effectiveCollapsed && 'w-full flex-none',
                isRecipientMode ? 'text-purple-600' : 'text-stone-500 hover:text-stone-700',
              )}
            >
              <OpenBookIcon className="h-[14px] w-[14px] shrink-0" />
              {!effectiveCollapsed && <span className="truncate">{t('recipient')}</span>}
            </Link>
          </div>
        </div>

        <div
          onMouseLeave={() => setHoveredKey(null)}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-4 [scrollbar-width:thin]"
        >
          <nav>
            <ul
              ref={navListRef}
              onMouseLeave={() => setHoveredKey(null)}
              className="relative space-y-3"
            >
              <div
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute rounded-xl corner-shape-squircle transition-[transform,width,height,opacity,background-color] duration-300 ease-out',
                  'bg-stone-50',
                )}
                style={{
                  width: `${highlightStyle.width}px`,
                  height: `${highlightStyle.height}px`,
                  opacity: highlightStyle.opacity,
                  transform: `translate3d(${highlightStyle.left}px, ${highlightStyle.top}px, 0) scale(${highlightStyle.scaleX}, ${highlightStyle.scaleY})`,
                  transformOrigin: highlightStyle.transformOrigin,
                }}
              />
              {navItems.map((item) => {
                const active = itemIsActive(item.href)
                const highlighted = highlightedKey === item.href

                return (
                  <li key={item.href}>
                    <Link
                      data-tour={
                        item.href === '/dashboard'
                          ? 'sidebar-dashboard-link'
                          : item.href === '/memories'
                            ? 'sidebar-memories-link'
                            : item.href === '/loved-ones'
                              ? 'sidebar-loved-ones-link'
                                : undefined
                      }
                      href={item.href}
                      ref={(element) => {
                        itemRefs.current[item.href] = element
                      }}
                      onMouseEnter={() => setHoveredKey(item.href)}
                      onFocus={() => setHoveredKey(item.href)}
                      className={cn(
                        linkBaseClass,
                        'relative active:scale-[0.98]',
                        effectiveCollapsed && 'justify-center',
                        active
                          ? 'bg-purple-100 text-purple-500'
                          : highlighted
                            ? 'text-stone-700'
                            : 'bg-transparent text-stone-500',
                      )}
                      title={effectiveCollapsed ? item.label : undefined}
                      aria-current={active ? 'page' : undefined}
                      onClick={props.onMobileClose}
                    >
                      <span
                        className={cn(
                          iconWrapperClass,
                          'relative z-10',
                          highlighted
                            ? 'text-inherit'
                            : active
                              ? 'text-purple-500'
                              : 'group-hover:text-stone-700',
                        )}
                      >
                        <span className={iconMotionClass}>
                          {item.icon ?? <span className="text-lg leading-none">*</span>}
                        </span>
                      </span>

                      {!effectiveCollapsed && (
                        <span
                          className={cn(
                            'relative z-10 truncate transition-colors duration-200',
                            highlighted
                              ? 'text-inherit'
                              : active
                                ? 'text-purple-500'
                                : 'group-hover:text-stone-700',
                          )}
                        >
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>

        <div className="shrink-0 space-y-2 px-2 py-4">
          {!effectiveCollapsed && props.plan !== undefined ? (
            <Link
              href="/account"
              className="block rounded-xl corner-shape-squircle border border-stone-200/80 bg-stone-50 px-4 py-3 text-xs transition-colors duration-200 hover:border-purple-200 hover:bg-purple-50"
              onClick={props.onMobileClose}
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
                <div className="mt-1 text-stone-500">{t('storageUnlimited')}</div>
              )}

              {props.plan === 'free' &&
              props.memoryCount !== undefined &&
              props.memoryCountLimit ? (
                <div className="mt-2 flex items-center justify-between text-stone-500">
                  <span>{t('memoriesShort')}</span>
                  <span className={cn(memoryLimitReached && 'font-bold text-red-600')}>
                    {props.memoryCount} / {props.memoryCountLimit}
                  </span>
                </div>
              ) : null}

              {props.plan === 'free' &&
              props.openWhenMessageCount !== undefined &&
              props.openWhenMessageCountLimit ? (
                <div className="mt-1 flex items-center justify-between text-stone-500">
                  <span>{t('openWhenShort')}</span>
                  <span className={cn(openWhenLimitReached && 'font-bold text-red-600')}>
                    {props.openWhenMessageCount} / {props.openWhenMessageCountLimit}
                  </span>
                </div>
              ) : null}
            </Link>
          ) : null}

          {!effectiveCollapsed ? <LanguageSwitcher variant="sidebar" /> : null}

          <Link
            data-tour="sidebar-account-link"
            href="/account"
            className={cn(
              linkBaseClass,
              'active:scale-[0.98]',
              accountActive ? 'bg-purple-100 text-purple-600' : 'text-stone-500 hover:bg-stone-50',
              effectiveCollapsed && 'justify-center',
            )}
            aria-current={accountActive ? 'page' : undefined}
            onClick={props.onMobileClose}
          >
            <span className="relative inline-flex h-10 w-10 shrink-0">
              <span
                className={cn(
                  'inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-white',
                  accountActive ? 'border-purple-200' : 'group-hover:border-stone-300',
                )}
              >
                {props.userProfileImageSrc?.trim() ? (
                  <img
                    src={props.userProfileImageSrc.trim()}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className={cn(
                      iconWrapperClass,
                      accountActive ? 'text-inherit' : 'group-hover:text-stone-700',
                    )}
                  >
                    <span className={iconMotionClass}>
                      <AccountCircleIcon className={iconSvgClass} />
                    </span>
                  </span>
                )}
              </span>
              {props.legacyProtectionNeedsAttention ? (
                <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border border-white bg-amber-500" />
              ) : null}
            </span>

            {!effectiveCollapsed && (
              <div className="min-w-0">
                <div
                  className={cn(
                    'truncate transition-colors duration-200',
                    accountActive ? 'text-inherit' : 'group-hover:text-stone-700',
                  )}
                >
                  {displayName}
                </div>
                <div className="truncate text-xs text-stone-500 transition-colors duration-200 group-hover:text-stone-600">
                  {props.legacyProtectionNeedsAttention ? t('actionNeeded') : t('viewProfile')}
                </div>
              </div>
            )}
          </Link>

          <LogoutButton collapsed={effectiveCollapsed} onLogout={handleLogout} variant="sidebar" />
        </div>
      </div>
    </aside>
  )
}
