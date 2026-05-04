'use client'

import React, { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { MemoryVaultLogo } from '@/components/ui/MemoryVaultLogo'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { Link, useRouter } from '@/i18n/navigation'
import { APP_AUTH_COOKIE } from '@/lib/appAuthShared'
import { getSafeLocalizedPath } from '@/lib/localizedRedirect'

export default function LoginPage() {
  const t = useTranslations('Auth')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If already logged in, redirect away from login
    const hasToken = document.cookie.includes(`${APP_AUTH_COOKIE}=`)

    if (hasToken) {
      router.replace('/dashboard')
    }
  }, [router])

  useEffect(() => {
    if (searchParams.get('error') === 'google_auth_failed') {
      setError(t('googleAuthFailed'))
    }
  }, [searchParams, t])

  const next = searchParams.get('next')
  const googleHref = next
    ? `/api/app-auth/google/start?next=${encodeURIComponent(next)}`
    : '/api/app-auth/google/start'

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const safeEmail = email.trim()
    if (!safeEmail || !password) {
      setError(t('missingLoginFields'))
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/app-auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: safeEmail,
          password,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const message =
          typeof data?.errors?.[0]?.message === 'string'
            ? data.errors[0].message
            : typeof data?.message === 'string'
              ? data.message
              : t('loginFailed')

        setError(message)
        return
      }

      const next = getSafeLocalizedPath(searchParams.get('next'), locale)
      if (next) {
        window.location.href = next
        return
      }

      router.push('/dashboard')
    } catch (err) {
      console.error(err)
      setError(t('loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-linear-to-br from-purple-50 via-white to-purple-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-row items-center justify-start gap-6 mb-8">
          <div className="h-16 w-16 flex items-center justify-center">
            <MemoryVaultLogo />
          </div>
          <h1 className="text-5xl font-semibold font-serif bg-linear-to-r from-purple-400 via-purple-500 to-purple-500 bg-clip-text text-transparent">
            Memory Vault
          </h1>
        </div>

        <div className="rounded-2xl border border-gray-200 p-6 bg-white/80 backdrop-blur shadow-lg">
          <h2 className="text-lg font-medium mb-6 text-center text-gray-900">{t('loginTitle')}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('email')}</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                className="w-full h-11 rounded-xl border border-gray-300 bg-white text-gray-900 px-3 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors placeholder:text-gray-400"
                placeholder={t('enterEmail')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('password')}
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                className="w-full h-11 rounded-xl border border-gray-300 bg-white text-gray-900 px-3 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors placeholder:text-gray-400"
                placeholder={t('enterPassword')}
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <PrimaryButton type="submit" disabled={loading} className="w-full h-11 rounded-full">
              {loading ? t('loginSubmitting') : t('loginSubmit')}
            </PrimaryButton>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-gray-400">
            <div className="h-px flex-1 bg-gray-200" />
            <span>{t('orContinueWith')}</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <a
            href={googleHref}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
          >
            <span className="text-base font-semibold text-[#4285F4]">G</span>
            <span>{t('continueWithGoogle')}</span>
          </a>

          <p className="mt-5 text-center text-sm text-gray-600">
            {t('newHere')}{' '}
            <Link href="/register" className="font-medium text-purple-600 hover:text-purple-700">
              {t('createAccount')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
