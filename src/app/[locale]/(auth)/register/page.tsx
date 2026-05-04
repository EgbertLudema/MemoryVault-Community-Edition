'use client'

import React, { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { MemoryVaultLogo } from '@/components/ui/MemoryVaultLogo'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { Link, useRouter } from '@/i18n/navigation'
import { APP_AUTH_COOKIE } from '@/lib/appAuthShared'

function getPasswordStrength(password: string) {
  const trimmed = password.trim()
  const checks = {
    length: trimmed.length >= 8,
    uppercase: /[A-Z]/.test(trimmed),
    lowercase: /[a-z]/.test(trimmed),
    number: /\d/.test(trimmed),
    special: /[^A-Za-z0-9]/.test(trimmed),
  }

  const passedChecks = Object.values(checks).filter(Boolean).length

  if (!trimmed) {
    return {
      score: 0,
      widthClassName: 'w-0',
      barClassName: 'bg-gray-200',
      checks,
    }
  }

  if (passedChecks <= 2) {
    return {
      score: 1,
      widthClassName: 'w-1/4',
      barClassName: 'bg-red-400',
      checks,
    }
  }

  if (passedChecks === 3) {
    return {
      score: 2,
      widthClassName: 'w-2/4',
      barClassName: 'bg-orange-400',
      checks,
    }
  }

  if (passedChecks === 4) {
    return {
      score: 3,
      widthClassName: 'w-3/4',
      barClassName: 'bg-green-500',
      checks,
    }
  }

  return {
    score: 4,
    widthClassName: 'w-full',
    barClassName: 'bg-emerald-700',
    checks,
  }
}

export default function RegisterPage() {
  const t = useTranslations('Auth')
  const router = useRouter()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordStrength = getPasswordStrength(password)

  useEffect(() => {
    const hasToken = document.cookie.includes(`${APP_AUTH_COOKIE}=`)

    if (hasToken) {
      router.replace('/dashboard')
    }
  }, [router])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const safeFirstName = firstName.trim()
    const safeLastName = lastName.trim()
    const safeEmail = email.trim()

    if (!safeFirstName || !safeLastName || !safeEmail || !password) {
      setError(t('missingRegisterFields'))
      return
    }

    try {
      setLoading(true)
      setError(null)

      const registerResponse = await fetch('/api/app-auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: safeFirstName,
          lastName: safeLastName,
          email: safeEmail,
          password,
        }),
      })

      const registerData = await registerResponse.json().catch(() => ({}))

      if (!registerResponse.ok) {
        const message =
          typeof registerData?.errors?.[0]?.message === 'string'
            ? registerData.errors[0].message
            : typeof registerData?.message === 'string'
              ? registerData.message
              : t('registrationFailed')

        setError(message)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error(err)
      setError(t('registrationFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-linear-to-br from-purple-50 via-white to-purple-50">
      <div className="w-full max-w-md">
        <div className="flex flex-row items-center justify-start gap-6 mb-8">
          <div className="h-16 w-16 flex items-center justify-center">
            <MemoryVaultLogo />
          </div>
          <h1 className="text-5xl font-semibold font-serif bg-linear-to-r from-purple-400 via-purple-500 to-purple-500 bg-clip-text text-transparent">
            Memory Vault
          </h1>
        </div>

        <div className="rounded-2xl border border-gray-200 p-6 bg-white/80 backdrop-blur shadow-lg">
          <h2 className="text-lg font-medium mb-6 text-center text-gray-900">
            {t('registerTitle')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('firstName')}
              </label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                className="w-full h-11 rounded-xl border border-gray-300 bg-white text-gray-900 px-3 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors placeholder:text-gray-400"
                placeholder={t('enterFirstName')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('lastName')}
              </label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                className="w-full h-11 rounded-xl border border-gray-300 bg-white text-gray-900 px-3 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors placeholder:text-gray-400"
                placeholder={t('enterLastName')}
              />
            </div>

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
                autoComplete="new-password"
                className="w-full h-11 rounded-xl border border-gray-300 bg-white text-gray-900 px-3 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors placeholder:text-gray-400"
                placeholder={t('createPassword')}
              />
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={[
                      'h-full rounded-full transition-all duration-300',
                      passwordStrength.widthClassName,
                      passwordStrength.barClassName,
                    ].join(' ')}
                  />
                </div>
                <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-gray-600 sm:grid-cols-2">
                  {[
                    [t('passwordChecks.characters'), passwordStrength.checks.length],
                    [t('passwordChecks.uppercase'), passwordStrength.checks.uppercase],
                    [t('passwordChecks.lowercase'), passwordStrength.checks.lowercase],
                    [t('passwordChecks.number'), passwordStrength.checks.number],
                    [t('passwordChecks.special'), passwordStrength.checks.special],
                  ].map(([label, passed]) => (
                    <div
                      key={String(label)}
                      className={[
                        'flex items-center gap-2',
                        passed ? 'text-emerald-700' : 'text-gray-500',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold',
                          passed ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500',
                        ].join(' ')}
                      >
                        {passed ? '✓' : '•'}
                      </span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <PrimaryButton type="submit" disabled={loading} className="w-full h-11 rounded-full">
              {loading ? t('registerSubmitting') : t('registerSubmit')}
            </PrimaryButton>
          </form>

          <p className="mt-5 text-center text-sm text-gray-600">
            {t('alreadyHaveAccount')}{' '}
            <Link href="/login" className="font-medium text-purple-600 hover:text-purple-700">
              {t('signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
