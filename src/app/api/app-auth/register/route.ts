import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppAuthCookieOptions } from '@/lib/appAuth'
import { APP_AUTH_COOKIE } from '@/lib/appAuthShared'

export async function POST(req: Request) {
  try {
    const payload = await getPayload({ config })
    const body = (await req.json()) as {
      firstName?: string
      lastName?: string
      email?: string
      password?: string
    }

    const firstName = String(body.firstName ?? '').trim()
    const lastName = String(body.lastName ?? '').trim()
    const email = String(body.email ?? '').trim()
    const password = String(body.password ?? '')

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { message: 'First name, last name, email, and password are required' },
        { status: 400 },
      )
    }

    await payload.create({
      collection: 'users',
      data: {
        firstName,
        lastName,
        email,
        password,
      },
    })

    const result = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
    })

    if (!result.token) {
      return NextResponse.json({ message: 'Registration failed' }, { status: 400 })
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
    const message = error instanceof Error ? error.message : 'Registration failed'
    return NextResponse.json({ message }, { status: 400 })
  }
}
