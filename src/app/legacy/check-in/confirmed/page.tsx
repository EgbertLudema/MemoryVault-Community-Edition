'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { analytics } from '@/lib/analytics'

type ConfirmationStatus = 'healthy' | 'unhealthy' | 'passed'

function getStatus(value: string | null): ConfirmationStatus {
  if (value === 'unhealthy' || value === 'passed') {
    return value
  }

  return 'healthy'
}

function getCopy(status: ConfirmationStatus) {
  if (status === 'unhealthy') {
    return {
      title: 'Thank you',
      message: 'Memory Vault will ask the trusted contacts again in 30 days.',
    }
  }

  if (status === 'passed') {
    return {
      title: 'Delivery started',
      message: 'Memory Vault started delivery to the linked recipients.',
    }
  }

  return {
    title: 'Thank you',
    message: 'Your Memory Vault check-in has been confirmed.',
  }
}

function CheckInConfirmedContent() {
  const searchParams = useSearchParams()
  const status = getStatus(searchParams.get('status'))
  const copy = getCopy(status)

  useEffect(() => {
    analytics.captureOnce(`check_in_confirmation_completed:${status}`, 'check_in_confirmation_completed', {
      source: 'recipient_preview',
      completion_status: status === 'passed' ? 'completed' : 'skipped',
    })
  }, [status])

  return (
    <main className="grid min-h-screen place-items-center bg-[#faf5ff] px-4 py-10 font-sans text-stone-800">
      <section className="w-full max-w-xl rounded-3xl border border-stone-200 bg-white p-8 shadow-[0_24px_80px_-48px_rgba(24,24,27,.45)]">
        <h1 className="m-0 text-3xl font-bold leading-tight text-stone-900">{copy.title}</h1>
        <p className="mt-3 text-base leading-7 text-stone-600">{copy.message}</p>
      </section>
    </main>
  )
}

export default function CheckInConfirmedPage() {
  return (
    <Suspense fallback={null}>
      <CheckInConfirmedContent />
    </Suspense>
  )
}
