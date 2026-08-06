// components/Modal.tsx
'use client'

import * as React from 'react'
import gsap from 'gsap'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { XIcon } from '@/components/icons/XIcon'
import { MODAL_NAVIGATION_EVENT, type ModalNavigationDetail } from '@/lib/modalNavigation'

export function Modal({
  title,
  children,
  size = 'default',
  onClose,
}: {
  title: string
  children: React.ReactNode
  size?: 'default' | 'wide'
  onClose?: () => void
}) {
  const router = useRouter()
  const t = useTranslations('Modal')
  const overlayRef = React.useRef<HTMLDivElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const closingRef = React.useRef(false)

  const close = React.useCallback(
    (nextHref?: string) => {
      if (closingRef.current) {
        return
      }

      const overlay = overlayRef.current
      const panel = panelRef.current

      if (!overlay || !panel) {
        if (!nextHref && onClose) {
          onClose()
          return
        }
        if (nextHref) {
          router.push(nextHref)
        } else {
          router.back()
        }
        return
      }

      closingRef.current = true
      gsap.killTweensOf([overlay, panel])

      const timeline = gsap.timeline({
        defaults: { ease: 'power2.in' },
        onComplete: () => {
          if (!nextHref && onClose) {
            onClose()
          } else if (nextHref) {
            router.push(nextHref)
          } else {
            router.back()
          }
        },
      })

      timeline.to(panel, { autoAlpha: 0, y: 18, scale: 0.985, duration: 0.16 }, 0)
      timeline.to(overlay, { backgroundColor: 'rgba(0,0,0,0)', duration: 0.18 }, 0)
    },
    [onClose, router],
  )

  React.useEffect(() => {
    function onModalNavigation(event: Event) {
      const modalEvent = event as CustomEvent<ModalNavigationDetail>
      const href = modalEvent.detail?.href

      if (!href) {
        return
      }

      event.preventDefault()
      close(href)
    }

    window.addEventListener(MODAL_NAVIGATION_EVENT, onModalNavigation)

    return () => window.removeEventListener(MODAL_NAVIGATION_EVENT, onModalNavigation)
  }, [close])

  function closeFromMouse() {
    if (closingRef.current) {
      return
    }
    close()
  }

  React.useLayoutEffect(() => {
    const overlay = overlayRef.current
    const panel = panelRef.current

    if (!overlay || !panel) {
      return
    }

    gsap.set(overlay, { backgroundColor: 'rgba(0,0,0,0)' })
    gsap.set(panel, { autoAlpha: 0, y: 24, scale: 0.985 })

    const timeline = gsap.timeline({ defaults: { ease: 'power2.out' } })
    timeline.to(overlay, { backgroundColor: 'rgba(0,0,0,0.35)', duration: 0.2 }, 0)
    timeline.to(
      panel,
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.28,
        clearProps: 'opacity,visibility,transform',
      },
      0.04,
    )

    return () => {
      timeline.kill()
      gsap.killTweensOf([overlay, panel])
    }
  }, [])

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [close])

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[1000] flex items-stretch justify-center bg-black/35 p-0 sm:items-center sm:p-4"
      onMouseDown={closeFromMouse}
    >
      <div
        ref={panelRef}
        className={
          size === 'wide'
            ? 'relative flex h-dvh w-full max-w-[980px] flex-col overflow-hidden border border-stone-200 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.18)] sm:h-auto sm:max-h-[calc(100vh_-_32px)] sm:rounded-2xl sm:corner-shape-squircle'
            : 'relative flex h-dvh w-full max-w-[720px] flex-col overflow-hidden border border-stone-200 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.18)] sm:h-auto sm:max-h-[calc(100vh_-_32px)] sm:rounded-2xl sm:corner-shape-squircle'
        }
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Sticky header so the X stays visible */}
        <div className="sticky top-0 z-10 border-b border-stone-200 bg-white px-4 py-4 sm:bg-stone-50 sm:px-4 sm:py-[14px]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col pr-10">
              <strong className="line-clamp-2 text-[15px] leading-5 text-stone-950 sm:text-[14px]">
                {title}
              </strong>
              <span className="mt-[2px] hidden text-[12px] text-stone-500 sm:block">
                {t('escapeToClose')}
              </span>
            </div>

            {/* Always top-right, inside the modal */}
            <button
              type="button"
              onClick={() => close()}
              aria-label={t('close')}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl corner-shape-squircle border border-stone-200 bg-white p-0 text-stone-600 transition hover:bg-stone-50 sm:top-3 sm:h-9 sm:w-9 sm:translate-y-0"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-4 pb-0 sm:px-4">
          {children}
        </div>
      </div>
    </div>
  )
}
