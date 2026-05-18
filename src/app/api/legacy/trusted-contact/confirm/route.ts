import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { acceptTrustedContactInvite } from '@/lib/trustedContactInvites'

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
  const token = String(url.searchParams.get('token') ?? '').trim()

  if (!token) {
    return htmlResponse('Invalid link', 'This trusted contact invite is missing its token.', 400)
  }

  const payload = await getPayload({ config })
  const accepted = await acceptTrustedContactInvite(payload, token)

  if (!accepted) {
    return htmlResponse('Link expired', 'This trusted contact invite is invalid or already used.', 404)
  }

  return htmlResponse(
    'Thank you',
    'You are now confirmed as a trusted contact. If the account owner was waiting for your confirmation, legacy protection has been enabled.',
  )
}
