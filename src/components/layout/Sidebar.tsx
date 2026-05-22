'use client'

import gsap from 'gsap'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { usePersistentState } from '@/app/_hooks/usePersistentState'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { AccountCircleIcon } from '../icons/AccountCircleIcon'
import { HouseIcon } from '../icons/HouseIcon'
import { MemoryBookIcon } from '../icons/MemoryBookIcon'
import { TwoPersonsIcon } from '../icons/TwoPersonsIcon'
import { WorldIcon } from '../icons/WorldIcon'
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

export function Sidebar(props: {
  userFullName?: string | null
  userProfileImageSrc?: string | null
  legacyProtectionNeedsAttention?: boolean
  mobileOpen?: boolean
  onMobileClose?: () => void
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

  const navItems: NavItem[] = [
    {
      label: t('dashboard'),
      href: '/dashboard',
      icon: <HouseIcon className={iconSvgClass} />,
    },
    {
      label: t('myMemories'),
      href: '/memories',
      icon: <MemoryBookIcon className={iconSvgClass} />,
    },
    {
      label: t('myLovedOnes'),
      href: '/loved-ones',
      icon: <TwoPersonsIcon className={iconSvgClass} />,
    },
  ]

  const itemIsActive = React.useCallback(
    (href: string) => pathname === href || (href !== '/' && pathname?.startsWith(href)),
    [pathname],
  )

  const accountActive = pathname.startsWith('/account')

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

    router.push('/')
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
      <div className="flex w-full flex-col">
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

        <div onMouseLeave={() => setHoveredKey(null)} className="flex-1 px-2 py-4">
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

        <div className="space-y-2 px-2 py-4">
          <Link
            href="/"
            className={cn(
              linkBaseClass,
              'w-full active:scale-[0.98]',
              itemIsActive('/')
                ? 'bg-purple-100 text-purple-500'
                : 'text-stone-500 hover:bg-stone-50',
              effectiveCollapsed && 'justify-center',
            )}
            title={effectiveCollapsed ? t('website') : undefined}
            aria-current={itemIsActive('/') ? 'page' : undefined}
            onClick={props.onMobileClose}
          >
            <span
              className={cn(
                iconWrapperClass,
                itemIsActive('/') ? 'text-inherit' : 'group-hover:text-stone-700',
              )}
            >
              <span className={iconMotionClass}>
                <WorldIcon className={iconSvgClass} />
              </span>
            </span>

            {!effectiveCollapsed && (
              <span className="truncate transition-colors duration-200 group-hover:text-stone-700">
                {t('website')}
              </span>
            )}
          </Link>

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
