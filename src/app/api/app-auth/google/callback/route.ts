import { NextResponse } from 'next/server'
import { APP_AUTH_COOKIE } from '@/lib/appAuthShared'
import { getAppAuthCookieOptions } from '@/lib/appAuth'
import { defaultLocale, locales } from '@/i18n/locales'
import { getSafeLocalizedPath } from '@/lib/localizedRedirect'
import {
  createPayloadTokenForUser,
  exchangeGoogleCodeForTokens,
  fetchGoogleUserInfo,
  findOrCreateUserFromGoogleProfile,
  getGoogleOAuthCookieOptions,
  getGoogleOAuthNextCookieName,
  getGoogleOAuthStateCookieName,
  getSafeGoogleNextPath,
} from '@/lib/googleAuth'

function getCookieValue(cookieHeader: string | null, name: string) {
  return (
    cookieHeader
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.split('=')
      .slice(1)
      .join('=')
      .trim() ?? null
  )
}

function getRequestLocale(cookieHeader: string | null) {
  const locale = getCookieValue(cookieHeader, 'NEXT_LOCALE')
  if (locale && locales.includes(locale as (typeof locales)[number])) {
    return locale
  }

  return defaultLocale
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set(getGoogleOAuthStateCookieName(), '', {
    ...getGoogleOAuthCookieOptions(),
    maxAge: 0,
  })
  response.cookies.set(getGoogleOAuthNextCookieName(), '', {
    ...getGoogleOAuthCookieOptions(),
    maxAge: 0,
  })
}

export async function GET(req: Request) {
  const requestUrl = new URL(req.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')
  const error = requestUrl.searchParams.get('error')
  const cookieHeader = req.headers.get('cookie')
  const locale = getRequestLocale(cookieHeader)
  const stateCookie = getCookieValue(cookieHeader, getGoogleOAuthStateCookieName())
  const nextCookie = getCookieValue(cookieHeader, getGoogleOAuthNextCookieName())

  const loginUrl = new URL(`/${locale}/login`, requestUrl.origin)

  if (error || !code || !state || !stateCookie || stateCookie !== state) {
    loginUrl.searchParams.set('error', 'google_auth_failed')
    const response = NextResponse.redirect(loginUrl)
    clearOAuthCookies(response)
    return response
  }

  try {
    const tokens = await exchangeGoogleCodeForTokens(code)
    const profile = await fetchGoogleUserInfo(tokens.access_token as string)
    const user = await findOrCreateUserFromGoogleProfile(profile)
    const session = await createPayloadTokenForUser(user)
    const redirectPath =
      getSafeLocalizedPath(getSafeGoogleNextPath(nextCookie ?? null), locale) || `/${locale}/dashboard`
    const response = NextResponse.redirect(new URL(redirectPath, requestUrl.origin))

    response.cookies.set(APP_AUTH_COOKIE, session.token, {
      ...getAppAuthCookieOptions(),
      maxAge: 60 * 60 * 24 * 7,
    })

    clearOAuthCookies(response)
    return response
  } catch (err) {
    console.error('Google auth callback failed', err)
    loginUrl.searchParams.set('error', 'google_auth_failed')
    const response = NextResponse.redirect(loginUrl)
    clearOAuthCookies(response)
    return response
  }
}
