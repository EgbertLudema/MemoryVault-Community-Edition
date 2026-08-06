'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { LegacyDeliveryView } from '@/components/LegacyDeliveryView'
import { ExportFileIcon } from '@/components/icons/ExportFileIcon'
import { GoogleIcon } from '@/components/icons/GoogleIcon'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useToast } from '@/components/ui/ToastProvider'
import type { LegacyDeliveryData } from '@/lib/legacyDeliveryContent'

type ClaimMode = 'register' | 'login'

type CurrentUser = {
  email?: string | null
  firstName?: string | null
  lastName?: string | null
}

export function LegacyDeliveryUnlock({ token }: { token: string }) {
  const t = useTranslations('LegacyDelivery')
  const locale = useLocale()
  const { showToast } = useToast()
  const [password, setPassword] = useState('')
  const [verifiedPassword, setVerifiedPassword] = useState('')
  const [delivery, setDelivery] = useState<LegacyDeliveryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [claimMode, setClaimMode] = useState<ClaimMode>('register')
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [claimForm, setClaimForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    accountPassword: '',
  })
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  })
  const storedPasswordKey = useMemo(() => `memory-vault:legacy-password:${token}`, [token])
  const googleHref = `/api/app-auth/google/start?next=${encodeURIComponent(`/legacy/${token}`)}`

  useEffect(() => {
    async function loadCurrentUser() {
      const response = await fetch('/api/app-auth/me', { credentials: 'include' })

      if (!response.ok) {
        setCurrentUser(null)
        return
      }

      const data = (await response.json().catch(() => ({}))) as { user?: CurrentUser }
      setCurrentUser(data.user ?? null)
    }

    loadCurrentUser()
  }, [])

  useEffect(() => {
    const storedPassword = window.sessionStorage.getItem(storedPasswordKey)

    if (!storedPassword || delivery || loading) {
      return
    }

    window.sessionStorage.removeItem(storedPasswordKey)
    unlockWithPassword(storedPassword)
    // We only want to consume this once after returning from Google.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedPasswordKey])

  async function unlockWithPassword(nextPassword: string) {
    setLoading(true)

    try {
      const response = await fetch(`/api/legacy/${encodeURIComponent(token)}/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: nextPassword }),
      })

      const data = (await response.json().catch(() => ({}))) as
        | LegacyDeliveryData
        | { error?: string }

      if (!response.ok) {
        showToast({ tone: 'error', message: t('passwordMismatch') })
        return
      }

      setDelivery(data as LegacyDeliveryData)
      setVerifiedPassword(nextPassword)
      setPassword('')
    } catch {
      showToast({ tone: 'error', message: t('unlockError') })
    } finally {
      setLoading(false)
    }
  }

  async function unlockDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await unlockWithPassword(password)
  }

  async function attachDeliveryToCurrentUser() {
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

  async function loginAndClaimDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setClaiming(true)

    try {
      const loginResponse = await fetch('/api/app-auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm),
      })
      const loginData = (await loginResponse.json().catch(() => ({}))) as {
        message?: string
        user?: CurrentUser
      }

      if (!loginResponse.ok) {
        showToast({ tone: 'error', message: loginData.message || t('loginError') })
        return
      }

      setCurrentUser(loginData.user ?? null)
      const claimResponse = await fetch(`/api/legacy/${encodeURIComponent(token)}/claim`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: verifiedPassword,
        }),
      })
      const claimData = (await claimResponse.json().catch(() => ({}))) as { message?: string }

      if (!claimResponse.ok) {
        showToast({ tone: 'error', message: claimData.message || t('claimError') })
        return
      }

      window.location.href = `/${locale}/recipient`
    } catch {
      showToast({ tone: 'error', message: t('claimError') })
    } finally {
      setClaiming(false)
    }
  }

  function rememberPasswordForGoogle() {
    if (verifiedPassword) {
      window.sessionStorage.setItem(storedPasswordKey, verifiedPassword)
    }
  }

  async function exportDelivery() {
    if (exporting) {
      return
    }

    setExporting(true)

    try {
      const response = await fetch(`/api/legacy/${encodeURIComponent(token)}/export`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: verifiedPassword,
        }),
      })

      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}`)
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const disposition = response.headers.get('content-disposition') ?? ''
      const match = disposition.match(/filename="([^"]+)"/i)

      link.href = objectUrl
      link.download = match?.[1] ?? 'memory-vault-export.zip'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)
    } catch {
      showToast({ tone: 'error', message: t('exportArchiveError') })
    } finally {
      setExporting(false)
    }
  }

  if (!delivery) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#faf5ff_0%,#ffffff_45%,#fff7ed_100%)] px-6 py-10">
        <div className="fixed right-4 top-4 z-40 sm:right-6 sm:top-6">
          <LanguageSwitcher preserveUnlocalizedPath />
        </div>
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
            <p className="mt-4 text-base leading-7 text-stone-600">{t('enterPasswordBody')}</p>

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
      headerAction={<LanguageSwitcher preserveUnlocalizedPath />}
      afterHero={
        <div
          id="claim-delivery"
          className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/80 p-5 shadow-[0_18px_45px_-30px_rgba(5,150,105,0.35)]"
        >
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {t('claimBadge')}
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
            {t('claimTitle')}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-700">{t('claimBody')}</p>

          {currentUser ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-white p-4">
              <p className="text-sm font-semibold text-stone-900">
                {t('signedInAs', {
                  email: String(currentUser.email ?? ''),
                })}
              </p>
              <button
                type="button"
                onClick={attachDeliveryToCurrentUser}
                disabled={claiming}
                className="mt-4 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {claiming ? t('claimSaving') : t('saveToCurrentAccount')}
              </button>
            </div>
          ) : (
            <>
              <div className="mt-5 inline-flex rounded-full border border-emerald-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setClaimMode('register')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    claimMode === 'register'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-950'
                  }`}
                >
                  {t('createAccountTab')}
                </button>
                <button
                  type="button"
                  onClick={() => setClaimMode('login')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    claimMode === 'login'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-950'
                  }`}
                >
                  {t('loginTab')}
                </button>
              </div>

              {claimMode === 'register' ? (
                <form onSubmit={claimDelivery}>
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
                        setClaimForm((current) => ({
                          ...current,
                          accountPassword: event.target.value,
                        }))
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
              ) : (
                <form onSubmit={loginAndClaimDelivery}>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <input
                      type="email"
                      value={loginForm.email}
                      onChange={(event) =>
                        setLoginForm((current) => ({ ...current, email: event.target.value }))
                      }
                      placeholder={t('claimEmail')}
                      className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                      required
                    />
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(event) =>
                        setLoginForm((current) => ({ ...current, password: event.target.value }))
                      }
                      placeholder={t('loginPassword')}
                      className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={claiming}
                    className="mt-4 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {claiming ? t('loginSaving') : t('loginAndSave')}
                  </button>
                </form>
              )}

              <div className="mt-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-emerald-200" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  {t('or')}
                </span>
                <div className="h-px flex-1 bg-emerald-200" />
              </div>
              <a
                href={googleHref}
                onClick={rememberPasswordForGoogle}
                className="mt-4 inline-flex w-full items-center justify-center gap-3 rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-stone-800 no-underline shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <GoogleIcon className="h-5 w-5 shrink-0" />
                <span>{t('continueWithGoogle')}</span>
              </a>
            </>
          )}

          <div className="mt-5 border-t border-emerald-200 pt-5">
            <button
              type="button"
              onClick={exportDelivery}
              disabled={exporting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              <ExportFileIcon className="h-4 w-4 shrink-0" />
              <span>{exporting ? t('exportingArchive') : t('exportArchive')}</span>
            </button>
          </div>
        </div>
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
        digitalLegacyLabel: t('digitalLegacyLabel'),
        noDigitalLegacyItems: t('noDigitalLegacyItems'),
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
