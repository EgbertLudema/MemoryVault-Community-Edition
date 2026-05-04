import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  handleTrustedContactResponse,
  handleUserCheckInResponse,
} from '@/lib/legacyCheckIns'

function htmlResponse(title: string, message: string, status = 200) {
  return new NextResponse(
    `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${title}</title>
          <style>
            body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Arial, sans-serif; background: #faf5ff; color: #292524; }
            main { width: min(560px, calc(100% - 32px)); border: 1px solid #e7e5e4; border-radius: 24px; background: white; padding: 32px; box-shadow: 0 24px 80px -48px rgba(24,24,27,.45); }
            h1 { margin: 0 0 12px; font-size: 32px; line-height: 1.1; }
            p { margin: 0; color: #57534e; line-height: 1.6; }
          </style>
        </head>
        <body>
          <main>
            <h1>${title}</h1>
            <p>${message}</p>
          </main>
        </body>
      </html>`,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    },
  )
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const role = url.searchParams.get('role')
  const token = String(url.searchParams.get('token') ?? '').trim()
  const action = url.searchParams.get('action')

  if (!token) {
    return htmlResponse('Invalid link', 'This check-in link is missing its token.', 400)
  }

  const payload = await getPayload({ config })

  if (role === 'user') {
    const handled = await handleUserCheckInResponse(payload, token)

    if (!handled) {
      return htmlResponse('Link expired', 'This check-in link is invalid or already used.', 404)
    }

    return htmlResponse(
      'Thank you',
      'Your Memory Vault check-in has been confirmed. We will check in again in 30 days.',
    )
  }

  if (role === 'trusted') {
    if (action !== 'healthy' && action !== 'unhealthy' && action !== 'passed') {
      return htmlResponse('Invalid choice', 'This trusted contact link is missing a valid choice.', 400)
    }

    let result: Awaited<ReturnType<typeof handleTrustedContactResponse>>

    try {
      result = await handleTrustedContactResponse({
        payload,
        token,
        action,
        origin: url.origin,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Memory Vault could not process this trusted contact response.'
      return htmlResponse('Could not complete', message, 500)
    }

    if (!result.handled) {
      return htmlResponse('Link expired', 'This trusted contact link is invalid or already used.', 404)
    }

    if (action === 'healthy') {
      return htmlResponse(
        'Thank you',
        'Memory Vault will ask the account owner again in 30 days.',
      )
    }

    if (action === 'unhealthy') {
      return htmlResponse(
        'Thank you',
        'Memory Vault will ask the trusted contacts again in 30 days.',
      )
    }

    return htmlResponse(
      'Delivery started',
      `Memory Vault created ${result.deliveries.length} delivery ${result.deliveries.length === 1 ? 'link' : 'links'} for the linked recipients.`,
    )
  }

  return htmlResponse('Invalid link', 'This check-in link has an unknown role.', 400)
}
