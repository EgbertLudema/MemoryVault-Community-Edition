import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders, getAppAuthCookieOptions } from '@/lib/appAuth'
import { APP_AUTH_COOKIE } from '@/lib/appAuthShared'
import { ensureDefaultLovedOneGroups } from '@/lib/defaultLovedOneGroups'
import { hashDeliveryToken, verifyDeliveryPassword } from '@/lib/legacyDelivery'

const emailRegex =
  /^(?!.*\.\.)[\w!#$%&'*+/=?^`{|}~-](?:[\w!#$%&'*+/=?^`{|}~.-]*[\w!#$%&'*+/=?^`{|}~-])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i

function normalizeEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function splitName(value: unknown) {
  const parts = String(value ?? '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' ') || 'Recipient',
  }
}

export async function POST(req: Request, props: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await props.params
    const body = (await req.json().catch(() => ({}))) as {
      password?: string
      firstName?: string
      lastName?: string
      email?: string
      accountPassword?: string
    }
    const deliveryPassword = String(body.password ?? '').trim()

    if (!deliveryPassword) {
      return NextResponse.json({ message: 'Delivery password is required' }, { status: 400 })
    }

    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'legacy-deliveries',
      overrideAccess: true,
      depth: 1,
      limit: 1,
      where: {
        and: [{ tokenHash: { equals: hashDeliveryToken(token) } }, { status: { equals: 'active' } }],
      },
    })

    const delivery = result.docs?.[0] as any

    if (!delivery || !verifyDeliveryPassword(deliveryPassword, delivery.accessPasswordHash)) {
      return NextResponse.json({ message: 'Invalid delivery credentials' }, { status: 401 })
    }

    const existingUser = await getAppUserFromHeaders(req.headers)

    if (existingUser) {
      await payload.update({
        collection: 'legacy-deliveries',
        id: delivery.id,
        overrideAccess: true,
        data: {
          recipientUser: existingUser.id,
        },
      })

      return NextResponse.json({
        user: {
          id: existingUser.id,
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
        },
      })
    }

    const email = normalizeEmail(body.email)
    const accountPassword = String(body.accountPassword ?? '')
    const fallbackName = splitName(delivery.recipientName)
    const firstName = String(body.firstName ?? '').trim() || fallbackName.firstName
    const lastName = String(body.lastName ?? '').trim() || fallbackName.lastName

    if (!firstName || !lastName || !email || !accountPassword) {
      return NextResponse.json(
        { message: 'First name, last name, email, and password are required' },
        { status: 400 },
      )
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: 'Please enter a valid email address' }, { status: 400 })
    }

    if (accountPassword.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existingAccount = await payload.find({
      collection: 'users',
      overrideAccess: true,
      depth: 0,
      limit: 1,
      where: {
        email: {
          equals: email,
        },
      },
    })

    if ((existingAccount.docs?.length ?? 0) > 0) {
      return NextResponse.json(
        { message: 'An account already exists for this email. Log in, then save this delivery.' },
        { status: 409 },
      )
    }

    const user = await payload.create({
      collection: 'users',
      data: {
        firstName,
        lastName,
        email,
        password: accountPassword,
      },
    })

    await ensureDefaultLovedOneGroups(payload, user.id)

    await payload.update({
      collection: 'legacy-deliveries',
      id: delivery.id,
      overrideAccess: true,
      data: {
        recipientUser: user.id,
      },
    })

    const loginResult = await payload.login({
      collection: 'users',
      data: {
        email,
        password: accountPassword,
      },
    })

    if (!loginResult.token || !loginResult.user) {
      return NextResponse.json({ message: 'Account created, but login failed' }, { status: 400 })
    }

    const response = NextResponse.json({
      user: {
        id: loginResult.user.id,
        email: loginResult.user.email,
        firstName: loginResult.user.firstName,
        lastName: loginResult.user.lastName,
      },
    })

    response.cookies.set(APP_AUTH_COOKIE, loginResult.token, {
      ...getAppAuthCookieOptions(),
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save delivery'
    return NextResponse.json({ message }, { status: 400 })
  }
}
