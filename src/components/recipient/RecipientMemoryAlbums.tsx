'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { AlbumCarousel } from '@/components/memories/AlbumCarousel'
import { AlbumTile } from '@/components/memories/AlbumTile'
import { ITEM_HEIGHT, ITEM_WIDTH } from '@/components/memories/constants'
import type { Album } from '@/components/memories/types'
import type { LegacyMemory } from '@/lib/legacyDeliveryContent'

function getCollapsedExpandedSize(originRect: DOMRect) {
  const carouselPadding = window.innerWidth < 640 ? 24 : 40

  return {
    width: originRect.width + carouselPadding,
    height: originRect.height + carouselPadding,
  }
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

export function RecipientMemoryAlbums({
  memories,
  labels,
}: {
  memories: LegacyMemory[]
  labels: {
    noMemories: string
  }
}) {
  const albums = memories.map(buildAlbumFromLegacyMemory)
  const [expandedAlbum, setExpandedAlbum] = useState<Album | null>(null)
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const [isExpandedUiVisible, setIsExpandedUiVisible] = useState(false)
  const [isExpandedClosing, setIsExpandedClosing] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const expandedCardRef = useRef<HTMLDivElement | null>(null)
  const originRectRef = useRef<DOMRect | null>(null)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!expandedAlbum) {
      return
    }

    const cardEl = expandedCardRef.current
    const originRect = originRectRef.current

    if (!cardEl || !originRect) {
      return
    }

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const maxExpandedWidth =
      viewportWidth < 640
        ? viewportWidth - 32
        : viewportWidth < 1024
          ? Math.min(viewportWidth * 0.68, 520)
          : Math.min(viewportWidth * 0.4, 560)
    const expandedTopClearance = viewportWidth >= 1024 ? 88 : viewportWidth < 640 ? 112 : 80
    const expandedBottomClearance = 24
    const maxExpandedHeight = viewportHeight - expandedTopClearance - expandedBottomClearance
    const minExpandedWidth = Math.min(240, Math.max(120, maxExpandedHeight / 1.2))
    const targetWidth = Math.max(
      minExpandedWidth,
      Math.min(maxExpandedWidth, maxExpandedHeight / 1.2),
    )
    const targetHeight = targetWidth * 1.2
    const minTargetCenterY = expandedTopClearance + targetHeight / 2
    const maxTargetCenterY = viewportHeight - expandedBottomClearance - targetHeight / 2
    const targetCenterY = Math.min(
      Math.max(viewportHeight / 2, minTargetCenterY),
      Math.max(minTargetCenterY, maxTargetCenterY),
    )
    const originCenterX = originRect.left + originRect.width / 2
    const originCenterY = originRect.top + originRect.height / 2
    const viewportCenterX = viewportWidth / 2
    const viewportCenterY = viewportHeight / 2
    const fromX = originCenterX - viewportCenterX
    const fromY = originCenterY - viewportCenterY
    const collapsedSize = getCollapsedExpandedSize(originRect)

    gsap.killTweensOf(cardEl)
    gsap.set(cardEl, {
      xPercent: -50,
      yPercent: -50,
      left: '50%',
      top: '50%',
    })

    gsap.fromTo(
      cardEl,
      {
        width: collapsedSize.width,
        height: collapsedSize.height,
        x: fromX,
        y: fromY,
        rotation: 0,
      },
      {
        width: targetWidth,
        height: targetHeight,
        x: 0,
        y: targetCenterY - viewportCenterY,
        rotation: 0,
        duration: 0.4,
        ease: 'power3.out',
        onComplete: () => setIsExpandedUiVisible(true),
      },
    )
  }, [expandedAlbum])

  function openAlbum(event: React.MouseEvent<HTMLButtonElement>, album: Album) {
    originRectRef.current = event.currentTarget.getBoundingClientRect()
    setExpandedAlbum(album)
    setActivePhotoIndex(0)
    setIsExpandedUiVisible(false)
    setIsExpandedClosing(false)
  }

  function closeAlbum() {
    if (!expandedAlbum) {
      return
    }

    setIsExpandedUiVisible(false)
    setIsExpandedClosing(true)

    const cardEl = expandedCardRef.current
    const originRect = originRectRef.current

    if (!cardEl || !originRect) {
      setExpandedAlbum(null)
      setActivePhotoIndex(0)
      setIsExpandedClosing(false)
      originRectRef.current = null
      return
    }

    const originCenterX = originRect.left + originRect.width / 2
    const originCenterY = originRect.top + originRect.height / 2
    const viewportCenterX = window.innerWidth / 2
    const viewportCenterY = window.innerHeight / 2
    const collapsedSize = getCollapsedExpandedSize(originRect)

    gsap.killTweensOf(cardEl)
    gsap.set(cardEl, {
      xPercent: -50,
      yPercent: -50,
      left: '50%',
      top: '50%',
    })

    gsap.to(cardEl, {
      width: collapsedSize.width,
      height: collapsedSize.height,
      x: originCenterX - viewportCenterX,
      y: originCenterY - viewportCenterY,
      rotation: 0,
      delay: 0.08,
      duration: 0.32,
      ease: 'power3.out',
      onComplete: () => {
        setExpandedAlbum(null)
        setActivePhotoIndex(0)
        setIsExpandedClosing(false)
        originRectRef.current = null
      },
    })
  }

  if (albums.length === 0) {
    return (
      <div className="rounded-[28px] corner-shape-squircle border border-dashed border-purple-200 bg-white/80 p-10 text-center text-stone-600">
        {labels.noMemories}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] justify-items-center gap-x-12 gap-y-20 pt-8 sm:pt-10">
        {albums.map((album) => (
          <button
            key={album.id}
            type="button"
            aria-label={album.title}
            onClick={(event) => openAlbum(event, album)}
            className="item group cursor-pointer border-0 bg-transparent p-0 text-left outline-none transition duration-200 hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-purple-200"
            style={{
              width: `${ITEM_WIDTH}px`,
              height: `${ITEM_HEIGHT}px`,
            }}
          >
            <AlbumTile album={album} groups={[]} selectedGroupIds={[]} />
          </button>
        ))}
      </div>

      {isMounted
        ? createPortal(
            <>
              <div
                className={`fixed inset-0 bg-black/55 transition-opacity duration-300 ${
                  expandedAlbum && !isExpandedClosing
                    ? 'pointer-events-none opacity-100'
                    : 'pointer-events-none opacity-0'
                }`}
                style={{ zIndex: 90 }}
              />

              {expandedAlbum ? (
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 100 }}
                  onClick={closeAlbum}
                >
                  <div
                    ref={expandedCardRef}
                    className="fixed cursor-pointer"
                    style={{
                      zIndex: 110,
                      top: '50%',
                      left: '50%',
                      maxHeight: 'calc(100svh - 40px)',
                      boxSizing: 'border-box',
                    }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <AlbumCarousel
                      album={expandedAlbum}
                      activeIndex={activePhotoIndex}
                      setActiveIndex={setActivePhotoIndex}
                      groups={[]}
                      selectedGroupIds={[]}
                      controlsVisible={isExpandedUiVisible}
                      isClosing={isExpandedClosing}
                    />
                  </div>
                </div>
              ) : null}
            </>,
            document.body,
          )
        : null}
    </>
  )
}
