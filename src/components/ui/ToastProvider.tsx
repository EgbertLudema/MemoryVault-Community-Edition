'use client'

import * as React from 'react'
import gsap from 'gsap'
import { useTranslations } from 'next-intl'

type ToastTone = 'success' | 'error' | 'warning' | 'info'

type Toast = {
  id: number
  tone: ToastTone
  message: string
}

type ToastInput = {
  tone?: ToastTone
  message: string
}

type ToastContextValue = {
  showToast: (toast: ToastInput) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

const toneClasses: Record<ToastTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  info: 'border-sky-200 bg-sky-50 text-sky-950',
}

const dotClasses: Record<ToastTone, string> = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Toast')
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const nextIdRef = React.useRef(1)

  const removeToast = React.useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = React.useCallback(
    ({ tone = 'info', message }: ToastInput) => {
      const trimmedMessage = message.trim()

      if (!trimmedMessage) {
        return
      }

      const id = nextIdRef.current
      nextIdRef.current += 1

      setToasts((current) =>
        [...current, { id, tone, message: translateToastMessage(trimmedMessage, t) }].slice(-4),
      )
    },
    [t],
  )

  const value = React.useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[9999] flex flex-col gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:top-auto sm:w-[min(420px,calc(100vw-2rem))]">
        {toasts.map((toast) => (
          <ToastMessage key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function translateToastMessage(message: string, t: ReturnType<typeof useTranslations<'Toast'>>) {
  const memoryLimitMatch = message.match(/^Your plan can have at most (\d+) memories\.?$/i)

  if (memoryLimitMatch) {
    return t('memoryLimit', { max: Number(memoryLimitMatch[1]) })
  }

  const lovedOneLimitMatch = message.match(/^Your plan can have at most (\d+) loved ones\.?$/i)

  if (lovedOneLimitMatch) {
    return t('lovedOneLimit', { max: Number(lovedOneLimitMatch[1]) })
  }

  const openWhenLimitMatch = message.match(
    /^Your plan can have at most (\d+) Open When messages\.?$/i,
  )

  if (openWhenLimitMatch) {
    return t('openWhenMessageLimit', { max: Number(openWhenLimitMatch[1]) })
  }

  const translations: Record<string, string> = {
    'Email and password are required': t('emailPasswordRequired'),
    'Email is required': t('emailRequired'),
    'Email, code, and password are required': t('resetFieldsRequired'),
    'Password must be at least 8 characters': t('passwordMinLength'),
    'Invalid or expired reset code': t('invalidResetCode'),
    'Password reset successful': t('passwordResetSuccessful'),
    'Unable to send reset code': t('unableToSendResetCode'),
    'Unable to reset password': t('unableToResetPassword'),
    Unauthorized: t('unauthorized'),
    Forbidden: t('forbidden'),
    'Not found': t('notFound'),
    'Title is required': t('titleRequired'),
    'Valid memoryDate is required': t('validMemoryDateRequired'),
    'Link at least one group or loved one': t('linkGroupOrLovedOne'),
    'Content is required': t('contentRequired'),
    'Each memory can only have one note': t('singleNoteOnly'),
    'No valid content items found': t('noValidContent'),
    'One or more groups are invalid': t('invalidGroups'),
    'One or more loved ones are invalid': t('invalidLovedOnes'),
    'Full name is required': t('fullNameRequired'),
    'Relationship is required': t('relationshipRequired'),
    'Exactly one group is required': t('exactlyOneGroupRequired'),
    'At least one group is required': t('atLeastOneGroupRequired'),
    'Group name is required': t('groupNameRequired'),
    'A group with this name already exists': t('groupNameExists'),
    'A file is required': t('fileRequired'),
    'Video poster must be an image file': t('videoPosterImageRequired'),
    'Failed to load memory': t('loadMemoryFailed'),
    'Failed to save memory': t('saveMemoryFailed'),
    'Failed to delete memory': t('deleteMemoryFailed'),
    'Failed to load loved ones': t('loadLovedOnesFailed'),
    'Failed to create loved one': t('createLovedOneFailed'),
    'Failed to load groups': t('loadGroupsFailed'),
    'Failed to create group': t('createGroupFailed'),
  }

  return translations[message] ?? message
}

function ToastMessage({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const t = useTranslations('Toast')
  const ref = React.useRef<HTMLDivElement | null>(null)
  const closingRef = React.useRef(false)

  const isDesktop = React.useCallback(() => {
    return window.matchMedia('(min-width: 640px)').matches
  }, [])

  const close = React.useCallback(() => {
    const element = ref.current

    if (!element || closingRef.current) {
      return
    }

    closingRef.current = true

    gsap.to(element, {
      autoAlpha: 0,
      y: isDesktop() ? 28 : -28,
      scale: 0.98,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: onRemove,
    })
  }, [isDesktop, onRemove])

  React.useLayoutEffect(() => {
    const element = ref.current

    if (!element) {
      return
    }

    gsap.fromTo(
      element,
      {
        autoAlpha: 0,
        y: isDesktop() ? 34 : -34,
        scale: 0.96,
      },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.42,
        ease: 'back.out(1.45)',
      },
    )

    return () => {
      gsap.killTweensOf(element)
    }
  }, [isDesktop])

  React.useEffect(() => {
    const timeoutId = window.setTimeout(close, 5200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [close])

  return (
    <div
      ref={ref}
      className={[
        'pointer-events-auto flex items-start gap-3 rounded-[18px] border px-4 py-3 text-sm opacity-0 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur-md',
        toneClasses[toast.tone],
      ].join(' ')}
    >
      <span
        className={['mt-1 h-2.5 w-2.5 shrink-0 rounded-full', dotClasses[toast.tone]].join(' ')}
      />
      <p className="min-w-0 flex-1 leading-5">{toast.message}</p>
      <button
        type="button"
        onClick={close}
        className="ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full opacity-60 transition hover:bg-white/60 hover:opacity-100"
        aria-label={t('close')}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        >
          <path d="M5 5l10 10" />
          <path d="M15 5L5 15" />
        </svg>
      </button>
    </div>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }

  return context
}
