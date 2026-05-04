'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useRouter } from 'next/navigation'
import {
  createOrthoCamera,
  createRenderer,
  getViewBounds,
  onResizeOrtho,
} from './utils/three-helpers'
import {
  ENTER_YEAR_ZOOM,
  EXIT_TO_YEARS_ZOOM,
  LOD_TEXTURE_MIN_ZOOM,
  LOAD_MARGIN_SCREENS,
  PAGE_LIMIT,
} from './constants'
import type { Mode } from './types'
import { fetchYearPage, fetchYears } from './api'
import { YearsView } from './YearsView'
import { YearDetailView } from './YearDetailView'

export default function HugeAlbumGrid() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  const [mode, setMode] = useState<Mode>('years')
  const [activeYear, setActiveYear] = useState<number | null>(null)
  const modeRef = useRef<Mode>('years')
  const activeYearRef = useRef<number | null>(null)

  useEffect(() => {
    if (!mountRef.current) return

    // Core Three.js
    const renderer = createRenderer(mountRef.current)
    const scene = new THREE.Scene()
    const camera = createOrthoCamera()

    // Views
    const yearsView = new YearsView(scene, camera)
    const yearDetailView = new YearDetailView(scene, camera)

    // State for year-detail paging
    let transitioning = false
    const pagesLoaded = new Set<number>()
    let totalPages = Infinity
    let loading = false

    // Raycast / input helpers
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    function clientToNDC(e: { clientX: number; clientY: number }) {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      return mouse
    }

    // Boot years
    async function bootYears() {
      const data = await fetchYears()
      if (!data) return
      yearsView.layout(data.years)
      camera.zoom = 0.85
      camera.position.set(0, 0, 100)
      camera.updateProjectionMatrix()
    }

    async function enterYear(year: number) {
      if (transitioning) return
      transitioning = true
      yearsView.clear()

      yearDetailView.ensure(year)
      if (!pagesLoaded.has(1)) {
        loading = true
        const page1 = await fetchYearPage(year, 1, PAGE_LIMIT)
        loading = false
        if (page1) {
          totalPages = page1.totalPages
          pagesLoaded.add(1)
          yearDetailView.addAlbums(page1.items, year)
          yearDetailView.layout(year)
          yearDetailView.updateTextures()
        }
      }
      modeRef.current = 'year-detail'
      activeYearRef.current = year
      setMode('year-detail')
      setActiveYear(year)
      transitioning = false
    }

    async function exitYearToYears() {
      if (transitioning) return
      transitioning = true
      yearDetailView.reset()
      pagesLoaded.clear()
      totalPages = Infinity
      await bootYears()
      modeRef.current = 'years'
      activeYearRef.current = null
      setMode('years')
      setActiveYear(null)
      transitioning = false
    }

    async function maybeLoadMoreYear() {
      const year = activeYearRef.current
      if (modeRef.current !== 'year-detail' || !year) return
      if (loading) return
      if (pagesLoaded.size >= totalPages) return
      const nextPage = pagesLoaded.size + 1
      if (pagesLoaded.has(nextPage)) return
      loading = true
      const data = await fetchYearPage(year, nextPage, PAGE_LIMIT)
      loading = false
      if (!data) return
      pagesLoaded.add(data.page)
      yearDetailView.addAlbums(data.items, year)
      yearDetailView.layout(year)
      yearDetailView.updateTextures()
    }

    // Interaction state
    let isDragging = false
    let lastX = 0
    let lastY = 0

    function onPointerDown(e: PointerEvent) {
      isDragging = true
      lastX = e.clientX
      lastY = e.clientY
    }

    function onPointerMove(e: PointerEvent) {
      const ndc = clientToNDC(e)
      if (modeRef.current === 'years') {
        yearsView.hoverAt(raycaster, ndc)
      }

      if (!isDragging) return
      const vb = getViewBounds(camera)
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY

      const worldPerPixelX = vb.width / renderer.domElement.clientWidth
      const worldPerPixelY = vb.height / renderer.domElement.clientHeight

      camera.position.x -= dx * worldPerPixelX
      camera.position.y += dy * worldPerPixelY

      if (modeRef.current === 'year-detail') {
        yearDetailView.updateTextures()
        void maybeLoadMoreYear()
      }
    }

    function onPointerUp() {
      isDragging = false
    }

    function onWheel(e: WheelEvent) {
      const zoomFactor = Math.pow(1.001, e.deltaY)
      const prevZoom = camera.zoom
      const nextZoom = THREE.MathUtils.clamp(prevZoom / zoomFactor, 0.25, 6)

      const rect = renderer.domElement.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1)

      const vb = getViewBounds(camera)
      const before = new THREE.Vector3(
        camera.position.x + (nx * vb.width) / 2,
        camera.position.y + (ny * vb.height) / 2,
        0,
      )

      camera.zoom = nextZoom
      camera.updateProjectionMatrix()

      const vb2 = getViewBounds(camera)
      const after = new THREE.Vector3(
        camera.position.x + (nx * vb2.width) / 2,
        camera.position.y + (ny * vb2.height) / 2,
        0,
      )

      camera.position.x += before.x - after.x
      camera.position.y += before.y - after.y

      // Drill-down / up
      if (modeRef.current === 'years') {
        const ndc = clientToNDC(e)
        const year = yearsView.pickYear(raycaster, ndc)
        if (year && camera.zoom >= ENTER_YEAR_ZOOM) {
          void enterYear(year)
          return
        }
      } else if (modeRef.current === 'year-detail') {
        if (camera.zoom <= EXIT_TO_YEARS_ZOOM) {
          void exitYearToYears()
          return
        }
        yearDetailView.updateTextures()
        void maybeLoadMoreYear()
      }
    }

    function onClick(e: MouseEvent) {
      if (isDragging) return
      if (modeRef.current === 'years') {
        const year = yearsView.pickYear(raycaster, clientToNDC(e))
        if (year) void enterYear(year)
      } else {
        // Pick album tile
        const rect = renderer.domElement.getBoundingClientRect()
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -(((e.clientY - rect.top) / rect.height) * 2 - 1),
        )
        raycaster.setFromCamera(mouse, camera)
        const hits = raycaster.intersectObjects(
          Array.from(yearDetailView.tiles.values()).map((t) => t.mesh),
          false,
        )
        if (hits.length > 0) {
          const mesh = hits[0].object as THREE.Mesh
          const albumId: string | undefined = mesh.userData?.albumId
          if (albumId) router.push(`/album/${albumId}`)
        }
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && modeRef.current === 'year-detail') {
        void exitYearToYears()
      }
    }

    function onResize() {
      onResizeOrtho(camera, renderer)
      if (modeRef.current === 'year-detail') yearDetailView.updateTextures()
    }

    // Render loop
    let raf = 0
    const renderLoop = () => {
      raf = requestAnimationFrame(renderLoop)
      renderer.render(scene, camera)
    }

    // Boot + listeners
    ;(async () => {
      await bootYears()
      renderLoop()
    })()

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true })
    renderer.domElement.addEventListener('click', onClick)
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKeyDown)

    // Cleanup
    return () => {
      cancelAnimationFrame(raf)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('wheel', onWheel)
      renderer.domElement.removeEventListener('click', onClick)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKeyDown)

      yearsView.clear()
      yearDetailView.reset()
      renderer.dispose()
      if (mountRef.current) {
        try {
          mountRef.current.removeChild(renderer.domElement)
        } catch {}
      }
    }
  }, [router])

  useEffect(() => {
    // keep refs in sync
    ;(modeRef as any).current = mode
    ;(activeYearRef as any).current = activeYear
  }, [mode, activeYear])

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
}
