import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'
import { APP_AUTH_COOKIE } from '@/lib/appAuthShared'
import { localeCookieName } from '@/i18n/locales'
import { routing } from '@/i18n/routing'

const handleI18nRouting = createMiddleware(routing)

const protectedPrefixes = ['/dashboard', '/memories', '/loved-ones', '/account']
const authPrefixes = ['/login', '/register']
const bypassPrefixes = ['/api', '/_next', '/admin', '/legacy']

function getLocaleFromPathname(pathname: string) {
  const segment = pathname.split('/')[1]

  if (routing.locales.includes(segment as (typeof routing.locales)[number])) {
    return segment
  }

  return null
}

function stripLocalePrefix(pathname: string) {
  const locale = getLocaleFromPathname(pathname)

  if (!locale) {
    return pathname
  }

  const stripped = pathname.slice(locale.length + 1)
  return stripped.length > 0 ? stripped : '/'
}

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function detectLocale(req: NextRequest) {
  return (
    getLocaleFromPathname(req.nextUrl.pathname) ??
    req.cookies.get(localeCookieName)?.value ??
    routing.defaultLocale
  )
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  if (bypassPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return
  }

  const token = req.cookies.get(APP_AUTH_COOKIE)?.value
  const normalizedPathname = stripLocalePrefix(pathname)
  const locale = detectLocale(req)

  if (getLocaleFromPathname(pathname) && matchesPrefix(normalizedPathname, protectedPrefixes) && !token) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = `/${locale}/login`
    loginUrl.searchParams.set('next', `${pathname}${search}`)

    return Response.redirect(loginUrl)
  }

  if (getLocaleFromPathname(pathname) && matchesPrefix(normalizedPathname, authPrefixes) && token) {
    const dashboardUrl = req.nextUrl.clone()
    dashboardUrl.pathname = `/${locale}/dashboard`
    dashboardUrl.search = ''

    return Response.redirect(dashboardUrl)
  }

  return handleI18nRouting(req)
}

export const config = {
  matcher: ['/((?!.*\\..*).*)'],
}
