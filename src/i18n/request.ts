import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { localeCookieName } from '@/i18n/locales'
import { routing } from '@/i18n/routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const cookieStore = await cookies()

  let locale = await requestLocale

  if (!locale) {
    locale = cookieStore.get(localeCookieName)?.value
  }

  if (!locale || !hasLocale(routing.locales, locale)) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
