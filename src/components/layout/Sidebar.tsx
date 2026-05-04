'use client'

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { usePersistentState } from '@/app/_hooks/usePersistentState'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { AccountCircleIcon } from '../icons/AccountCircleIcon'
import { HouseIcon } from '../icons/HouseIcon'
import { MemoryBookIcon } from '../icons/MemoryBookIcon'
import { OpenStarIcon } from '../icons/OpenStarIcon'
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

export function Sidebar(props: { userFullName?: string | null; userProfileImageSrc?: string | null }) {
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

  const navListRef = React.useRef<HTMLUListElement | null>(null)
  const itemRefs = React.useRef<Record<string, HTMLElement | null>>({})

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
    {
      label: t('featureIdeas'),
      href: '/feature-ideas',
      icon: <OpenStarIcon className={iconSvgClass} />,
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
  }, [updateHighlight, collapsed])

  React.useEffect(() => {
    window.addEventListener('resize', updateHighlight)
    return () => window.removeEventListener('resize', updateHighlight)
  }, [updateHighlight])

  async function handleLogout() {
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
      data-tour="app-sidebar"
      className={cn(
        'sticky top-0 z-10 hidden h-screen border-r border-neutral-200 bg-white shadow-sm lg:flex',
        'transition-[width] duration-400 ease-out',
        collapsed ? 'w-[66px]' : 'w-[300px]',
      )}
      aria-label="Sidebar"
    >
      <div className="flex w-full flex-col">
        <div className="flex items-end justify-end px-4 pt-3">
          <CollapseButton collapsed={collapsed} setCollapsed={setCollapsed} />
        </div>

        <div className="flex items-center justify-between gap-2 px-2 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center">
              <MemoryVaultLogo />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate bg-linear-to-r from-[#825EBA] via-purple-500 to-[#A479E3] bg-clip-text font-serif text-3xl font-semibold text-transparent">
                  Memory Vault
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          onMouseLeave={() => setHoveredKey(null)}
          className="flex-1 px-2 py-4"
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
                              : item.href === '/feature-ideas'
                                ? 'sidebar-feature-ideas-link'
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
                        collapsed && 'justify-center',
                        active
                          ? 'bg-purple-100 text-purple-500'
                          : highlighted
                            ? 'text-stone-700'
                            : 'bg-transparent text-stone-500',
                      )}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? 'page' : undefined}
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

                      {!collapsed && (
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
          {!collapsed ? <LanguageSwitcher variant="sidebar" /> : null}

          <Link
            data-tour="sidebar-account-link"
            href="/account"
            className={cn(
              linkBaseClass,
              'active:scale-[0.98]',
              accountActive ? 'bg-purple-100 text-purple-600' : 'text-stone-500 hover:bg-stone-50',
              collapsed && 'justify-center',
            )}
            aria-current={accountActive ? 'page' : undefined}
          >
            <span
              className={cn(
                'inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-white',
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

            {!collapsed && (
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
                  {t('viewProfile')}
                </div>
              </div>
            )}
          </Link>

          <LogoutButton collapsed={collapsed} onLogout={handleLogout} variant="sidebar" />
        </div>
      </div>
    </aside>
  )
}
