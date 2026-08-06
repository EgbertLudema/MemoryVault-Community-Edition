import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppAuthCookieOptions } from '@/lib/appAuth'
import { APP_AUTH_COOKIE } from '@/lib/appAuthShared'
import { sendTriggeredAdminEmailCampaigns } from '@/lib/adminEmailCampaigns'
import { ensureDefaultDigitalLegacyItems } from '@/lib/defaultDigitalLegacyItems'
import { ensureDefaultLovedOneGroups } from '@/lib/defaultLovedOneGroups'

const emailRegex =
  /^(?!.*\.\.)[\w!#$%&'*+/=?^`{|}~-](?:[\w!#$%&'*+/=?^`{|}~.-]*[\w!#$%&'*+/=?^`{|}~-])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i

function normalizeEmail(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function getRegisterErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { errors?: Array<{ message?: unknown; path?: unknown }> } })
      .data
    const fieldError = data?.errors?.[0]
    const fieldMessage = typeof fieldError?.message === 'string' ? fieldError.message : null

    if (
      fieldError?.path === 'email' &&
      fieldMessage &&
      /valid email|email address|not valid/i.test(fieldMessage)
    ) {
      return 'Please enter a valid email address'
    }

    if (fieldMessage) {
      return fieldMessage
    }
  }

  return error instanceof Error ? error.message : 'Registration failed'
}

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
    const email = normalizeEmail(body.email)
    const password = String(body.password ?? '')

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { message: 'First name, last name, email, and password are required' },
        { status: 400 },
      )
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: 'Please enter a valid email address' }, { status: 400 })
    }

    const user = await payload.create({
      collection: 'users',
      data: {
        firstName,
        lastName,
        email,
        password,
      },
    })

    await ensureDefaultLovedOneGroups(payload, user.id)
    await ensureDefaultDigitalLegacyItems(payload, user.id)

    try {
      await sendTriggeredAdminEmailCampaigns({
        payload,
        trigger: 'user_signup',
        user,
        origin: new URL(req.url).origin,
      })
    } catch (error) {
      console.warn('Failed to send signup email campaigns', error)
    }

    const result = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
    })

    if (!result.token || !result.user) {
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
    const message = getRegisterErrorMessage(error)
    return NextResponse.json({ message }, { status: 400 })
  }
}
