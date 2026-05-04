import { NextResponse } from 'next/server'
import {
  createGoogleAuthorizationUrl,
  createGoogleOAuthState,
  getGoogleOAuthCookieOptions,
  getGoogleOAuthNextCookieName,
  getGoogleOAuthStateCookieName,
  getSafeGoogleNextPath,
} from '@/lib/googleAuth'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const next = getSafeGoogleNextPath(url.searchParams.get('next'))
    const state = createGoogleOAuthState()
    const response = NextResponse.redirect(createGoogleAuthorizationUrl(state))

    response.cookies.set(getGoogleOAuthStateCookieName(), state, {
      ...getGoogleOAuthCookieOptions(),
      maxAge: 60 * 10,
    })

    if (next) {
      response.cookies.set(getGoogleOAuthNextCookieName(), next, {
        ...getGoogleOAuthCookieOptions(),
        maxAge: 60 * 10,
      })
    } else {
      response.cookies.set(getGoogleOAuthNextCookieName(), '', {
        ...getGoogleOAuthCookieOptions(),
        maxAge: 0,
      })
    }

    return response
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Unable to start Google authentication' }, { status: 500 })
  }
}
