import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { defaultLocale, localeCookieName, locales, type AppLocale } from '@/i18n/locales'

function isSupportedLocale(value: string | undefined): value is AppLocale {
  return Boolean(value && locales.includes(value as AppLocale))
}

export default async function RootPage() {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(localeCookieName)?.value
  const resolvedLocale = isSupportedLocale(cookieLocale) ? cookieLocale : defaultLocale

  redirect(`/${resolvedLocale}/dashboard`)
}
