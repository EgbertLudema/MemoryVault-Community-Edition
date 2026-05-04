import { MEMORY_VAULT_LOGO_PATHS, MEMORY_VAULT_LOGO_VIEW_BOX } from '@/lib/memoryVaultLogo'

const memoryVaultLogoSvg = `
  <svg width="44" height="44" viewBox="${MEMORY_VAULT_LOGO_VIEW_BOX}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${MEMORY_VAULT_LOGO_PATHS.map(
      (path) =>
        `<path d="${path.d}" stroke="${path.stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`,
    ).join('')}
  </svg>
`

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function emailButton({
  href,
  label,
  background = '#6d28d9',
}: {
  href: string
  label: string
  background?: string
}) {
  return `
    <a href="${escapeHtml(href)}" style="display:inline-block;border-radius:8px;background:${background};padding:13px 18px;color:#ffffff;font-size:15px;font-weight:700;line-height:1;text-decoration:none;">
      ${escapeHtml(label)}
    </a>
  `
}

export function renderBrandedEmail({
  eyebrow,
  title,
  preview,
  body,
}: {
  eyebrow?: string
  title: string
  preview?: string
  body: string
}) {
  const safeTitle = escapeHtml(title)
  const safePreview = preview ? escapeHtml(preview) : ''

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${safeTitle}</title>
      </head>
      <body style="margin:0;background:#f8fafc;padding:0;color:#292524;font-family:Arial,Helvetica,sans-serif;">
        ${safePreview ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safePreview}</div>` : ''}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;">
          <tr>
            <td align="center" style="padding:32px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:separate;border-spacing:0;">
                <tr>
                  <td style="padding:0 0 16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width:44px;height:44px;vertical-align:middle;">
                          ${memoryVaultLogoSvg}
                        </td>
                        <td style="padding-left:12px;vertical-align:middle;">
                          <div style="font-size:18px;font-weight:800;line-height:1.2;color:#1c1917;">Memory Vault</div>
                          <div style="font-size:13px;line-height:1.4;color:#78716c;">Private legacy protection</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="overflow:hidden;border:1px solid #e7e5e4;border-radius:8px;background:#ffffff;box-shadow:0 22px 60px rgba(15,23,42,.08);">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="border-bottom:1px solid #ede9fe;background:#faf5ff;padding:22px 28px;">
                          ${eyebrow ? `<div style="margin-bottom:8px;color:#6d28d9;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;">${escapeHtml(eyebrow)}</div>` : ''}
                          <h1 style="margin:0;color:#1c1917;font-size:28px;line-height:1.18;font-weight:800;">${safeTitle}</h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:28px;color:#44403c;font-size:16px;line-height:1.65;">
                          ${body}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 4px 0;color:#78716c;font-size:12px;line-height:1.6;text-align:center;">
                    Memory Vault sends these messages because legacy protection is enabled for this account.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}
