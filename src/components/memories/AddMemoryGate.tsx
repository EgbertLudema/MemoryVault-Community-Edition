'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { UpgradeToProLink } from '@/components/ui/UpgradeToProLink'
import { SecondaryButton } from '@/components/ui/SecondairyButton'

type MemoryCreationGateValue = {
  currentMemoryCount: number
  memoryCountLimit: number | null
  currentLovedOneCount: number
  lovedOneCountLimit: number | null
  guardAddMemoryClick: (event: React.MouseEvent<HTMLElement>, href?: string) => void
}

const MemoryCreationGateContext = React.createContext<MemoryCreationGateValue | null>(null)
type LimitModalKind = 'memory' | 'lovedOne'

function isAddMemoryHref(href?: string) {
  return href === '/memories/new'
}

function isAddLovedOneHref(href?: string) {
  return href === '/loved-ones/new'
}

export function AddMemoryGate({
  currentMemoryCount,
  memoryCountLimit,
  currentLovedOneCount = 0,
  lovedOneCountLimit = null,
  children,
}: {
  currentMemoryCount: number
  memoryCountLimit: number | null
  currentLovedOneCount?: number
  lovedOneCountLimit?: number | null
  children: React.ReactNode
}) {
  const tMemory = useTranslations('MemoryLimitModal')
  const tLovedOne = useTranslations('LovedOneLimitModal')
  const [openKind, setOpenKind] = React.useState<LimitModalKind | null>(null)
  const isAtMemoryLimit = memoryCountLimit !== null && currentMemoryCount >= memoryCountLimit
  const isAtLovedOneLimit =
    lovedOneCountLimit !== null && currentLovedOneCount >= lovedOneCountLimit

  const guardAddMemoryClick = React.useCallback(
    (event: React.MouseEvent<HTMLElement>, href?: string) => {
      if (isAddMemoryHref(href) && isAtMemoryLimit) {
        event.preventDefault()
        setOpenKind('memory')
        return
      }

      if (isAddLovedOneHref(href) && isAtLovedOneLimit) {
        event.preventDefault()
        setOpenKind('lovedOne')
      }
    },
    [isAtLovedOneLimit, isAtMemoryLimit],
  )

  const value = React.useMemo(
    () => ({
      currentMemoryCount,
      memoryCountLimit,
      currentLovedOneCount,
      lovedOneCountLimit,
      guardAddMemoryClick,
    }),
    [
      currentLovedOneCount,
      currentMemoryCount,
      guardAddMemoryClick,
      lovedOneCountLimit,
      memoryCountLimit,
    ],
  )
  const modalTranslations = openKind === 'lovedOne' ? tLovedOne : tMemory
  const modalLimit = openKind === 'lovedOne' ? lovedOneCountLimit : memoryCountLimit

  return (
    <MemoryCreationGateContext.Provider value={value}>
      {children}

      {openKind ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={modalTranslations('title')}
          className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/35 p-4 sm:items-center"
          onMouseDown={() => setOpenKind(null)}
        >
          <div
            className="w-full max-w-[440px] rounded-2xl corner-shape-squircle border border-white/80 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-950">
                  {modalTranslations('title')}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {modalTranslations('body', { max: modalLimit ?? 0 })}
                </p>
              </div>
              <SecondaryButton
                type="button"
                onClick={() => setOpenKind(null)}
                aria-label={modalTranslations('close')}
                className="h-9 w-9 shrink-0 rounded-lg px-0 text-lg leading-none"
              >
                &times;
              </SecondaryButton>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <UpgradeToProLink
                label={modalTranslations('upgrade')}
                className="h-11 px-5 text-sm"
              />
              <Link
                href="/#plans"
                className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 no-underline transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
              >
                {modalTranslations('showPlans')}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </MemoryCreationGateContext.Provider>
  )
}

export function useMemoryCreationGate() {
  return React.useContext(MemoryCreationGateContext)
}

export function GuardedAddMemoryLink({
  href = '/memories/new',
  children,
  className,
  ariaLabel,
}: {
  href?: string
  children: React.ReactNode
  className?: string
  ariaLabel?: string
}) {
  const gate = useMemoryCreationGate()

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      onClick={(event) => gate?.guardAddMemoryClick(event, href)}
      className={className}
    >
      {children}
    </Link>
  )
}
