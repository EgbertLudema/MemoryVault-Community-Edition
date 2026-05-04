'use client'

import { useLocale, useTranslations } from 'next-intl'
import { usePathname as useRawPathname, useSearchParams } from 'next/navigation'
import * as React from 'react'
import { LanguagesIcon } from '@/components/icons/LanguagesIcon'
import { localeCookieName } from '@/i18n/locales'

type LanguageSwitcherProps = {
  className?: string
  variant?: 'header' | 'sidebar'
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
  'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-stone-200 bg-white/90 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600 shadow-sm transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700'

function getUnlocalizedPathname(pathname: string, locale: string) {
  const localePrefix = `/${locale}`

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

export function LanguageSwitcher({ className, variant = 'header' }: LanguageSwitcherProps) {
  const t = useTranslations('LanguageSwitcher')
  const locale = useLocale()
  const rawPathname = useRawPathname()
  const searchParams = useSearchParams()
  const isSidebar = variant === 'sidebar'
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  const languages = React.useMemo(
    () => [
      { code: 'en', label: t('english') },
      { code: 'nl', label: t('dutch') },
    ],
    [t],
  )

  const otherLanguages = languages.filter((language) => language.code !== locale)
  const currentLanguage = languages.find((language) => language.code === locale)

  const switchLanguage = React.useCallback(
    (nextLocale: string) => {
      if (nextLocale === locale) {
        return
      }

      const pathname = getUnlocalizedPathname(rawPathname, locale)
      const search = searchParams.toString()
      const target = buildLocalizedPath(pathname, nextLocale, search)

      document.cookie = `${localeCookieName}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`
      window.location.assign(target)
    },
    [locale, rawPathname, searchParams],
  )

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
      className={cn('relative inline-flex', isSidebar && 'block w-full', className)}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        title={t('label')}
        aria-label={t('label')}
        aria-expanded={open}
        className={isSidebar ? sidebarButtonClass : headerButtonClass}
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
              {currentLanguage?.label ?? locale.toUpperCase()}
            </span>
          </>
        ) : (
          <>
            <LanguagesIcon className="h-4 w-4 shrink-0" />
            <span>{locale.toUpperCase()}</span>
          </>
        )}
      </button>

      {open ? (
        <div
          className={cn(
            'absolute z-50 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.25)]',
            !isSidebar && 'right-0 top-full mt-2 min-w-[8rem]',
            isSidebar &&
              'bottom-full left-0 right-0 mb-2 min-w-full overflow-hidden rounded-xl border-0 bg-white p-0 shadow-[0_20px_45px_-26px_rgba(15,23,42,0.28)] ring-1 ring-stone-200',
          )}
        >
          {otherLanguages.map((language) => (
            <button
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
      ) : null}
    </div>
  )
}
