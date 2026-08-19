'use client'

import gsap from 'gsap'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname as useRawPathname, useSearchParams } from 'next/navigation'
import * as React from 'react'
import { createPortal } from 'react-dom'
import { LanguagesIcon } from '@/components/icons/LanguagesIcon'
import { localeCookieName, locales } from '@/i18n/locales'

type LanguageSwitcherProps = {
  className?: string
  variant?: 'header' | 'sidebar' | 'full'
  preserveUnlocalizedPath?: boolean
  fullWidth?: boolean
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const sidebarButtonClass =
  'group cursor-pointer relative flex w-full items-center gap-3 rounded-xl corner-shape-squircle px-4 py-3 text-sm font-medium text-stone-500 transition-colors duration-200 active:scale-[0.98] hover:bg-stone-50'

const sidebarIconWrapperClass =
  'inline-flex h-5 w-5 shrink-0 items-center justify-center self-center transition-colors duration-200 ease-out'

const sidebarIconMotionClass =
  'inline-flex h-full w-full items-center justify-center origin-center transform-gpu transition-transform duration-200 ease-out motion-reduce:transform-none group-hover:-rotate-2 group-hover:scale-105'

const headerButtonClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-stone-200 bg-white/90 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600 shadow-sm transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300/70'

const fullButtonClass =
  'inline-flex cursor-pointer items-center justify-between gap-3 rounded-[20px] corner-shape-squircle border border-stone-200/80 bg-white/90 px-4 py-3 text-sm font-medium text-stone-700 shadow-sm transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300/70'

function getLocaleFromPathname(pathname: string) {
  const segment = pathname.split('/')[1]

  return locales.includes(segment as (typeof locales)[number]) ? segment : null
}

function getUnlocalizedPathname(pathname: string) {
  const pathnameLocale = getLocaleFromPathname(pathname)

  if (!pathnameLocale) {
    return pathname
  }

  const localePrefix = `/${pathnameLocale}`

  if (pathname === localePrefix || pathname === `${localePrefix}/`) {
    return '/'
  }

  if (pathname.startsWith(`${localePrefix}/`)) {
    return pathname.slice(localePrefix.length)
  }

  return pathname
}

function buildLocalizedPath(pathname: string, locale: string, search: string) {
  const normalizedPath = pathname === '/' ? '' : pathname
  const basePath = normalizedPath ? `/${locale}${normalizedPath}` : `/${locale}/`

  return search ? `${basePath}?${search}` : basePath
}

export function LanguageSwitcher({
  className,
  variant = 'header',
  preserveUnlocalizedPath = false,
  fullWidth = true,
}: LanguageSwitcherProps) {
  const t = useTranslations('LanguageSwitcher')
  const locale = useLocale()
  const rawPathname = useRawPathname()
  const searchParams = useSearchParams()
  const effectiveLocale = getLocaleFromPathname(rawPathname) ?? locale
  const isSidebar = variant === 'sidebar'
  const isFull = variant === 'full'
  const [open, setOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties | null>(null)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const buttonRef = React.useRef<HTMLButtonElement | null>(null)
  const menuRef = React.useRef<HTMLDivElement | null>(null)
  const optionRefs = React.useRef<HTMLButtonElement[]>([])

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const languages = React.useMemo(
    () => [
      { code: 'en', label: t('english') },
      { code: 'nl', label: t('dutch') },
    ],
    [t],
  )

  const otherLanguages = languages.filter((language) => language.code !== effectiveLocale)
  const currentLanguage = languages.find((language) => language.code === effectiveLocale)

  const playButtonAnimation = React.useCallback(() => {
    const button = buttonRef.current

    if (!button || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    gsap.killTweensOf(button)
    gsap
      .timeline({ defaults: { ease: 'power3.out' } })
      .to(button, { y: 1, duration: 0.08 })
      .to(button, { y: 0, duration: 0.18 })
  }, [])

  const switchLanguage = React.useCallback(
    (nextLocale: string) => {
      if (nextLocale === effectiveLocale) {
        return
      }

      const pathname = getUnlocalizedPathname(rawPathname)
      const search = searchParams.toString()
      const target = preserveUnlocalizedPath
        ? `${rawPathname}${search ? `?${search}` : ''}`
        : buildLocalizedPath(pathname, nextLocale, search)

      document.cookie = `${localeCookieName}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`
      window.location.assign(target)
    },
    [effectiveLocale, preserveUnlocalizedPath, rawPathname, searchParams],
  )

  // Rendered through a portal (see below) so the dropdown's shadow doesn't
  // get visually clipped by the header's backdrop-blur. A backdrop-filter
  // ancestor cuts off box-shadow on children that overflow its box, even
  // without overflow-hidden set. Position is computed from the trigger's
  // real screen coordinates instead of relying on CSS-relative placement.
  const updateMenuPosition = React.useCallback(() => {
    if (!rootRef.current) {
      return
    }

    const rect = rootRef.current.getBoundingClientRect()

    if (isSidebar) {
      setMenuStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        bottom: window.innerHeight - rect.top + 8,
      })
      return
    }

    if (isFull) {
      setMenuStyle({
        position: 'fixed',
        left: rect.left,
        top: rect.bottom + 8,
        width: fullWidth ? rect.width : undefined,
        minWidth: fullWidth ? undefined : '12rem',
      })
      return
    }

    setMenuStyle({
      position: 'fixed',
      right: window.innerWidth - rect.right,
      top: rect.bottom + 8,
      minWidth: '8rem',
    })
  }, [isSidebar, isFull, fullWidth])

  React.useEffect(() => {
    if (!open) {
      return
    }

    updateMenuPosition()
    window.addEventListener('scroll', updateMenuPosition, true)
    window.addEventListener('resize', updateMenuPosition)

    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true)
      window.removeEventListener('resize', updateMenuPosition)
    }
  }, [open, updateMenuPosition])

  const hasPlayedEntranceRef = React.useRef(false)

  React.useEffect(() => {
    if (!open) {
      hasPlayedEntranceRef.current = false
    }
  }, [open])

  // Depends on menuStyle (not just `open`): the menu only mounts once
  // updateMenuPosition has computed a position, which happens a render
  // after `open` flips true, so menuRef.current is still null on the
  // render where `open` first becomes true. Without this, the animation
  // would silently no-op on that first pass and never get a second chance
  // to run, since `open` itself doesn't change again.
  React.useEffect(() => {
    if (
      !open ||
      !menuRef.current ||
      hasPlayedEntranceRef.current ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    hasPlayedEntranceRef.current = true

    const menu = menuRef.current
    const options = optionRefs.current
    const delayedOptions = options.slice(1)

    gsap.killTweensOf([menu, ...options])
    gsap.set(options[0], { autoAlpha: 1, y: 0 })
    // Transform + opacity only, no clip-path, so the menu's own
    // box-shadow never gets visually clipped mid-animation.
    gsap.fromTo(
      menu,
      { autoAlpha: 0, y: isSidebar ? 10 : -8, scale: 0.96 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.22, ease: 'power2.out' },
    )
    if (delayedOptions.length > 0) {
      gsap.fromTo(
        delayedOptions,
        { autoAlpha: 0, y: -4 },
        { autoAlpha: 1, y: 0, duration: 0.16, stagger: 0.035, delay: 0.12, ease: 'power2.out' },
      )
    }
  }, [isSidebar, open, menuStyle])

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      const insideRoot = rootRef.current?.contains(target)
      const insideMenu = menuRef.current?.contains(target)

      if (!insideRoot && !insideMenu) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative inline-flex',
        (isSidebar || (isFull && fullWidth)) && 'block w-full',
        className,
      )}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          playButtonAnimation()
          setOpen((current) => !current)
        }}
        title={t('label')}
        aria-label={t('label')}
        aria-expanded={open}
        className={cn(
          isSidebar ? sidebarButtonClass : isFull ? fullButtonClass : headerButtonClass,
          isFull && fullWidth && 'w-full',
        )}
      >
        {isSidebar ? (
          <>
            <span
              className={cn(sidebarIconWrapperClass, 'relative z-10 group-hover:text-stone-700')}
            >
              <span className={sidebarIconMotionClass}>
                <LanguagesIcon className="block h-[18px] w-[18px] pointer-events-none" />
              </span>
            </span>
            <span className="relative z-10 truncate transition-colors duration-200 group-hover:text-stone-700">
              {currentLanguage?.label ?? effectiveLocale.toUpperCase()}
            </span>
          </>
        ) : isFull ? (
          <>
            <span className="inline-flex min-w-0 items-center gap-3">
              <LanguagesIcon className="h-5 w-5 shrink-0" />
              <span className="truncate">
                {currentLanguage?.label ?? effectiveLocale.toUpperCase()}
              </span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              {effectiveLocale}
            </span>
          </>
        ) : (
          <>
            <LanguagesIcon className="h-4 w-4 shrink-0" />
            <span>{effectiveLocale.toUpperCase()}</span>
          </>
        )}
      </button>

      {open && mounted && menuStyle
        ? createPortal(
            <div
              ref={menuRef}
              style={menuStyle}
              className={cn(
                'z-50 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-[0_14px_32px_rgba(15,23,42,0.12)]',
                isSidebar &&
                  'rounded-xl border-0 bg-white p-0 shadow-[0_14px_32px_rgba(15,23,42,0.12)] ring-1 ring-stone-200',
              )}
            >
              <div className={cn(isSidebar && 'overflow-hidden rounded-xl')}>
                {otherLanguages.map((language, index) => (
                  <button
                    ref={(element) => {
                      if (element) {
                        optionRefs.current[index] = element
                      }
                    }}
                    key={language.code}
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      switchLanguage(language.code)
                    }}
                    className={cn(
                      'flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-stone-700 transition hover:bg-purple-50 hover:text-purple-700',
                      isSidebar &&
                        'group gap-3 rounded-none px-4 py-3 text-stone-500 hover:bg-stone-50 hover:text-stone-700',
                    )}
                  >
                    {isSidebar ? (
                      <>
                        <span className={cn(sidebarIconWrapperClass, 'group-hover:text-stone-700')}>
                          <span className={sidebarIconMotionClass}>
                            <LanguagesIcon className="block h-[18px] w-[18px] pointer-events-none" />
                          </span>
                        </span>
                        <span className="min-w-0 flex-1 truncate">{language.label}</span>
                      </>
                    ) : (
                      <>
                        <span>{language.label}</span>
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                          {language.code}
                        </span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
