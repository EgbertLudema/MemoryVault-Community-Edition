// app/(app)/memories/page.tsx
'use client'

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { useLocale, useTranslations } from 'next-intl'
import {
  MemoryFilters,
  type GridMode,
  type GroupOption,
  type MemoryFiltersValue,
} from '@/components/ui/MemoryFilters'
import { usePersistentState } from '@/app/_hooks/usePersistentState'
import { SecondaryButton } from '@/components/ui/SecondairyButton'
import { PlusIcon } from '@/components/icons/PlusIcon'
import { EditIcon } from '@/components/icons/EditIcon'
import { MemoriesHelpTour } from '@/components/onboarding/MemoriesHelpTour'
import { AlbumCarousel } from '@/components/memories/AlbumCarousel'
import { AlbumTile } from '@/components/memories/AlbumTile'
import {
  DRAG_EASE,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
  ITEM_GAP,
  ITEM_HEIGHT,
  ITEM_WIDTH,
  MOMENTUM_FACTOR,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_OPEN,
  UPDATE_DISTANCE,
  UPDATE_INTERVAL,
} from '@/components/memories/constants'
import { GridModeToggle } from '@/components/memories/GridModeToggle'
import { MemoryStatusNotice } from '@/components/memories/MemoryStatusNotice'
import type { Album, GridCell } from '@/components/memories/types'
import {
  albumMatchesGroups,
  albumMatchesSearch,
  albumMatchesType,
  getVisibleGroups,
  mergeGroupsWithDefaults,
  normalizeId,
} from '@/components/memories/utils'
import { Link } from '@/i18n/navigation'

type MemoriesChangedDetail = {
  action?: 'created' | 'updated' | 'deleted'
  id?: string
}

async function fetchUserAlbums(locale: string): Promise<{ albums: Album[]; groups: GroupOption[] }> {
  const response = await fetch('/api/memories', {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.href = `/${locale}/login`
    }

    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch albums (${response.status})`)
  }

  const data = (await response.json()) as { albums: any[]; groups?: GroupOption[] }

  const albums: Album[] = (Array.isArray(data.albums) ? data.albums : []).map((a) => {
    return {
      ...a,
      photos: Array.isArray(a?.photos) ? a.photos : [],
    } as Album
  })

  return {
    albums,
    groups: Array.isArray(data.groups) ? data.groups : [],
  }
}

export default function UserHomePage() {
  const t = useTranslations('MemoriesPage')
  const locale = useLocale()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [groups, setGroups] = useState<GroupOption[]>([])
  const [sidebarCollapsed] = usePersistentState<boolean>('ui.sidebar.collapsed', false)

  const [filters, setFilters] = useState<MemoryFiltersValue>({
    search: '',
    type: 'all',
    groupIds: [],
    gridMode: 'scroll',
  })

  const [visibleCells, setVisibleCells] = useState<GridCell[]>([])
  const [expandedAlbum, setExpandedAlbum] = useState<Album | null>(null)
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const [isExpandedUiVisible, setIsExpandedUiVisible] = useState(false)
  const [isCompactFilterOpen, setIsCompactFilterOpen] = useState(false)
  const [isCompactModeOpen, setIsCompactModeOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const expandedCardRef = useRef<HTMLDivElement | null>(null)
  const compactFilterRef = useRef<HTMLDivElement | null>(null)
  const compactModeRef = useRef<HTMLDivElement | null>(null)
  const dragControlsRef = useRef<HTMLDivElement | null>(null)
  const scrollViewRef = useRef<HTMLDivElement | null>(null)
  const scrollHeaderRef = useRef<HTMLDivElement | null>(null)
  const scrollFilterRef = useRef<HTMLDivElement | null>(null)
  const scrollGridSurfaceRef = useRef<HTMLDivElement | null>(null)
  const scrollTileRefs = useRef(new Map<string, HTMLDivElement>())
  const previousScrollRectsRef = useRef(new Map<string, DOMRect>())
  const pendingScrollAnimationRef = useRef(false)

  const targetXRef = useRef(0)
  const targetYRef = useRef(0)
  const currentXRef = useRef(0)
  const currentYRef = useRef(0)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const dragVXRef = useRef(0)
  const dragVYRef = useRef(0)
  const lastDragTimeRef = useRef(0)
  const mouseHasMovedRef = useRef(false)
  const canDragRef = useRef(true)
  const lastUpdateTimeRef = useRef(0)
  const lastLogicalXRef = useRef(0)
  const lastLogicalYRef = useRef(0)

  const originRectRef = useRef<DOMRect | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadAlbums = async (showLoader: boolean) => {
      try {
        if (showLoader) {
          setLoading(true)
        }

        const data = await fetchUserAlbums(locale)

        if (!isMounted) {
          return
        }

        const mergedGroups = mergeGroupsWithDefaults(data.groups)

        setAlbums(data.albums)
        setGroups(mergedGroups)
        setError(null)
      } catch (err) {
        console.error(err)
        if (isMounted) {
          setError(t('loadError'))
        }
      } finally {
        if (isMounted && showLoader) {
          setLoading(false)
        }
      }
    }

    loadAlbums(true)

    const onMemoriesChanged = async (event: Event) => {
      const detail = (event as CustomEvent<MemoriesChangedDetail>).detail ?? {}

      try {
        const data = await fetchUserAlbums(locale)

        if (!isMounted) {
          return
        }

        const mergedGroups = mergeGroupsWithDefaults(data.groups)

        if (detail.action === 'updated' && detail.id) {
          const updatedAlbum = data.albums.find((album) => String(album.id) === detail.id)
          if (updatedAlbum) {
            setAlbums((prev) =>
              prev.map((album) => (String(album.id) === detail.id ? updatedAlbum : album)),
            )
            setExpandedAlbum((prev) =>
              prev && String(prev.id) === detail.id ? updatedAlbum : prev,
            )
          } else {
            setAlbums(data.albums)
          }
        } else if (detail.action === 'created' && detail.id) {
          snapshotScrollGridLayout()
          const createdAlbum = data.albums.find((album) => String(album.id) === detail.id)

          if (createdAlbum) {
            setAlbums((prev) => {
              if (prev.some((album) => String(album.id) === detail.id)) {
                return data.albums
              }

              const previousIds = new Set(prev.map((album) => String(album.id)))
              const createdIndex = data.albums.findIndex((album) => String(album.id) === detail.id)
              const nextExistingIndex = data.albums.findIndex(
                (album, index) => index > createdIndex && previousIds.has(String(album.id)),
              )
              const next = [...prev]

              const safeIndex =
                nextExistingIndex >= 0
                  ? Math.max(
                      0,
                      next.findIndex(
                        (album) =>
                          String(album.id) === String(data.albums[nextExistingIndex]?.id),
                      ),
                    )
                  : next.length

              next.splice(safeIndex, 0, createdAlbum)
              return next
            })
          } else {
            setAlbums(data.albums)
          }
        } else if (detail.action === 'deleted' && detail.id) {
          snapshotScrollGridLayout()
          setExpandedAlbum(null)
          setExpandedItemId(null)
          originRectRef.current = null
          setAlbums((prev) => prev.filter((album) => String(album.id) !== detail.id))
        } else {
          setAlbums(data.albums)
        }

        setGroups(mergedGroups)
        setError(null)
      } catch (err) {
        console.error(err)
        if (isMounted) {
          setError(t('loadError'))
        }
      }
    }

    window.addEventListener('memories:changed', onMemoriesChanged as EventListener)

    return () => {
      isMounted = false
      window.removeEventListener('memories:changed', onMemoriesChanged as EventListener)
    }
  }, [locale, t])

  useEffect(() => {
    if (!expandedAlbum) {
      setIsExpandedUiVisible(false)
      return
    }

    const frame = window.requestAnimationFrame(() => {
      setIsExpandedUiVisible(true)
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [expandedAlbum])

  const filteredAlbums = useMemo(() => {
    return albums
      .filter((a) => albumMatchesSearch(a, filters.search))
      .filter((a) => albumMatchesGroups(a, filters.groupIds))
      .filter((a) => albumMatchesType(a, filters.type))
  }, [albums, filters.groupIds, filters.search, filters.type])

  const visibleGroups = useMemo(() => {
    return getVisibleGroups(albums, groups)
  }, [albums, groups])

  const snapshotScrollGridLayout = () => {
    if (filters.gridMode !== 'scroll') {
      return
    }

    const nextRects = new Map<string, DOMRect>()
    for (const [id, element] of scrollTileRefs.current.entries()) {
      nextRects.set(id, element.getBoundingClientRect())
    }

    previousScrollRectsRef.current = nextRects
    pendingScrollAnimationRef.current = nextRects.size > 0
  }

  const handleFiltersChange = (next: MemoryFiltersValue) => {
    const filtersChanged =
      next.search !== filters.search ||
      next.type !== filters.type ||
      next.gridMode !== filters.gridMode ||
      next.groupIds.length !== filters.groupIds.length ||
      next.groupIds.some(
        (id, index) => normalizeId(id) !== normalizeId(filters.groupIds[index] ?? ''),
      )

    if (filtersChanged) {
      snapshotScrollGridLayout()
    }

    setFilters(next)
  }

  useEffect(() => {
    setExpandedAlbum(null)
    setExpandedItemId(null)
    originRectRef.current = null
    setActivePhotoIndex(0)

    if (filters.gridMode !== 'drag') {
      setVisibleCells([])
    } else {
      targetXRef.current = 0
      targetYRef.current = 0
      currentXRef.current = 0
      currentYRef.current = 0
      lastLogicalXRef.current = 0
      lastLogicalYRef.current = 0
      lastUpdateTimeRef.current = 0

      if (canvasRef.current) {
        canvasRef.current.style.transform = 'translate(0px, 0px)'
      }
    }
  }, [filters.gridMode])

  const updateVisibleCells = () => {
    if (filters.gridMode !== 'drag') {
      return
    }

    if (!canvasRef.current || filteredAlbums.length === 0) {
      if (filteredAlbums.length === 0) {
        setVisibleCells([])
      }
      return
    }

    const currentX = currentXRef.current
    const currentY = currentYRef.current

    const buffer = 300
    const containerEl = containerRef.current
    const bounds = containerEl ? containerEl.getBoundingClientRect() : null
    const viewWidth = bounds ? bounds.width : window.innerWidth
    const viewHeight = bounds ? bounds.height : window.innerHeight

    const minWorldX = -currentX - buffer - ITEM_WIDTH
    const maxWorldX = -currentX + viewWidth + buffer
    const minWorldY = -currentY - buffer - ITEM_HEIGHT
    const maxWorldY = -currentY + viewHeight + buffer

    const spanX = ITEM_WIDTH + ITEM_GAP
    const spanY = ITEM_HEIGHT + ITEM_GAP

    const startCol = Math.floor(minWorldX / spanX)
    const endCol = Math.ceil(maxWorldX / spanX)
    const startRow = Math.floor(minWorldY / spanY)
    const endRow = Math.ceil(maxWorldY / spanY)

    const nextCells: GridCell[] = []

    for (let row = startRow; row < endRow; row += 1) {
      for (let col = startCol; col < endCol; col += 1) {
        const indexBase = Math.abs(row * 1000 + col)
        const albumIndex = indexBase % filteredAlbums.length
        const id = `${col},${row}`
        nextCells.push({
          id,
          col,
          row,
          albumIndex,
        })
      }
    }

    setVisibleCells(nextCells)
  }

  useEffect(() => {
    if (filters.gridMode !== 'drag') {
      return
    }
    updateVisibleCells()
  }, [filteredAlbums.length, filters.gridMode])

  useEffect(() => {
    if (filters.gridMode !== 'drag') {
      return
    }

    if (!canvasRef.current || !containerRef.current) {
      return
    }

    targetXRef.current = 0
    targetYRef.current = 0
    currentXRef.current = 0
    currentYRef.current = 0
    lastLogicalXRef.current = 0
    lastLogicalYRef.current = 0
    lastUpdateTimeRef.current = 0

    if (filteredAlbums.length > 0) {
      updateVisibleCells()
    }

    const containerEl = containerRef.current

    const handleMouseDown = (event: MouseEvent) => {
      if (!canDragRef.current) {
        return
      }
      isDraggingRef.current = true
      mouseHasMovedRef.current = false
      startXRef.current = event.clientX
      startYRef.current = event.clientY
      containerEl.style.cursor = 'grabbing'
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current || !canDragRef.current) {
        return
      }
      const dx = event.clientX - startXRef.current
      const dy = event.clientY - startYRef.current

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        mouseHasMovedRef.current = true
      }

      const now = Date.now()
      const dt = Math.max(10, now - lastDragTimeRef.current)
      lastDragTimeRef.current = now

      dragVXRef.current = dx / dt
      dragVYRef.current = dy / dt

      targetXRef.current += dx
      targetYRef.current += dy

      startXRef.current = event.clientX
      startYRef.current = event.clientY
    }

    const handleMouseUp = () => {
      if (!isDraggingRef.current) {
        return
      }
      isDraggingRef.current = false

      if (canDragRef.current) {
        containerEl.style.cursor = 'grab'

        const vx = dragVXRef.current
        const vy = dragVYRef.current

        if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
          targetXRef.current += vx * MOMENTUM_FACTOR
          targetYRef.current += vy * MOMENTUM_FACTOR
        }
      }
    }

    const handleTouchStart = (event: TouchEvent) => {
      if (!canDragRef.current) {
        return
      }
      if (event.touches.length !== 1) {
        return
      }
      isDraggingRef.current = true
      mouseHasMovedRef.current = false
      const touch = event.touches[0]
      startXRef.current = touch.clientX
      startYRef.current = touch.clientY
      containerEl.style.cursor = 'grabbing'
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (!isDraggingRef.current || !canDragRef.current) {
        return
      }
      if (event.touches.length !== 1) {
        return
      }
      const touch = event.touches[0]
      const dx = touch.clientX - startXRef.current
      const dy = touch.clientY - startYRef.current

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        mouseHasMovedRef.current = true
      }

      targetXRef.current += dx
      targetYRef.current += dy

      startXRef.current = touch.clientX
      startYRef.current = touch.clientY
    }

    const handleTouchEnd = () => {
      isDraggingRef.current = false
      containerEl.style.cursor = 'grab'
    }

    const handleResize = () => {
      updateVisibleCells()
    }

    containerEl.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    containerEl.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('resize', handleResize)

    let animationFrame: number

    const animate = () => {
      const targetX = targetXRef.current
      const targetY = targetYRef.current

      const currentX = currentXRef.current + (targetX - currentXRef.current) * DRAG_EASE
      const currentY = currentYRef.current + (targetY - currentYRef.current) * DRAG_EASE

      currentXRef.current = currentX
      currentYRef.current = currentY

      if (canvasRef.current) {
        canvasRef.current.style.transform = `translate(${currentX}px, ${currentY}px)`
      }

      const now = Date.now()
      const dx = currentX - lastLogicalXRef.current
      const dy = currentY - lastLogicalYRef.current
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > UPDATE_DISTANCE || now - lastUpdateTimeRef.current > UPDATE_INTERVAL) {
        updateVisibleCells()
        lastLogicalXRef.current = currentX
        lastLogicalYRef.current = currentY
        lastUpdateTimeRef.current = now
      }

      animationFrame = window.requestAnimationFrame(animate)
    }

    animationFrame = window.requestAnimationFrame(animate)

    containerEl.style.cursor = 'grab'

    return () => {
      window.cancelAnimationFrame(animationFrame)

      containerEl.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)

      containerEl.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('resize', handleResize)
    }
  }, [filteredAlbums, filters.gridMode])

  useEffect(() => {
    canDragRef.current = !Boolean(expandedAlbum)
    const containerEl = containerRef.current
    if (containerEl) {
      containerEl.style.cursor = expandedAlbum
        ? 'auto'
        : filters.gridMode === 'drag'
          ? 'grab'
          : 'auto'
    }

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
    const targetWidth = Math.min(viewportWidth * 0.4, 560)
    const targetHeight = targetWidth * 1.2

    const originCenterX = originRect.left + originRect.width / 2
    const originCenterY = originRect.top + originRect.height / 2

    const viewportCenterX = viewportWidth / 2
    const viewportCenterY = viewportHeight / 2

    const fromX = originCenterX - viewportCenterX
    const fromY = originCenterY - viewportCenterY

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
        width: originRect.width,
        height: originRect.height,
        x: fromX,
        y: fromY,
      },
      {
        width: targetWidth,
        height: targetHeight,
        x: 0,
        y: 0,
        duration: 0.4,
        ease: 'power3.out',
      },
    )
  }, [expandedAlbum, filters.gridMode])

  const openExpandedFromRect = (rect: DOMRect, album: Album, itemId: string) => {
    originRectRef.current = rect
    setExpandedItemId(itemId)
    setExpandedAlbum(album)
    setActivePhotoIndex(0)
  }

  const handleInfiniteItemClick = (event: React.MouseEvent<HTMLDivElement>, cell: GridCell) => {
    if (mouseHasMovedRef.current) {
      return
    }
    const album = filteredAlbums[cell.albumIndex]
    if (!album) {
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    openExpandedFromRect(rect, album, cell.id)
  }

  const handleScrollTileClick = (event: React.MouseEvent<HTMLDivElement>, album: Album) => {
    const rect = event.currentTarget.getBoundingClientRect()
    openExpandedFromRect(rect, album, album.id)
  }

  const closeExpanded = () => {
    if (!expandedAlbum) {
      return
    }

    setIsExpandedUiVisible(false)

    const cardEl = expandedCardRef.current
    const originRect = originRectRef.current

    if (!cardEl || !originRect) {
      setExpandedAlbum(null)
      setExpandedItemId(null)
      originRectRef.current = null
      setActivePhotoIndex(0)
      return
    }

    const originCenterX = originRect.left + originRect.width / 2
    const originCenterY = originRect.top + originRect.height / 2

    const viewportCenterX = window.innerWidth / 2
    const viewportCenterY = window.innerHeight / 2

    const toX = originCenterX - viewportCenterX
    const toY = originCenterY - viewportCenterY

    gsap.killTweensOf(cardEl)
    gsap.set(cardEl, {
      xPercent: -50,
      yPercent: -50,
      left: '50%',
      top: '50%',
    })

    gsap.to(cardEl, {
      width: originRect.width,
      height: originRect.height,
      x: toX,
      y: toY,
      delay: 0.08,
      duration: 0.32,
      ease: 'power3.out',
      onComplete: () => {
        setExpandedAlbum(null)
        setExpandedItemId(null)
        originRectRef.current = null
        setActivePhotoIndex(0)
      },
    })
  }

  useEffect(() => {
    if (filters.groupIds.length === 0) {
      return
    }

    const visibleGroupIds = new Set(visibleGroups.map((group) => normalizeId(group.id)))
    const hasActiveVisibleGroup = filters.groupIds.some((id) =>
      visibleGroupIds.has(normalizeId(id)),
    )

    if (!hasActiveVisibleGroup) {
      setFilters((prev) => ({
        ...prev,
        groupIds: [],
      }))
    }
  }, [filters.groupIds, visibleGroups])

  useLayoutEffect(() => {
    if (filters.gridMode !== 'scroll' || !pendingScrollAnimationRef.current) {
      return
    }

    const activeAnimations: HTMLDivElement[] = []

    scrollTileRefs.current.forEach((element, id) => {
      const previousRect = previousScrollRectsRef.current.get(id)
      const currentRect = element.getBoundingClientRect()

      activeAnimations.push(element)
      gsap.killTweensOf(element)

      if (previousRect) {
        const deltaX = previousRect.left - currentRect.left
        const deltaY = previousRect.top - currentRect.top

        gsap.fromTo(
          element,
          {
            x: deltaX,
            y: deltaY,
            scale: 0.985,
            opacity: 0.88,
          },
          {
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1,
            duration: 0.55,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
          },
        )

        return
      }

      gsap.fromTo(
        element,
        {
          y: 22,
          scale: 0.92,
          opacity: 0,
          filter: 'blur(10px)',
        },
        {
          y: 0,
          scale: 1,
          opacity: 1,
          filter: 'blur(0px)',
          duration: 0.45,
          ease: 'power3.out',
          clearProps: 'transform,opacity,filter',
        },
      )
    })

    previousScrollRectsRef.current.clear()
    pendingScrollAnimationRef.current = false

    return () => {
      if (activeAnimations.length > 0) {
        gsap.killTweensOf(activeAnimations)
      }
    }
  }, [filteredAlbums, filters.gridMode])

  useLayoutEffect(() => {
    if (filters.gridMode === 'scroll') {
      const header = scrollHeaderRef.current
      const filter = scrollFilterRef.current
      const surface = scrollGridSurfaceRef.current
      const tiles = Array.from(scrollTileRefs.current.values())

      gsap.killTweensOf([header, filter, surface, ...tiles])

      if (header) {
        gsap.fromTo(
          header,
          {
            autoAlpha: 0,
            y: 18,
            filter: 'blur(10px)',
          },
          {
            autoAlpha: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.38,
            ease: 'power2.out',
            clearProps: 'opacity,transform,filter,visibility',
          },
        )
      }

      if (filter) {
        gsap.fromTo(
          filter,
          {
            autoAlpha: 0,
            y: 18,
            filter: 'blur(10px)',
          },
          {
            autoAlpha: 1,
            y: 0,
            filter: 'blur(0px)',
            delay: 0.06,
            duration: 0.36,
            ease: 'power2.out',
            clearProps: 'opacity,transform,filter,visibility',
          },
        )
      }

      if (surface) {
        gsap.fromTo(
          surface,
          {
            autoAlpha: 0,
            y: 20,
            scale: 0.985,
            filter: 'blur(10px)',
          },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            delay: 0.1,
            duration: 0.4,
            ease: 'power2.out',
            clearProps: 'opacity,transform,filter,visibility',
          },
        )
      }

      if (tiles.length > 0 && !pendingScrollAnimationRef.current) {
        gsap.fromTo(
          tiles,
          {
            autoAlpha: 0,
            y: 22,
            scale: 0.96,
          },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.42,
            ease: 'power2.out',
            stagger: 0.025,
            clearProps: 'opacity,transform,visibility',
          },
        )
      }

      return
    }

    const dragControls = dragControlsRef.current
    const canvas = canvasRef.current
    const visibleItems = canvas ? Array.from(canvas.querySelectorAll('.item')) : []

    gsap.killTweensOf([dragControls, canvas, ...visibleItems])

    if (dragControls) {
      gsap.fromTo(
        dragControls,
        {
          autoAlpha: 0,
          y: -18,
          filter: 'blur(10px)',
        },
        {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.34,
          ease: 'power2.out',
          clearProps: 'opacity,transform,filter,visibility',
        },
      )
    }

    if (canvas) {
      gsap.fromTo(
        canvas,
        {
          autoAlpha: 0,
          scale: 0.985,
          filter: 'blur(8px)',
        },
        {
          autoAlpha: 1,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.4,
          ease: 'power2.out',
          clearProps: 'opacity,transform,filter,visibility',
        },
      )
    }

    if (visibleItems.length > 0) {
      gsap.fromTo(
        visibleItems,
        {
          autoAlpha: 0,
          y: 14,
          scale: 0.97,
        },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.34,
          ease: 'power2.out',
          stagger: 0.018,
          clearProps: 'opacity,transform,visibility',
        },
      )
    }
  }, [filters.gridMode])

  const isDragMode = filters.gridMode === 'drag'
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_OPEN
  const dragGridOffsetX = sidebarWidth + GRID_OFFSET_X
  const activeFilterCount = filters.groupIds.length + (filters.type === 'all' ? 0 : 1)
  const handleGridModeChange = (gridMode: GridMode) => {
    setFilters((prev) => ({
      ...prev,
      gridMode,
    }))
  }

  useEffect(() => {
    if (isDragMode) {
      return
    }
    setIsCompactFilterOpen(false)
    setIsCompactModeOpen(false)
  }, [isDragMode])

  useEffect(() => {
    if (!isDragMode) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) {
        return
      }

      const clickedInsideFilter = compactFilterRef.current?.contains(target) ?? false
      const clickedInsideMode = compactModeRef.current?.contains(target) ?? false

      if (!clickedInsideFilter) {
        setIsCompactFilterOpen(false)
      }

      if (!clickedInsideMode) {
        setIsCompactModeOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isDragMode])

  return (
    <>
      <MemoriesHelpTour gridMode={filters.gridMode} />
      {isDragMode ? (
        <>
          <div
            ref={dragControlsRef}
            className="pointer-events-none absolute right-4 top-4 z-20 flex items-start gap-3 sm:right-6 sm:top-6"
          >
            <div
              ref={compactModeRef}
              className="pointer-events-auto"
              data-tour="memories-view-toggle"
            >
              <GridModeToggle gridMode={filters.gridMode} onChange={handleGridModeChange} />
            </div>
            <div ref={compactFilterRef} data-tour="memories-drag-filters">
              <MemoryFilters
                value={filters}
                onChange={handleFiltersChange}
                groups={visibleGroups}
                compact
                compactOpen={isCompactFilterOpen}
                onCompactOpenChange={(next) => {
                  setIsCompactFilterOpen(next)
                  if (next) {
                    setIsCompactModeOpen(false)
                  }
                }}
              />
            </div>
            <div className="pointer-events-auto" data-tour="memories-add-memory">
              <Link
                href="/memories/new"
                aria-label={t('addMemory')}
                className="relative inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-purple-600 px-4 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(124,58,237,0.28),inset_0_1px_0_rgba(255,255,255,0.22)] transition hover:scale-[1.01] hover:bg-purple-700"
              >
                <PlusIcon className="h-4 w-4 shrink-0" />
                <span>{t('addMemory')}</span>
              </Link>
            </div>
          </div>

          <div className="relative h-svh w-full">
            {filters.gridMode === 'drag' && (
              <div
                ref={containerRef}
                className="fixed inset-y-0 right-0 z-0 select-none"
                style={{ left: `${sidebarWidth}px` }}
              >
                {loading && (
                  <MemoryStatusNotice
                    tone="default"
                    message={t('loadingAlbums')}
                    position="fixed"
                    left={dragGridOffsetX}
                    top={GRID_OFFSET_Y}
                  />
                )}

                {error && !loading && (
                  <MemoryStatusNotice
                    tone="error"
                    message={error}
                    position="fixed"
                    left={dragGridOffsetX}
                    top={GRID_OFFSET_Y}
                  />
                )}

                {!loading && !error && filteredAlbums.length === 0 && (
                  <MemoryStatusNotice
                    tone="default"
                    message={t('noMatch')}
                    position="fixed"
                    left={dragGridOffsetX}
                    top={GRID_OFFSET_Y}
                  />
                )}

                <div
                  ref={canvasRef}
                  className="canvas absolute will-change-transform"
                  style={{
                    left: `${GRID_OFFSET_X}px`,
                    top: `${GRID_OFFSET_Y}px`,
                  }}
                >
                  {visibleCells.map((cell) => {
                    const album = filteredAlbums[cell.albumIndex]
                    if (!album) {
                      return null
                    }

                    const isHidden = expandedAlbum && cell.id === expandedItemId

                    return (
                      <InfiniteGridCell
                        key={cell.id}
                        cell={cell}
                        album={album}
                        groups={visibleGroups}
                        selectedGroupIds={filters.groupIds}
                        hidden={Boolean(isHidden)}
                        onClick={handleInfiniteItemClick}
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {filters.gridMode === 'scroll' && (
              <div
                ref={containerRef}
                data-view-mode="scroll"
                className="relative h-full overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(216,180,254,0.2),transparent_28%),radial-gradient(circle_at_top_right,rgba(251,207,232,0.2),transparent_24%),linear-gradient(180deg,#fafafa_0%,#f8fafc_100%)]"
              >
                <div
                  ref={scrollViewRef}
                  className="mx-auto flex w-full max-w-[1700px] flex-col gap-6 px-6 pb-8 pt-6"
                >
                  <div
                    ref={scrollHeaderRef}
                    className="rounded-[30px] corner-shape-squircle border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,245,255,0.9))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-7"
                  >
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-[760px]">
                          <div className="inline-flex rounded-full bg-purple-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-purple-700">
                            {t('gridView')}
                          </div>
                          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
                            {t('structuredHeading')}
                          </h2>
                        </div>

                        <div className="flex items-center justify-end gap-3 lg:shrink-0">
                          <div data-tour="memories-view-toggle">
                            <GridModeToggle
                              gridMode={filters.gridMode}
                              onChange={handleGridModeChange}
                              size="regular"
                            />
                          </div>
                          <div data-tour="memories-add-memory">
                            <Link
                              href="/memories/new"
                              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-purple-600 px-5 py-3 text-sm font-semibold text-white no-underline shadow-[0_16px_35px_rgba(124,58,237,0.24)] transition hover:scale-[1.01] hover:bg-purple-700"
                            >
                              <PlusIcon className="h-4 w-4 shrink-0" />
                              {t('addMemory')}
                            </Link>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-stone-600">
                        <div className="rounded-full border border-white/80 bg-white/80 px-4 py-2 shadow-sm">
                          {t('shownCount', { count: filteredAlbums.length })}
                        </div>
                        <div className="rounded-full border border-white/80 bg-white/80 px-4 py-2 shadow-sm">
                          {t('activeFilterCount', { count: activeFilterCount })}
                        </div>
                      </div>
                    </div>

                    <div ref={scrollFilterRef} className="mt-6" data-tour="memories-scroll-filters">
                      <MemoryFilters
                        value={filters}
                        onChange={handleFiltersChange}
                        groups={visibleGroups}
                        compact={false}
                        hideHeader
                        dense
                      />
                    </div>
                  </div>

                  {loading ? (
                    <div className="rounded-[28px] corner-shape-squircle border border-white/75 bg-white/80 px-5 py-4 text-sm text-stone-600 shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur-sm">
                      {t('loadingAlbums')}
                    </div>
                  ) : null}

                  {error && !loading ? (
                    <div className="rounded-[28px] corner-shape-squircle border border-rose-200 bg-rose-50/90 px-5 py-4 text-sm font-medium text-rose-700 shadow-[0_16px_40px_rgba(244,63,94,0.08)]">
                      {error}
                    </div>
                  ) : null}

                  {!loading && !error && filteredAlbums.length === 0 ? (
                    <div className="rounded-[30px] corner-shape-squircle border border-dashed border-purple-200 bg-[linear-gradient(135deg,rgba(250,245,255,0.95),rgba(255,255,255,0.98))] p-10 text-center shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
                      <div className="mx-auto max-w-md">
                        <div className="text-lg font-semibold text-gray-900">
                          {t('emptyTitle')}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-stone-600">
                          {t('emptyBody')}
                        </p>
                        <div className="mt-5 flex justify-center">
                          <Link
                            href="/memories/new"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-purple-600 px-5 py-3 text-sm font-semibold text-white no-underline transition hover:bg-purple-700"
                          >
                            <PlusIcon className="h-4 w-4 shrink-0" />
                            {t('addMemory')}
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {!loading && !error && filteredAlbums.length > 0 ? (
                    <div
                      ref={scrollGridSurfaceRef}
                      className="rounded-[30px] corner-shape-squircle border border-white/75 bg-white/60 p-12 shadow-[0_18px_50px_rgba(15,23,42,0.05)] backdrop-blur-sm"
                    >
                      <div
                        className="grid justify-items-center gap-x-10 gap-y-16"
                        style={{
                          gridTemplateColumns: `repeat(auto-fill, minmax(${ITEM_WIDTH}px, 1fr))`,
                        }}
                      >
                        {filteredAlbums.map((album) => {
                          const isHidden = expandedAlbum && expandedItemId === album.id
                          return (
                            <div
                              key={album.id}
                              ref={(element) => {
                                if (element) {
                                  scrollTileRefs.current.set(String(album.id), element)
                                  return
                                }

                                scrollTileRefs.current.delete(String(album.id))
                              }}
                              className="item cursor-pointer justify-self-center will-change-transform"
                              style={{
                                width: `${ITEM_WIDTH}px`,
                                height: `${ITEM_HEIGHT}px`,
                                visibility: isHidden ? 'hidden' : 'visible',
                              }}
                              onClick={(event) => handleScrollTileClick(event, album)}
                            >
                              <AlbumTile
                                album={album}
                                groups={visibleGroups}
                                selectedGroupIds={filters.groupIds}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={expandedAlbum ? 'overlay overlay-active' : 'overlay'} />

      {expandedAlbum && (
        <div
          className="expanded-click-layer fixed inset-0"
          style={{ zIndex: 30 }}
          onClick={closeExpanded}
        >
          <div
            className={`absolute right-6 top-6 transition-all duration-150 ease-out ${
              isExpandedUiVisible
                ? 'pointer-events-auto translate-y-0 opacity-100'
                : 'pointer-events-none -translate-y-2 opacity-0'
            }`}
            style={{ zIndex: 50 }}
            onClick={(event) => event.stopPropagation()}
          >
            <SecondaryButton href={`/memories/${expandedAlbum.id}`} className="gap-2">
              <EditIcon className="h-4 w-4" />
              {t('editMemory')}
            </SecondaryButton>
          </div>

          <div
            ref={expandedCardRef}
            className="expanded-item"
            style={{ zIndex: 40 }}
            onClick={(event) => event.stopPropagation()}
          >
            <AlbumCarousel
              album={expandedAlbum}
              activeIndex={activePhotoIndex}
              setActiveIndex={setActivePhotoIndex}
              groups={visibleGroups}
              selectedGroupIds={filters.groupIds}
              controlsVisible={isExpandedUiVisible}
            />
          </div>
        </div>
      )}
    </>
  )
}

function InfiniteGridCell(props: {
  cell: GridCell
  album: Album
  groups: GroupOption[]
  selectedGroupIds: Array<string | number>
  hidden?: boolean
  onClick: (event: React.MouseEvent<HTMLDivElement>, cell: GridCell) => void
}) {
  const { cell, album, groups, selectedGroupIds, hidden = false, onClick } = props
  const cellRef = useRef<HTMLDivElement | null>(null)
  const previousAlbumIdRef = useRef<string | null>(null)

  useEffect(() => {
    const element = cellRef.current
    const albumId = String(album.id)

    if (!element) {
      previousAlbumIdRef.current = albumId
      return
    }

    const previousAlbumId = previousAlbumIdRef.current
    previousAlbumIdRef.current = albumId

    if (previousAlbumId === null || previousAlbumId === albumId) {
      return
    }

    gsap.killTweensOf(element)
    gsap.fromTo(
      element,
      {
        opacity: 0,
        scale: 0.94,
        y: 18,
        rotate: -1.4,
        filter: 'blur(10px)',
      },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        rotate: 0,
        filter: 'blur(0px)',
        duration: 0.48,
        ease: 'power3.out',
        clearProps: 'transform,opacity,filter',
      },
    )
  }, [album.id])

  const worldX = cell.col * (ITEM_WIDTH + ITEM_GAP)
  const worldY = cell.row * (ITEM_HEIGHT + ITEM_GAP)

  return (
    <div
      ref={cellRef}
      className="item absolute cursor-pointer will-change-transform"
      style={{
        width: `${ITEM_WIDTH}px`,
        height: `${ITEM_HEIGHT}px`,
        left: `${worldX}px`,
        top: `${worldY}px`,
        visibility: hidden ? 'hidden' : 'visible',
      }}
      onClick={(event) => onClick(event, cell)}
    >
      <AlbumTile album={album} groups={groups} selectedGroupIds={selectedGroupIds} />
    </div>
  )
}
