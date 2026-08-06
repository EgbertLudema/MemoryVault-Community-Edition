'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'
import { AccountPageClient } from '@/components/account/AccountPageClient'

type LovedOneOption = {
  id: number
  fullName: string
  email: string
  trustedContactInviteStatus: 'none' | 'pending' | 'accepted'
}

type TrustedContactSetupButtonProps = {
  children: React.ReactNode
  className?: string
}

type TrustedContactSetupData = {
  userId: number
  email: string
  firstName: string
  lastName: string
  profileImageSrc: string
  subscriptionPlan: string
  subscriptionStatus: string
  subscriptionCurrentPeriodEnd: string | null
  enableLegacyProtection: boolean
  legacyProtectionPendingEnable: boolean
  lovedOneOptions: LovedOneOption[]
  legacyProtectionContactIds: number[]
}

type MeResponse = {
  user?: {
    id?: number
    email?: string | null
    firstName?: string | null
    lastName?: string | null
    profileImageSrc?: string | null
    subscriptionPlan?: string | null
    subscriptionStatus?: string | null
    subscriptionCurrentPeriodEnd?: string | null
    enableLegacyProtection?: boolean | null
    legacyProtectionPendingEnable?: boolean | null
    legacyProtectionContacts?: Array<number | { id?: number | null } | null> | null
  }
}

type LovedOneResponse = {
  docs?: Array<{
    id?: number
    fullName?: string | null
    email?: string | null
    trustedContactInviteStatus?: 'none' | 'pending' | 'accepted' | null
  }>
}

function getSelectedContactIds(
  contacts: Array<number | { id?: number | null } | null> | null | undefined,
) {
  return (contacts ?? [])
    .map((contact) => {
      if (typeof contact === 'number') {
        return contact
      }

      if (contact && typeof contact.id === 'number') {
        return contact.id
      }

      return null
    })
    .filter((id): id is number => typeof id === 'number')
}

async function loadTrustedContactSetupData(): Promise<TrustedContactSetupData> {
  const [meResponse, lovedOnesResponse] = await Promise.all([
    fetch('/api/app-auth/me', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }),
    fetch('/api/loved-ones?limit=100', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }),
  ])

  if (!meResponse.ok || !lovedOnesResponse.ok) {
    throw new Error('Unable to load trusted contact setup.')
  }

  const meData = (await meResponse.json()) as MeResponse
  const lovedOnesData = (await lovedOnesResponse.json()) as LovedOneResponse
  const user = meData.user

  if (!user?.id || !user?.email) {
    throw new Error('Unable to load trusted contact setup.')
  }

  const lovedOneOptions = (lovedOnesData.docs ?? [])
    .filter(
      (lovedOne): lovedOne is NonNullable<LovedOneResponse['docs']>[number] & { id: number } =>
        typeof lovedOne.id === 'number' &&
        typeof lovedOne.email === 'string' &&
        lovedOne.email.trim().length > 0,
    )
    .map((lovedOne) => ({
      id: lovedOne.id,
      fullName: lovedOne.fullName?.trim() || 'Unnamed loved one',
      email: lovedOne.email!.trim(),
      trustedContactInviteStatus: lovedOne.trustedContactInviteStatus ?? 'none',
    }))

  return {
    userId: user.id,
    email: user.email,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    profileImageSrc: user.profileImageSrc ?? '',
    subscriptionPlan: user.subscriptionPlan ?? 'free',
    subscriptionStatus: user.subscriptionStatus ?? 'inactive',
    subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd ?? null,
    enableLegacyProtection: Boolean(user.enableLegacyProtection),
    legacyProtectionPendingEnable: Boolean(user.legacyProtectionPendingEnable),
    lovedOneOptions,
    legacyProtectionContactIds: getSelectedContactIds(user.legacyProtectionContacts),
  }
}

export function TrustedContactSetupButton({ children, className }: TrustedContactSetupButtonProps) {
  const locale = useLocale()
  const modalT = useTranslations('Modal')
  const accountT = useTranslations('AccountPage')
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [data, setData] = React.useState<TrustedContactSetupData | null>(null)
  const [portalElement, setPortalElement] = React.useState<HTMLElement | null>(null)

  async function openModal(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    setOpen(true)

    if (data || loading) {
      return
    }

    try {
      setLoading(true)
      setError('')
      setData(await loadTrustedContactSetupData())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : accountT('saveChangesError'))
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    setPortalElement(document.body)
  }, [])

  React.useEffect(() => {
    if (!open) {
      return
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <a href={`/${locale}/trusted-contact`} className={className} onClick={openModal}>
        {children}
      </a>

      {open && portalElement
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={accountT('legacyProtectionTitle')}
              className="fixed inset-0 z-[1000] flex items-stretch justify-center bg-black/35 p-0 sm:items-center sm:p-4"
              onMouseDown={() => setOpen(false)}
            >
              <div
                className="relative flex h-dvh w-full max-w-[980px] flex-col overflow-hidden border border-[#eee] bg-white shadow-[0_10px_40px_rgba(0,0,0,0.18)] sm:h-auto sm:max-h-[calc(100vh_-_32px)] sm:rounded-2xl"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="sticky top-0 z-10 border-b border-[#eee] bg-white px-4 py-4 sm:bg-[#fafafa] sm:px-4 sm:py-[14px]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col pr-10">
                      <strong className="line-clamp-2 text-[15px] leading-5 text-slate-950 sm:text-[14px]">
                        {accountT('legacyProtectionTitle')}
                      </strong>
                      <span className="mt-[2px] hidden text-[12px] text-[#666] sm:block">
                        {modalT('escapeToClose')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label={modalT('close')}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[10px] border border-[#ddd] bg-white text-[18px] leading-[1] transition hover:bg-neutral-100 sm:top-3 sm:h-[36px] sm:w-[36px] sm:translate-y-0"
                    >
                      &times;
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-4 sm:px-4">
                  {loading ? (
                    <TrustedContactSetupSkeleton />
                  ) : error ? (
                    <div className="rounded-[24px] border border-red-200 bg-red-50 p-5 text-sm text-red-800">
                      {error}
                    </div>
                  ) : data ? (
                    <AccountPageClient
                      variant="legacy"
                      userId={data.userId}
                      locale={locale}
                      initialFirstName={data.firstName}
                      initialLastName={data.lastName}
                      initialProfileImageSrc={data.profileImageSrc}
                      email={data.email}
                      initialLegacyProtectionEnabled={data.enableLegacyProtection}
                      initialLegacyProtectionPendingEnable={data.legacyProtectionPendingEnable}
                      lovedOneOptions={data.lovedOneOptions}
                      initialLegacyProtectionContactIds={data.legacyProtectionContactIds}
                    />
                  ) : null}
                </div>
              </div>
            </div>,
            portalElement,
          )
        : null}
    </>
  )
}

function TrustedContactSetupSkeleton() {
  return (
    <div className="grid gap-4 pb-4">
      <div className="rounded-[28px] corner-shape-squircle border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(255,247,237,0.9))] p-4 sm:p-5">
        <div className="mb-6">
          <div className="h-3 w-36 animate-pulse rounded-full bg-amber-200/80" />
          <div className="mt-3 h-8 w-72 max-w-full animate-pulse rounded-full bg-stone-200" />
          <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded-full bg-stone-200/80" />
          <div className="mt-2 h-4 w-4/5 max-w-xl animate-pulse rounded-full bg-stone-200/70" />
          <div className="mt-4 h-4 w-56 animate-pulse rounded-full bg-stone-200/80" />
        </div>

        <div className="rounded-[28px] corner-shape-squircle border border-amber-200/90 bg-white/70 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="w-full max-w-2xl">
              <div className="h-5 w-52 animate-pulse rounded-full bg-amber-200/80" />
              <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-stone-200/80" />
              <div className="mt-2 h-4 w-3/4 animate-pulse rounded-full bg-stone-200/70" />
            </div>
            <div className="h-10 w-28 animate-pulse rounded-full bg-stone-200" />
          </div>

          <div className="mt-5 rounded-[24px] corner-shape-squircle border border-white/80 bg-white/80 p-4">
            <div className="h-5 w-44 animate-pulse rounded-full bg-stone-200" />
            <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded-full bg-stone-200/70" />
            <div className="mt-4 grid gap-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-[24px] corner-shape-squircle border border-stone-200/80 bg-white p-4"
                >
                  <div className="mt-1 h-4 w-4 shrink-0 animate-pulse rounded bg-stone-200" />
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-40 animate-pulse rounded-full bg-stone-200" />
                    <div className="mt-3 h-4 w-64 max-w-full animate-pulse rounded-full bg-stone-200/70" />
                  </div>
                  <div className="h-7 w-24 shrink-0 animate-pulse rounded-full bg-stone-200/80" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
