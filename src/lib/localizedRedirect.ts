import { defaultLocale, locales, type AppLocale } from '@/i18n/locales'

function isSupportedLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value)
}

export function getSafeLocalizedPath(
  next: string | null | undefined,
  locale: string | null | undefined,
) {
  if (!next || !next.startsWith('/')) {
    return null
  }

  if (next.startsWith('//')) {
    return null
  }

  const resolvedLocale = isSupportedLocale(locale ?? '') ? locale : defaultLocale
  const localePrefix = `/${resolvedLocale}`

  if (next === localePrefix || next.startsWith(`${localePrefix}/`)) {
    return next
  }

  const [, firstSegment] = next.split('/')
  if (firstSegment && isSupportedLocale(firstSegment)) {
    return next
  }

  return `${localePrefix}${next === '/' ? '' : next}`
}
