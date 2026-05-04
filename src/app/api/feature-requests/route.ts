import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAppUserFromHeaders } from '@/lib/appAuth'
import { getAppFeatureBoard } from '@/lib/featureRequests'
import { defaultLocale, locales, type AppLocale } from '@/i18n/locales'

function resolveLocale(locale?: string | null): AppLocale {
  return locales.includes(locale as AppLocale) ? (locale as AppLocale) : defaultLocale
}

export async function GET(req: Request) {
  try {
    const user = await getAppUserFromHeaders(req.headers)
    const locale = new URL(req.url).searchParams.get('locale')

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const board = await getAppFeatureBoard(user.id, locale)

    return NextResponse.json(board, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load feature requests' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const payload = await getPayload({ config })
    const user = await getAppUserFromHeaders(req.headers)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as {
      title?: string
      description?: string
      anonymousSubmission?: boolean
      locale?: string
    }

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const created = await payload.create({
      collection: 'feature-requests',
      locale: resolveLocale(body.locale),
      data: {
        title,
        description,
        status: 'pending',
        submittedBy: user.id,
        anonymousSubmission: Boolean(body.anonymousSubmission),
      },
    })

    return NextResponse.json(
      {
        submission: {
          id: String(created.id),
          title: String(created.title ?? ''),
          description: String(created.description ?? ''),
          status: String(created.status ?? 'pending'),
          anonymousSubmission: Boolean(created.anonymousSubmission),
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to submit feature request' }, { status: 500 })
  }
}
