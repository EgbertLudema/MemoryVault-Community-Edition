import { getPayload } from 'payload'
import config from '@payload-config'
import { APP_AUTH_COOKIE } from '@/lib/appAuthShared'

function isSecureCookie() {
  return process.env.NODE_ENV === 'production'
}

export function getAppAuthCookieOptions() {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: isSecureCookie(),
  }
}

export function getAppTokenFromCookieHeader(cookieHeader?: string | null) {
  if (!cookieHeader) {
    return null
  }

  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const [rawName, ...rawValue] = part.trim().split('=')
    if (rawName === APP_AUTH_COOKIE) {
      const value = rawValue.join('=').trim()
      return value || null
    }
  }

  return null
}

export async function getAppUserFromHeaders(headers: Headers) {
  const cookieToken =
    getAppTokenFromCookieHeader(headers.get('cookie')) ??
    getAppTokenFromCookieHeader(headers.get('Cookie'))
  const authorization = headers.get('authorization') ?? headers.get('Authorization')
  const authToken = authorization?.match(/^(?:JWT|Bearer)\s+(.+)$/i)?.[1]?.trim() ?? null
  const token = cookieToken || authToken

  if (!token) {
    return null
  }

  const payload = await getPayload({ config })
  const { user } = await payload.auth({
    headers: new Headers({
      Authorization: `JWT ${token}`,
    }),
  })

  if (!user || user.collection !== 'users') {
    return null
  }

  return user
}
