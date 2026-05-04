// app/loved-ones/[id]/page.tsx
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { LovedOneEditForm } from '@/components/LovedOneEditForm'
import { defaultLocale } from '@/i18n/locales'
import { Link } from '@/i18n/navigation'
import { getEffectiveLovedOneNote } from '@/lib/lovedOneNotes'

type LovedOneGroup = {
  id: string | number
  name: string
}

type LovedOne = {
  id: string | number
  fullName: string
  nickname?: string | null
  email?: string | null
  relationship: string
  customNote?: string | null
  groups?: Array<string | number | LovedOneGroup> | null
  group?: string | number | LovedOneGroup
}

function getServerUrl(): string {
  const direct =
    process.env.PAYLOAD_PUBLIC_SERVER_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    process.env.NEXT_PUBLIC_SITE_URL

  if (direct && direct.trim().length > 0) {
    return direct.replace(/\/$/, '')
  }

  return 'http://localhost:3000'
}

async function fetchLovedOne(id: string): Promise<LovedOne | null> {
  const serverUrl = getServerUrl()
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()

  const url = `${serverUrl}/api/loved-ones/${encodeURIComponent(id)}?depth=1`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      cookie: cookieHeader,
    },
    cache: 'no-store',
  })

  if (res.status === 401 || res.status === 403 || res.status === 404) {
    return null
  }

  if (!res.ok) {
    throw new Error(`Failed to load loved one. Status: ${res.status}`)
  }

  return (await res.json()) as LovedOne
}

export default async function LovedOneDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale?: string }>
}) {
  const { id, locale } = await params
  const t = await getTranslations({
    locale: locale ?? defaultLocale,
    namespace: 'LovedOneDetail',
  })
  const lovedOne = await fetchLovedOne(id)

  if (!lovedOne) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{t('notFoundTitle')}</h1>
        <p style={{ marginTop: 10, color: '#555' }}>{t('notFoundBody')}</p>
        <Link href="/loved-ones" style={{ display: 'inline-block', marginTop: 14, color: '#111' }}>
          {t('backToLovedOnes')}
        </Link>
      </main>
    )
  }

  const note = getEffectiveLovedOneNote(lovedOne.customNote)

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{lovedOne.fullName}</h1>
          <p style={{ marginTop: 8, marginBottom: 0, color: '#555' }}>{t('subtitle')}</p>
        </div>

        <Link
          href="/loved-ones"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 40,
            padding: '0 14px',
            borderRadius: 10,
            border: '1px solid #ddd',
            textDecoration: 'none',
            color: '#222',
            background: '#fff',
            whiteSpace: 'nowrap',
          }}
        >
          {t('back')}
        </Link>
      </div>

      <div style={{ marginTop: 24 }}>
        <div
          style={{
            marginBottom: 20,
            border: '1px solid #fecdd3',
            borderRadius: 18,
            padding: 16,
            background: 'rgba(255, 241, 242, 0.7)',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#be185d',
            }}
          >
            {t('currentNote')}
          </div>
          <p style={{ margin: '10px 0 0', color: '#5b4450', lineHeight: 1.7 }}>{note}</p>
        </div>
        <LovedOneEditForm lovedOne={lovedOne} />
      </div>
    </main>
  )
}
