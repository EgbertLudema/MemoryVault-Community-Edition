'use client'

import gsap from 'gsap'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname as useRawPathname, useSearchParams } from 'next/navigation'
import * as React from 'react'
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
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const buttonRef = React.useRef<HTMLButtonElement | null>(null)
  const menuRef = React.useRef<HTMLDivElement | null>(null)
  const optionRefs = React.useRef<HTMLButtonElement[]>([])

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

  React.useEffect(() => {
    if (!open || !menuRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const menu = menuRef.current
    const options = optionRefs.current
    const delayedOptions = options.slice(1)

    gsap.killTweensOf([menu, ...options])
    gsap.set(options[0], { autoAlpha: 1, y: 0 })
    gsap
      .timeline({ defaults: { ease: 'power2.out' } })
      .fromTo(
        menu,
        { autoAlpha: 0, y: isSidebar ? 8 : -6, clipPath: 'inset(0 0 100% 0)' },
        { autoAlpha: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.24 },
      )
    if (delayedOptions.length > 0) {
      gsap.fromTo(
        delayedOptions,
        { autoAlpha: 0, y: -4 },
        { autoAlpha: 1, y: 0, duration: 0.16, stagger: 0.035, delay: 0.18, ease: 'power2.out' },
      )
    }
  }, [isSidebar, open])

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
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
              <span className="truncate">{currentLanguage?.label ?? effectiveLocale.toUpperCase()}</span>
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

      {open ? (
        <div
          ref={menuRef}
          className={cn(
            'absolute z-50 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-[0_14px_32px_rgba(15,23,42,0.12)]',
            !isSidebar && !isFull && 'right-0 top-full mt-2 min-w-[8rem]',
            isFull && fullWidth && 'left-0 right-0 top-full mt-2 w-full',
            isFull && !fullWidth && 'left-0 top-full mt-2 min-w-[12rem]',
            isSidebar &&
              'bottom-full left-0 right-0 mb-2 min-w-full rounded-xl border-0 bg-white p-0 shadow-[0_14px_32px_rgba(15,23,42,0.12)] ring-1 ring-stone-200',
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
        </div>
      ) : null}
    </div>
  )
}
