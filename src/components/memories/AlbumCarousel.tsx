'use client'

import React from 'react'
import type { GroupOption } from '@/components/ui/MemoryFilters'
import { ExpandIcon } from '@/components/icons/ExpandIcon'
import { PauseIcon } from '@/components/icons/PauseIcon'
import { PlayIcon } from '@/components/icons/PlayIcon'
import { VolumeIcon } from '@/components/icons/VolumeIcon'
import { VolumeMuteIcon } from '@/components/icons/VolumeMuteIcon'
import { MEMORY_CARD_RADIUS_CLASS } from './constants'
import { ExpandedNoteCard, NoteTileCard } from './NoteCards'
import type { Album, AlbumPreviewItem } from './types'
import { getAlbumPreviewItems, getNoteThemeForAlbum } from './utils'

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return '0:00'
  }

  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function getCarouselRelativePosition(index: number, activeIndex: number, total: number) {
  if (total <= 0) {
    return 999
  }

  const forward = (index - activeIndex + total) % total
  const backward = (activeIndex - index + total) % total

  if (forward === 0) {
    return 0
  }

  if (forward <= 2) {
    return forward
  }

  if (backward <= 1) {
    return -backward
  }

  return 999
}

function getCarouselSlideStyle(
  index: number,
  activeIndex: number,
  total: number,
  compactStack = false,
): React.CSSProperties {
  const relative = getCarouselRelativePosition(index, activeIndex, total)

  if (relative === 0) {
    return {
      transform: 'translate(0, 0) scale(1) rotate(0deg)',
      opacity: 1,
      zIndex: 40,
      pointerEvents: 'auto',
      filter: 'blur(0px)',
    }
  }

  if (relative === 1) {
    return {
      transform: compactStack
        ? 'translate(0, 18px) scale(0.968) rotate(1deg)'
        : 'translate(22px, 18px) scale(0.968) rotate(2deg)',
      opacity: 0.9,
      zIndex: 30,
      pointerEvents: 'auto',
      filter: 'blur(0.2px)',
    }
  }

  if (relative === 2) {
    return {
      transform: compactStack
        ? 'translate(0, 32px) scale(0.934) rotate(2deg)'
        : 'translate(44px, 32px) scale(0.934) rotate(4deg)',
      opacity: 0.64,
      zIndex: 20,
      pointerEvents: 'auto',
      filter: 'blur(0.8px)',
    }
  }

  if (relative === -1) {
    return {
      transform: 'translate(-36px, 10px) scale(0.92) rotate(-5deg)',
      opacity: 0.28,
      zIndex: 10,
      pointerEvents: 'none',
      filter: 'blur(1.2px)',
    }
  }

  return {
    transform: 'translate(72px, 48px) scale(0.9) rotate(6deg)',
    opacity: 0,
    zIndex: 0,
    pointerEvents: 'none',
    filter: 'blur(2px)',
  }
}

function getClosingSlideStyle(index: number): React.CSSProperties {
  const closingStack = [
    { x: 0, y: 0, rotation: 0, zIndex: 40, opacity: 1 },
    { x: 6, y: -2, rotation: 6, zIndex: 30, opacity: 0.95 },
    { x: 14, y: -6, rotation: 14, zIndex: 20, opacity: 0.9 },
  ]
  const item = closingStack[index]

  if (!item) {
    return {
      transform: 'translate(0, 0) scale(0.96) rotate(0deg)',
      opacity: 0,
      zIndex: 0,
      pointerEvents: 'none',
      filter: 'blur(2px)',
    }
  }

  return {
    transform: `translate(${item.x}px, ${item.y}px) scale(1) rotate(${item.rotation}deg)`,
    opacity: item.opacity,
    zIndex: item.zIndex,
    pointerEvents: 'none',
    filter: 'blur(0px)',
  }
}

function isInteractiveSwipeTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('button, input, video, a'))
}

function CarouselMediaSlide({
  slide,
  albumTitle,
  isActive,
}: {
  slide: Extract<AlbumPreviewItem, { kind: 'media' }>
  albumTitle: string
  isActive: boolean
}) {
  const videoUrl = slide.fullUrl || slide.url
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const shouldRenderVideo =
    isActive &&
    slide.mediaType === 'video' &&
    Boolean(videoUrl)

  React.useEffect(() => {
    if (!isActive && videoRef.current) {
      videoRef.current.pause()
    }
  }, [isActive])

  React.useEffect(() => {
    const onFullscreenChange = () => {
      const video = videoRef.current
      if (video && !document.fullscreenElement) {
        video.controls = false
      }
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  const togglePlayback = (event: React.MouseEvent) => {
    event.stopPropagation()
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      void video.play()
      return
    }

    video.pause()
  }

  const toggleMuted = (event: React.MouseEvent) => {
    event.stopPropagation()
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const seek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const nextTime = Number(event.target.value)
    video.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  const openFullscreen = (event: React.MouseEvent) => {
    event.stopPropagation()
    const video = videoRef.current
    if (!video) return

    video.controls = true
    void video.requestFullscreen?.()
  }

  return (
    <div className={`h-full w-full overflow-hidden bg-white ${MEMORY_CARD_RADIUS_CLASS}`}>
      {shouldRenderVideo ? (
        <div className="group relative h-full w-full bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            poster={slide.url}
            preload="metadata"
            playsInline
            className="memory-carousel-video block h-full w-full object-cover"
            onClick={togglePlayback}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedMetadata={(event) => {
              setDuration(event.currentTarget.duration || 0)
              setIsMuted(event.currentTarget.muted)
            }}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            onVolumeChange={(event) => setIsMuted(event.currentTarget.muted)}
          />

          <div className="pointer-events-none absolute inset-x-4 top-4 z-20 transition duration-200 group-hover:opacity-100 sm:inset-x-5">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/45 bg-white/22 px-3 py-2 text-white shadow-[0_18px_40px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md">
              <button
                type="button"
                onClick={togglePlayback}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/88 text-[#3f2f68] shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition hover:bg-white"
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
              >
                {isPlaying ? (
                  <PauseIcon className="h-4 w-4" />
                ) : (
                  <PlayIcon className="ml-0.5 h-4 w-4" />
                )}
              </button>

              <div className="hidden min-w-[72px] text-xs font-semibold tabular-nums text-white/92 sm:block">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              <input
                type="range"
                min={0}
                max={duration || 0}
                step="0.1"
                value={Math.min(currentTime, duration || currentTime)}
                onClick={(event) => event.stopPropagation()}
                onChange={seek}
                className="h-1 min-w-0 flex-1 accent-white"
                aria-label="Video progress"
              />

              <button
                type="button"
                onClick={toggleMuted}
                className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/18 text-white transition hover:bg-white/28 sm:flex"
                aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              >
                {isMuted ? (
                  <VolumeMuteIcon className="h-4 w-4" />
                ) : (
                  <VolumeIcon className="h-4 w-4" />
                )}
              </button>

              <button
                type="button"
                onClick={openFullscreen}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/18 text-white transition hover:bg-white/28"
                aria-label="Open fullscreen"
              >
                <ExpandIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : slide.url ? (
        <img
          src={slide.url}
          alt={albumTitle || 'Memory media'}
          loading="lazy"
          className="block h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full bg-neutral-100" />
      )}
    </div>
  )
}

export function AlbumCarousel({
  album,
  activeIndex,
  setActiveIndex,
  groups,
  selectedGroupIds,
  controlsVisible,
  isClosing = false,
}: {
  album: Album
  activeIndex: number
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>
  groups: GroupOption[]
  selectedGroupIds: Array<string | number>
  controlsVisible: boolean
  isClosing?: boolean
}) {
  const slides = getAlbumPreviewItems(album)
  const noteTheme = getNoteThemeForAlbum(album, groups, selectedGroupIds)
  const albumTitle = album.title || 'Untitled memory'
  const swipeStartRef = React.useRef<{ x: number; y: number; pointerId: number } | null>(null)
  const swipeHandledRef = React.useRef(false)
  const [usesCompactStack, setUsesCompactStack] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)')
    const updateCompactStack = () => setUsesCompactStack(mediaQuery.matches)

    updateCompactStack()
    mediaQuery.addEventListener('change', updateCompactStack)

    return () => {
      mediaQuery.removeEventListener('change', updateCompactStack)
    }
  }, [])

  if (slides.length === 0) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center border border-neutral-200 bg-white text-xs text-slate-500 ${MEMORY_CARD_RADIUS_CLASS}`}
      >
        Empty album
      </div>
    )
  }

  const safeIndex = Math.min(Math.max(activeIndex, 0), slides.length - 1)
  const hasMultipleSlides = slides.length > 1

  const goPrev = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const goNext = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setActiveIndex((prev) => (prev + 1) % slides.length)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !hasMultipleSlides ||
      event.pointerType === 'mouse' ||
      isInteractiveSwipeTarget(event.target)
    ) {
      return
    }

    swipeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    }
    swipeHandledRef.current = false
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current

    if (!start || start.pointerId !== event.pointerId || swipeHandledRef.current) {
      return
    }

    const deltaX = event.clientX - start.x
    const deltaY = event.clientY - start.y

    if (Math.abs(deltaY) > 32 && Math.abs(deltaY) > Math.abs(deltaX)) {
      swipeStartRef.current = null
      return
    }

    if (Math.abs(deltaX) < 54 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) {
      return
    }

    event.stopPropagation()
    event.preventDefault()
    swipeHandledRef.current = true
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Native scrolling can cancel the pointer before capture is available on mobile browsers.
    }

    setActiveIndex((prev) =>
      deltaX > 0 ? (prev + 1) % slides.length : (prev - 1 + slides.length) % slides.length,
    )
  }

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    } catch {
      // The browser may already have canceled the pointer during native scrolling.
    }

    if (swipeStartRef.current?.pointerId === event.pointerId) {
      swipeStartRef.current = null
    }
  }

  return (
    <div
      className={`relative h-full w-full touch-pan-y overflow-visible bg-transparent p-3 sm:p-5 ${MEMORY_CARD_RADIUS_CLASS}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div className="relative h-full w-full">
        <div className="absolute inset-0">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="absolute inset-0 transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={
                isClosing
                  ? getClosingSlideStyle(index)
                  : getCarouselSlideStyle(index, safeIndex, slides.length, usesCompactStack)
              }
              onClick={(event) => {
                event.stopPropagation()
                if (!isClosing && index !== safeIndex) {
                  setActiveIndex(index)
                }
              }}
            >
              {slide.kind === 'note' ? (
                controlsVisible ? (
                  <ExpandedNoteCard album={album} notes={[slide.note || '']} theme={noteTheme} />
                ) : (
                  <NoteTileCard album={album} note={slide.note || ''} theme={noteTheme} />
                )
              ) : (
                <div className="h-full w-full rounded-[32px] corner-shape-squircle bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
                  <CarouselMediaSlide
                    slide={slide}
                    albumTitle={albumTitle}
                    isActive={index === safeIndex}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {hasMultipleSlides ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-50 flex items-end justify-between gap-2 px-1 sm:bottom-4 sm:gap-3 sm:px-2">
            <div
              className={`flex gap-1.5 transition-all duration-180 ease-out sm:gap-2 ${
                controlsVisible
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-3 opacity-0'
              }`}
            >
              <button
                type="button"
                onClick={goPrev}
                className="inline-flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-white/40 bg-white/16 text-sm font-semibold text-[#3f2f68] shadow-[0_18px_40px_rgba(91,63,154,0.18),inset_0_1px_0_rgba(255,255,255,0.58)] backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/24 hover:text-[#2d1f52] sm:h-12 sm:w-auto sm:px-4"
              >
                <span className="text-lg leading-none">&lsaquo;</span>
                <span className="hidden sm:inline">Vorige</span>
              </button>

              <button
                type="button"
                onClick={goNext}
                className="inline-flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-[#8c74cb]/45 bg-[linear-gradient(135deg,rgba(130,94,186,0.92),rgba(164,121,227,0.92))] text-sm font-semibold text-white shadow-[0_18px_44px_rgba(104,74,175,0.34),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-md transition hover:-translate-y-0.5 hover:brightness-105 sm:h-12 sm:w-auto sm:px-4"
              >
                <span className="hidden sm:inline">Volgende</span>
                <span className="text-lg leading-none">&rsaquo;</span>
              </button>
            </div>

            <div
              className={`flex gap-1.5 rounded-full border border-white/40 bg-white/18 px-2.5 py-2 shadow-[0_18px_40px_rgba(91,63,154,0.16),inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-md transition-all duration-180 ease-out sm:gap-2 sm:px-3 ${
                controlsVisible
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-3 opacity-0'
              }`}
            >
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setActiveIndex(index)
                  }}
                  aria-label={`Ga naar item ${index + 1}`}
                  className={
                    index === safeIndex
                      ? 'h-2.5 w-8 rounded-full bg-[linear-gradient(135deg,#825eba,#a479e3)] shadow-[0_4px_14px_rgba(130,94,186,0.35)] transition-all'
                      : 'h-2.5 w-2.5 rounded-full bg-[#b8add8] transition-all hover:bg-[#8c74cb]'
                  }
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
