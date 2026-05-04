import { NextResponse } from 'next/server'
import { getAppAuthCookieOptions } from '@/lib/appAuth'
import { APP_AUTH_COOKIE } from '@/lib/appAuthShared'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(APP_AUTH_COOKIE, '', {
    ...getAppAuthCookieOptions(),
    maxAge: 0,
  })
  return response
}
