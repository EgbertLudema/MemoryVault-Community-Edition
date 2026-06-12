import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  handleTrustedContactResponse,
  handleUserCheckInResponse,
} from '@/lib/legacyCheckIns'

type TrustedAction = 'healthy' | 'unhealthy' | 'passed'
type CheckInConfirmationStatus = 'healthy' | 'unhealthy' | 'passed'

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function htmlResponse(title: string, message: string, status = 200) {
  const safeTitle = escapeHtml(title)
  const safeMessage = escapeHtml(message)

  return new NextResponse(
    `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${safeTitle}</title>
          <style>
            body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Arial, sans-serif; background: #faf5ff; color: #292524; }
            main { width: min(560px, calc(100% - 32px)); border: 1px solid #e7e5e4; border-radius: 24px; background: white; padding: 32px; box-shadow: 0 24px 80px -48px rgba(24,24,27,.45); }
            h1 { margin: 0 0 12px; font-size: 32px; line-height: 1.1; }
            p { margin: 0; color: #57534e; line-height: 1.6; }
          </style>
        </head>
        <body>
          <main>
            <h1>${safeTitle}</h1>
            <p>${safeMessage}</p>
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

function checkInConfirmedResponse(origin: string, status: CheckInConfirmationStatus) {
  const url = new URL('/legacy/check-in/confirmed', origin)
  url.searchParams.set('status', status)
  return NextResponse.redirect(url)
}

function passedConfirmationResponse(token: string) {
  const safeToken = escapeHtml(token)

  return new NextResponse(
    `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Confirm delivery</title>
          <style>
            :root { color-scheme: light; }
            * { box-sizing: border-box; }
            body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Arial, sans-serif; background: #faf5ff; color: #292524; }
            main { width: min(600px, calc(100% - 32px)); border: 1px solid #e7e5e4; border-radius: 24px; background: white; padding: 32px; box-shadow: 0 24px 80px -48px rgba(24,24,27,.45); }
            h1 { margin: 0 0 12px; font-size: clamp(28px, 6vw, 38px); line-height: 1.08; }
            p { margin: 0 0 18px; color: #57534e; line-height: 1.6; }
            .warning { margin: 0 0 22px; border-left: 4px solid #dc2626; border-radius: 8px; background: #fef2f2; padding: 14px 16px; color: #991b1b; }
            form { margin: 0; }
            button { position: relative; width: 100%; min-height: 56px; overflow: hidden; border: 0; border-radius: 8px; background: #dc2626; color: white; cursor: pointer; font-size: 16px; font-weight: 800; }
            button::before { content: ""; position: absolute; inset: 0 auto 0 0; width: var(--hold-progress, 0%); background: rgba(255,255,255,.24); transition: width 120ms linear; }
            button span { position: relative; z-index: 1; }
            button:focus-visible { outline: 3px solid #fca5a5; outline-offset: 3px; }
            button[aria-busy="true"] { cursor: progress; }
            .hint { margin: 12px 0 0; color: #78716c; font-size: 13px; text-align: center; }
          </style>
        </head>
        <body>
          <main>
            <h1>Confirm delivery</h1>
            <p>A trusted contact selected that the Memory Vault owner has passed away.</p>
            <div class="warning">Hold the button for 2 seconds to confirm this choice and start delivery to linked recipients.</div>
            <form method="post" action="/api/legacy/check-in/respond">
              <input type="hidden" name="role" value="trusted" />
              <input type="hidden" name="action" value="passed" />
              <input type="hidden" name="token" value="${safeToken}" />
              <button id="confirm-button" type="button" aria-busy="false">
                <span id="confirm-label">Hold to confirm passing</span>
              </button>
            </form>
            <p class="hint">Release before 2 seconds to cancel.</p>
          </main>
          <script>
            const form = document.querySelector('form')
            const button = document.getElementById('confirm-button')
            const label = document.getElementById('confirm-label')
            let holdTimer = null
            let progressTimer = null
            let startedAt = 0
            const holdMs = 2000

            function resetHold() {
              window.clearTimeout(holdTimer)
              window.clearInterval(progressTimer)
              holdTimer = null
              progressTimer = null
              startedAt = 0
              button.style.setProperty('--hold-progress', '0%')
              button.setAttribute('aria-busy', 'false')
              label.textContent = 'Hold to confirm passing'
            }

            function startHold(event) {
              event.preventDefault()
              if (holdTimer) return
              startedAt = Date.now()
              button.setAttribute('aria-busy', 'true')
              label.textContent = 'Keep holding...'
              progressTimer = window.setInterval(() => {
                const progress = Math.min(100, ((Date.now() - startedAt) / holdMs) * 100)
                button.style.setProperty('--hold-progress', progress + '%')
              }, 40)
              holdTimer = window.setTimeout(() => {
                label.textContent = 'Starting delivery...'
                button.style.setProperty('--hold-progress', '100%')
                form.submit()
              }, holdMs)
            }

            button.addEventListener('pointerdown', startHold)
            button.addEventListener('pointerup', resetHold)
            button.addEventListener('pointerleave', resetHold)
            button.addEventListener('pointercancel', resetHold)
            button.addEventListener('keydown', (event) => {
              if (event.key === ' ' || event.key === 'Enter') startHold(event)
            })
            button.addEventListener('keyup', (event) => {
              if (event.key === ' ' || event.key === 'Enter') resetHold()
            })
          </script>
        </body>
      </html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    },
  )
}

async function completeTrustedContactResponse({
  token,
  action,
  origin,
}: {
  token: string
  action: TrustedAction
  origin: string
}) {
  const payload = await getPayload({ config })
  let result: Awaited<ReturnType<typeof handleTrustedContactResponse>>

  try {
    result = await handleTrustedContactResponse({
      payload,
      token,
      action,
      origin,
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
    return checkInConfirmedResponse(origin, 'healthy')
  }

  if (action === 'unhealthy') {
    return checkInConfirmedResponse(origin, 'unhealthy')
  }

  return checkInConfirmedResponse(origin, 'passed')
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const role = url.searchParams.get('role')
  const token = String(url.searchParams.get('token') ?? '').trim()
  const action = url.searchParams.get('action')

  if (!token) {
    return htmlResponse('Invalid link', 'This check-in link is missing its token.', 400)
  }

  if (role === 'user') {
    const payload = await getPayload({ config })
    const handled = await handleUserCheckInResponse(payload, token)

    if (!handled) {
      return htmlResponse('Link expired', 'This check-in link is invalid or already used.', 404)
    }

    return checkInConfirmedResponse(url.origin, 'healthy')
  }

  if (role === 'trusted') {
    if (action !== 'healthy' && action !== 'unhealthy' && action !== 'passed') {
      return htmlResponse('Invalid choice', 'This trusted contact link is missing a valid choice.', 400)
    }

    if (action === 'passed') {
      return passedConfirmationResponse(token)
    }

    return completeTrustedContactResponse({
      token,
      action,
      origin: url.origin,
    })
  }

  return htmlResponse('Invalid link', 'This check-in link has an unknown role.', 400)
}

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null)
  const url = new URL(req.url)
  const role = String(formData?.get('role') ?? '').trim()
  const token = String(formData?.get('token') ?? '').trim()
  const action = String(formData?.get('action') ?? '').trim()

  if (role !== 'trusted') {
    return htmlResponse('Invalid link', 'This confirmation can only process trusted contact links.', 400)
  }

  if (!token) {
    return htmlResponse('Invalid link', 'This check-in link is missing its token.', 400)
  }

  if (action !== 'passed') {
    return htmlResponse('Invalid choice', 'This confirmation can only process a passing confirmation.', 400)
  }

  return completeTrustedContactResponse({
    token,
    action,
    origin: url.origin,
  })
}
