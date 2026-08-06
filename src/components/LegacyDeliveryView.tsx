'use client'

import { useState, type ReactNode } from 'react'
import { ExportFileIcon } from '@/components/icons/ExportFileIcon'
import { LockIcon } from '@/components/icons/LockIcon'
import { UnlockIcon } from '@/components/icons/UnlockIcon'
import { RecipientMemoryAlbums } from '@/components/recipient/RecipientMemoryAlbums'
import type { LegacyDeliveryData, LegacyOpenWhenMessage } from '@/lib/legacyDeliveryContent'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { useToast } from '@/components/ui/ToastProvider'
import { analytics } from '@/lib/analytics'

type LegacyDeliveryViewProps = {
  delivery: LegacyDeliveryData
  locale: string
  headerAction?: ReactNode
  afterHero?: ReactNode
  labels: {
    deliveryLabel: string
    collectionTitle: string
    collectionBody: string
    collectionFallbackName: string
    noteLabel: string
    noMemoriesAssigned: string
    memoryLabel: string
    undated: string
    untitledMemory: string
    sharedMemoryAlt: string
    noteTypeLabel: string
    photosTypeLabel: string
    videoTypeLabel: string
    openWhenMessagesLabel: string
    digitalLegacyLabel: string
    noDigitalLegacyItems: string
    lockedOpenWhenEyebrow: string
    lockedOpenWhenBody: string
    lockedOpenWhenDialogTitle: string
    lockedOpenWhenDialogBody: string
    lockedOpenWhenCreateAccount: string
    lockedOpenWhenClose: string
    lockedOpenWhenFallbackTitle: string
    sharedByLabel: string
  }
  exportAction?: {
    url: string
    buttonLabel: string
    exportingLabel: string
    errorLabel: string
  }
}

function formatMemoryDate(value: string | null, locale: string, undatedLabel: string) {
  if (!value) {
    return undatedLabel
  }

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return undatedLabel
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function LegacyDeliveryView({
  delivery,
  locale,
  headerAction,
  afterHero,
  labels,
  exportAction,
}: LegacyDeliveryViewProps) {
  const openWhenMessages = Array.isArray(delivery.openWhenMessages) ? delivery.openWhenMessages : []
  const digitalLegacyItems = Array.isArray(delivery.digitalLegacyItems)
    ? delivery.digitalLegacyItems
    : []
  const [selectedLockedOpenWhen, setSelectedLockedOpenWhen] =
    useState<LegacyOpenWhenMessage | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const { showToast } = useToast()

  async function handleExport() {
    if (!exportAction || isExporting) {
      return
    }

    setIsExporting(true)
    analytics.capture('memory_export_started', { source: 'recipient_preview' })

    try {
      const response = await fetch(exportAction.url, {
        method: 'GET',
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
      analytics.capture('memory_export_completed', {
        source: 'recipient_preview',
        completion_status: 'completed',
      })
    } catch (error) {
      console.error(error)
      showToast({ tone: 'error', message: exportAction.errorLabel })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf5ff_0%,#ffffff_45%,#fff7ed_100%)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        {headerAction ? <div className="mb-4 flex justify-end sm:mb-6">{headerAction}</div> : null}
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-7 shadow-[0_25px_80px_-35px_rgba(109,40,217,0.35)] backdrop-blur-xl sm:p-8 md:p-10">
          {delivery.ownerProfileImageSrc ? (
            <img
              src={delivery.ownerProfileImageSrc}
              alt=""
              className="mb-6 h-20 w-20 rounded-full border-4 border-white object-cover shadow-[0_18px_45px_rgba(109,40,217,0.22)]"
            />
          ) : null}

          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-purple-500">
            {labels.deliveryLabel}
          </p>
          {delivery.ownerDisplayName ? (
            <div className="mt-3 inline-flex items-center gap-2.5 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm ring-1 ring-stone-200/70">
              {!delivery.ownerProfileImageSrc ? (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                  {delivery.ownerDisplayName.slice(0, 1).toUpperCase()}
                </span>
              ) : null}
              {labels.sharedByLabel.replace('{name}', delivery.ownerDisplayName)}
            </div>
          ) : null}
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-stone-900 md:text-5xl">
            {labels.collectionTitle.replace(
              '{name}',
              delivery.recipientName || labels.collectionFallbackName,
            )}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-600">{labels.collectionBody}</p>

          {exportAction ? (
            <div className="mt-6 flex flex-col items-start gap-3">
              <PrimaryButton
                onClick={handleExport}
                disabled={isExporting}
                className="rounded-full px-5 py-3"
              >
                <span className="inline-flex items-center gap-2">
                  <ExportFileIcon className="h-4 w-4 shrink-0" />
                  <span>
                    {isExporting ? exportAction.exportingLabel : exportAction.buttonLabel}
                  </span>
                </span>
              </PrimaryButton>
            </div>
          ) : null}
        </div>

        {afterHero ? <div className="mt-6">{afterHero}</div> : null}

        <section className="mt-8 rounded-[2rem] border border-purple-100/80 bg-white/90 p-7 shadow-[0_20px_60px_-34px_rgba(109,40,217,0.28)] backdrop-blur-xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-purple-500">
            {labels.noteLabel}
          </p>
          <p className="mt-4 whitespace-pre-wrap text-lg leading-9 text-stone-700">
            {delivery.recipientNote}
          </p>
        </section>

        <section className="mt-10">
          {openWhenMessages.length > 0 ? (
            <div className="mb-10 rounded-[2rem] border border-purple-100/80 bg-white/90 p-7 shadow-[0_20px_60px_-34px_rgba(109,40,217,0.28)] backdrop-blur-xl sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-purple-500">
                {labels.openWhenMessagesLabel}
              </p>
              <div className="mt-5 grid gap-4">
                {openWhenMessages.map((message) => (
                  <button
                    key={String(message.id)}
                    type="button"
                    onClick={() => setSelectedLockedOpenWhen(message)}
                    className="group w-full cursor-pointer rounded-[1.35rem] border border-stone-200 bg-white p-5 text-left shadow-[0_12px_34px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-[0_18px_42px_rgba(109,40,217,0.10)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-200"
                  >
                    <div className="flex items-start gap-4">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-purple-50 text-purple-700 ring-1 ring-purple-100">
                        <LockIcon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-purple-500">
                          {labels.lockedOpenWhenEyebrow}
                        </span>
                        <span className="mt-2 block text-xl font-bold tracking-tight text-stone-900">
                          {message.title || labels.lockedOpenWhenFallbackTitle}
                        </span>
                        {message.triggerDate ? (
                          <span className="mt-1 block text-sm font-semibold text-purple-700">
                            {formatMemoryDate(message.triggerDate, locale, labels.undated)}
                          </span>
                        ) : null}
                        <span className="mt-2 block text-sm leading-6 text-stone-600">
                          {labels.lockedOpenWhenBody}
                        </span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {digitalLegacyItems.length > 0 ? (
            <div className="mb-10 rounded-[2rem] border border-purple-100/80 bg-white/90 p-7 shadow-[0_20px_60px_-34px_rgba(109,40,217,0.28)] backdrop-blur-xl sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-purple-500">
                {labels.digitalLegacyLabel}
              </p>
              <div className="mt-5 grid gap-4">
                {digitalLegacyItems.map((item) => (
                  <article
                    key={String(item.id)}
                    className="rounded-[1.35rem] border border-stone-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]"
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-500">
                      {item.category}
                    </div>
                    <h2 className="mt-2 text-xl font-bold tracking-tight text-stone-900">
                      {item.title}
                    </h2>
                    {item.notes ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-700">
                        {item.notes}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {delivery.memories.length === 0 &&
          openWhenMessages.length === 0 &&
          digitalLegacyItems.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-purple-200 bg-white/80 px-7 py-10 text-center text-stone-600 shadow-[0_18px_50px_-30px_rgba(24,24,27,0.12)]">
              {labels.noMemoriesAssigned}
            </div>
          ) : delivery.memories.length > 0 ? (
            <div className="rounded-[30px] corner-shape-squircle border border-white/75 bg-white/65 p-7 shadow-[0_18px_50px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:p-8">
              <RecipientMemoryAlbums
                memories={delivery.memories}
                labels={{ noMemories: labels.noMemoriesAssigned }}
              />
            </div>
          ) : null}
        </section>
      </div>

      {selectedLockedOpenWhen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8"
          onClick={() => setSelectedLockedOpenWhen(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="locked-open-when-title"
            className="w-[min(92vw,520px)] rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_26px_80px_rgba(15,23,42,0.24)] sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-purple-50 text-purple-700 ring-1 ring-purple-100">
                <LockIcon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-500">
                  {labels.lockedOpenWhenEyebrow}
                </div>
                <h2
                  id="locked-open-when-title"
                  className="mt-2 text-2xl font-bold tracking-tight text-stone-950"
                >
                  {labels.lockedOpenWhenDialogTitle}
                </h2>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-stone-50 p-4 text-sm font-semibold text-stone-800">
              {selectedLockedOpenWhen.title || labels.lockedOpenWhenFallbackTitle}
              {selectedLockedOpenWhen.triggerDate ? (
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-purple-700">
                  {formatMemoryDate(selectedLockedOpenWhen.triggerDate, locale, labels.undated)}
                </div>
              ) : null}
            </div>
            <p className="mt-4 text-sm leading-7 text-stone-600">
              {labels.lockedOpenWhenDialogBody}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSelectedLockedOpenWhen(null)}
                className="inline-flex justify-center rounded-full border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                {labels.lockedOpenWhenClose}
              </button>
              <a
                href="#claim-delivery"
                onClick={() => setSelectedLockedOpenWhen(null)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-5 py-3 text-sm font-semibold text-white no-underline shadow-[0_14px_30px_rgba(124,58,237,0.24)] transition hover:bg-purple-700"
              >
                <UnlockIcon className="h-4 w-4" />
                {labels.lockedOpenWhenCreateAccount}
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
