'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState, type FormEvent } from 'react'
import { LegacyDeliveryView } from '@/components/LegacyDeliveryView'
import { useToast } from '@/components/ui/ToastProvider'
import type { LegacyDeliveryData } from '@/lib/legacyDeliveryContent'

export function LegacyDeliveryUnlock({ token }: { token: string }) {
  const t = useTranslations('LegacyDelivery')
  const locale = useLocale()
  const { showToast } = useToast()
  const [password, setPassword] = useState('')
  const [verifiedPassword, setVerifiedPassword] = useState('')
  const [delivery, setDelivery] = useState<LegacyDeliveryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimForm, setClaimForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    accountPassword: '',
  })

  async function unlockDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
        showToast({ tone: 'error', message: t('passwordMismatch') })
        return
      }

      setDelivery(data as LegacyDeliveryData)
      setVerifiedPassword(password)
      setPassword('')
    } catch {
      showToast({ tone: 'error', message: t('unlockError') })
    } finally {
      setLoading(false)
    }
  }

  async function claimDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setClaiming(true)

    try {
      const response = await fetch(`/api/legacy/${encodeURIComponent(token)}/claim`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: verifiedPassword,
          ...claimForm,
        }),
      })

      const data = (await response.json().catch(() => ({}))) as { message?: string }

      if (!response.ok) {
        showToast({ tone: 'error', message: data.message || t('claimError') })
        return
      }

      window.location.href = `/${locale}/recipient`
    } catch {
      showToast({ tone: 'error', message: t('claimError') })
    } finally {
      setClaiming(false)
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
      afterHero={
        <form
          id="claim-delivery"
          onSubmit={claimDelivery}
          className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/80 p-5 shadow-[0_18px_45px_-30px_rgba(5,150,105,0.35)]"
        >
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {t('claimBadge')}
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
            {t('claimTitle')}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-700">
            {t('claimBody')}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <input
              value={claimForm.firstName}
              onChange={(event) =>
                setClaimForm((current) => ({ ...current, firstName: event.target.value }))
              }
              placeholder={t('claimFirstName')}
              className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              required
            />
            <input
              value={claimForm.lastName}
              onChange={(event) =>
                setClaimForm((current) => ({ ...current, lastName: event.target.value }))
              }
              placeholder={t('claimLastName')}
              className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              required
            />
            <input
              type="email"
              value={claimForm.email}
              onChange={(event) =>
                setClaimForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder={t('claimEmail')}
              className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              required
            />
            <input
              type="password"
              value={claimForm.accountPassword}
              onChange={(event) =>
                setClaimForm((current) => ({ ...current, accountPassword: event.target.value }))
              }
              placeholder={t('claimPassword')}
              className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              minLength={8}
              required
            />
          </div>
          <button
            type="submit"
            disabled={claiming}
            className="mt-4 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {claiming ? t('claimSaving') : t('claimSubmit')}
          </button>
        </form>
      }
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
        openWhenMessagesLabel: t('openWhenMessagesLabel'),
        lockedOpenWhenEyebrow: t('lockedOpenWhenEyebrow'),
        lockedOpenWhenBody: t('lockedOpenWhenBody'),
        lockedOpenWhenDialogTitle: t('lockedOpenWhenDialogTitle'),
        lockedOpenWhenDialogBody: t('lockedOpenWhenDialogBody'),
        lockedOpenWhenCreateAccount: t('lockedOpenWhenCreateAccount'),
        lockedOpenWhenClose: t('lockedOpenWhenClose'),
        lockedOpenWhenFallbackTitle: t('lockedOpenWhenFallbackTitle'),
        sharedByLabel: t('sharedByLabel', { name: '{name}' }),
      }}
    />
  )
}
