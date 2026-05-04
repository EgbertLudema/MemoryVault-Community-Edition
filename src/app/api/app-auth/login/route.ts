import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppAuthCookieOptions } from '@/lib/appAuth'
import { APP_AUTH_COOKIE } from '@/lib/appAuthShared'

export async function POST(req: Request) {
  try {
    const payload = await getPayload({ config })
    const body = (await req.json()) as { email?: string; password?: string }

    const email = String(body.email ?? '').trim()
    const password = String(body.password ?? '')

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 })
    }

    const result = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
    })

    if (!result.token) {
      return NextResponse.json({ message: 'Login failed' }, { status: 401 })
    }

    const response = NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
    })

    response.cookies.set(APP_AUTH_COOKIE, result.token, {
      ...getAppAuthCookieOptions(),
      maxAge: 60 * 60 * 24 * 7,
    })
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed'
    return NextResponse.json({ message }, { status: 401 })
  }
}
