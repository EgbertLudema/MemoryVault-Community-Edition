'use client'

import { useState } from 'react'
import { AlbumCarousel } from '@/components/memories/AlbumCarousel'
import { AlbumTile } from '@/components/memories/AlbumTile'
import { ITEM_HEIGHT, ITEM_WIDTH } from '@/components/memories/constants'
import { ExportFileIcon } from '@/components/icons/ExportFileIcon'
import type { Album } from '@/components/memories/types'
import type { LegacyDeliveryData, LegacyMemory } from '@/lib/legacyDeliveryContent'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

type LegacyDeliveryViewProps = {
  delivery: LegacyDeliveryData
  locale: string
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
  }
  exportAction?: {
    url: string
    buttonLabel: string
    exportingLabel: string
    errorLabel: string
  }
}

type TimelineGroup = {
  key: string
  label: string
  memories: LegacyMemory[]
}

function getMemoryTime(value: string | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY
  }

  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY
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

function getDateGroupKey(value: string | null) {
  if (!value) {
    return 'undated'
  }

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return 'undated'
  }

  return date.toISOString().slice(0, 10)
}

function sortMemoriesByDate(memories: LegacyMemory[]) {
  return [...memories].sort((a, b) => {
    const aTime = getMemoryTime(a.memoryDate)
    const bTime = getMemoryTime(b.memoryDate)

    if (aTime === bTime) {
      return String(a.title ?? '').localeCompare(String(b.title ?? ''))
    }

    return aTime - bTime
  })
}

function groupMemoriesByDate(
  memories: LegacyMemory[],
  locale: string,
  undatedLabel: string,
): TimelineGroup[] {
  const groups = new Map<string, TimelineGroup>()

  for (const memory of sortMemoriesByDate(memories)) {
    const key = getDateGroupKey(memory.memoryDate)
    const existing = groups.get(key)

    if (existing) {
      existing.memories.push(memory)
      continue
    }

    groups.set(key, {
      key,
      label: formatMemoryDate(memory.memoryDate, locale, undatedLabel),
      memories: [memory],
    })
  }

  return Array.from(groups.values())
}

function buildAlbumFromLegacyMemory(memory: LegacyMemory): Album {
  const contentItems: NonNullable<Album['contentItems']> = []

  memory.content.forEach((item, index) => {
    if (item.type === 'note') {
      const note = item.note.trim()

      if (note) {
        contentItems.push({
          id: `${memory.id}-note-${index}`,
          kind: 'note',
          note,
        })
      }

      return
    }

    const url = String(item.media?.url ?? '').trim()
    const previewUrl =
      item.type === 'video' ? String(item.media?.posterUrl ?? '').trim() || url : url

    if (!previewUrl) {
      return
    }

    contentItems.push({
      id: `${memory.id}-${item.type}-${index}`,
      kind: 'media',
      mediaType: item.type,
      url: previewUrl,
      fullUrl: url,
      isEncrypted: Boolean(item.media?.isEncrypted),
      encryptionMetadata: item.media?.encryptionMetadata,
      posterEncryptionMetadata: item.media?.posterEncryptionMetadata,
    })
  })

  return {
    id: String(memory.id),
    title: memory.title,
    createdAt: memory.memoryDate ?? new Date(0).toISOString(),
    photos: [],
    contentItems,
    hasNote: memory.content.some((item) => item.type === 'note' && item.note.trim()),
    hasImage: memory.content.some((item) => item.type === 'image' && item.media?.url),
    hasVideo: memory.content.some((item) => item.type === 'video' && item.media?.url),
  }
}

export function LegacyDeliveryView({
  delivery,
  locale,
  labels,
  exportAction,
}: LegacyDeliveryViewProps) {
  const timelineGroups = groupMemoriesByDate(delivery.memories, locale, labels.undated)
  const [expandedAlbum, setExpandedAlbum] = useState<Album | null>(null)
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  function openAlbum(album: Album) {
    setExpandedAlbum(album)
    setActivePhotoIndex(0)
  }

  function closeAlbum() {
    setExpandedAlbum(null)
    setActivePhotoIndex(0)
  }

  async function handleExport() {
    if (!exportAction || isExporting) {
      return
    }

    setIsExporting(true)
    setExportError('')

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
    } catch (error) {
      console.error(error)
      setExportError(exportAction.errorLabel)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf5ff_0%,#ffffff_45%,#fff7ed_100%)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
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
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-stone-900 md:text-5xl">
            {labels.collectionTitle.replace(
              '{name}',
              delivery.recipientName || labels.collectionFallbackName,
            )}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-600">
            {labels.collectionBody}
          </p>

          {exportAction ? (
            <div className="mt-6 flex flex-col items-start gap-3">
              <PrimaryButton
                onClick={handleExport}
                disabled={isExporting}
                className="rounded-full px-5 py-3"
              >
                <span className="inline-flex items-center gap-2">
                  <ExportFileIcon className="h-4 w-4 shrink-0" />
                  <span>{isExporting ? exportAction.exportingLabel : exportAction.buttonLabel}</span>
                </span>
              </PrimaryButton>

              {exportError ? <p className="text-sm text-rose-700">{exportError}</p> : null}
            </div>
          ) : null}
        </div>

        <section className="mt-8 rounded-[2rem] border border-purple-100/80 bg-white/90 p-7 shadow-[0_20px_60px_-34px_rgba(109,40,217,0.28)] backdrop-blur-xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-purple-500">
            {labels.noteLabel}
          </p>
          <p className="mt-4 whitespace-pre-wrap text-lg leading-9 text-stone-700">
            {delivery.recipientNote}
          </p>
        </section>

        <section className="mt-10">
          {timelineGroups.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-purple-200 bg-white/80 px-7 py-10 text-center text-stone-600 shadow-[0_18px_50px_-30px_rgba(24,24,27,0.12)]">
              {labels.noMemoriesAssigned}
            </div>
          ) : (
            <div className="relative">
              <div className="absolute bottom-12 left-[0.45rem] top-4 w-px bg-purple-200 sm:left-[0.55rem]" />

              <div className="space-y-12">
                {timelineGroups.map((group) => (
                  <article
                    key={group.key}
                    className="relative grid gap-4 pl-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8 sm:pl-0"
                  >
                    <div className="absolute left-0 top-1.5 z-10 h-4 w-4 rounded-full border-4 border-white bg-purple-500 shadow-[0_0_0_1px_rgba(168,85,247,0.35),0_10px_25px_rgba(126,34,206,0.22)] sm:left-0" />

                    <div className="sm:pl-8">
                      <time className="text-sm font-semibold uppercase tracking-[0.16em] text-purple-700">
                        {group.label}
                      </time>
                    </div>

                    <div className="rounded-[30px] corner-shape-squircle border border-white/75 bg-white/65 p-7 shadow-[0_18px_50px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:p-8">
                      <div
                        className="grid justify-items-center gap-x-10 gap-y-14"
                        style={{
                          gridTemplateColumns: `repeat(auto-fill, minmax(${ITEM_WIDTH}px, 1fr))`,
                        }}
                      >
                        {group.memories.map((memory) => {
                          const album = buildAlbumFromLegacyMemory(memory)

                          return (
                            <button
                              key={String(memory.id)}
                              type="button"
                              aria-label={memory.title || labels.untitledMemory}
                              className="group relative cursor-pointer border-0 bg-transparent p-0 text-left outline-none transition duration-200 hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-purple-200"
                              style={{
                                width: `${ITEM_WIDTH}px`,
                                height: `${ITEM_HEIGHT}px`,
                              }}
                              onClick={() => openAlbum(album)}
                            >
                              <AlbumTile
                                album={album}
                                groups={[]}
                                selectedGroupIds={[]}
                              />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {expandedAlbum ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8"
          onClick={closeAlbum}
        >
          <div
            className="relative h-[min(78svh,720px)] w-[min(86vw,560px)]"
            onClick={(event) => event.stopPropagation()}
          >
            <AlbumCarousel
              album={expandedAlbum}
              activeIndex={activePhotoIndex}
              setActiveIndex={setActivePhotoIndex}
              groups={[]}
              selectedGroupIds={[]}
              controlsVisible
            />
          </div>
        </div>
      ) : null}
    </main>
  )
}
