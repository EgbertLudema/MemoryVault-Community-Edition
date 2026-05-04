// app/loved-ones/new/page.tsx
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { LovedOneForm } from '@/components/LovedOneForm'

export default async function LovedOnesNewPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'LovedOneForm' })
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{t('createPageTitle')}</h1>
          <p style={{ marginTop: 8, marginBottom: 0, color: '#555' }}>
            {t('createPageBody')}
          </p>
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
          }}
        >
          {t('back')}
        </Link>
      </div>

      <div style={{ marginTop: 24 }}>
        <LovedOneForm />
      </div>
    </main>
  )
}
