'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState, type FormEvent } from 'react'
import { LegacyDeliveryView } from '@/components/LegacyDeliveryView'
import type { LegacyDeliveryData } from '@/lib/legacyDeliveryContent'

export function LegacyDeliveryUnlock({ token }: { token: string }) {
  const t = useTranslations('LegacyDelivery')
  const locale = useLocale()
  const [password, setPassword] = useState('')
  const [delivery, setDelivery] = useState<LegacyDeliveryData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function unlockDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch(`/api/legacy/${encodeURIComponent(token)}/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      const data = (await response.json().catch(() => ({}))) as
        | LegacyDeliveryData
        | { error?: string }

      if (!response.ok) {
        setError(t('passwordMismatch'))
        return
      }

      setDelivery(data as LegacyDeliveryData)
      setPassword('')
    } catch {
      setError(t('unlockError'))
    } finally {
      setLoading(false)
    }
  }

  if (!delivery) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#faf5ff_0%,#ffffff_45%,#fff7ed_100%)] px-6 py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center">
          <form
            onSubmit={unlockDelivery}
            className="w-full rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_25px_80px_-35px_rgba(109,40,217,0.35)] backdrop-blur-xl md:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-purple-500">
              {t('deliveryLabel')}
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-stone-900">
              {t('enterPasswordTitle')}
            </h1>
            <p className="mt-4 text-base leading-7 text-stone-600">
              {t('enterPasswordBody')}
            </p>

            <label className="mt-8 block">
              <span className="text-sm font-semibold text-stone-700">{t('password')}</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="one-time-code"
                className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-base font-semibold uppercase tracking-[0.16em] text-stone-900 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                placeholder={t('passwordPlaceholder')}
                required
              />
            </label>

            {error ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-purple-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? t('checking') : t('openMemories')}
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <LegacyDeliveryView
      delivery={delivery}
      locale={locale}
      labels={{
        deliveryLabel: t('deliveryLabel'),
        collectionTitle: t('collectionTitle', { name: '{name}' }),
        collectionBody: t('collectionBody'),
        collectionFallbackName: t('collectionFallbackName'),
        noteLabel: t('noteLabel'),
        noMemoriesAssigned: t('noMemoriesAssigned'),
        memoryLabel: t('memoryLabel'),
        undated: t('undated'),
        untitledMemory: t('untitledMemory'),
        sharedMemoryAlt: t('sharedMemoryAlt'),
        noteTypeLabel: t('noteTypeLabel'),
        photosTypeLabel: t('photosTypeLabel'),
        videoTypeLabel: t('videoTypeLabel'),
      }}
    />
  )
}
