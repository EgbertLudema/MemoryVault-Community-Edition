// components/Modal.tsx
'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { SecondaryButton } from './ui/SecondairyButton'

export function Modal({
  title,
  children,
  size = 'default',
}: {
  title: string
  children: React.ReactNode
  size?: 'default' | 'wide'
}) {
  const router = useRouter()

  function close() {
    router.back()
  }

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-1000 flex items-center justify-center bg-black/35 p-4"
      onMouseDown={close}
    >
      <div
        className={
          size === 'wide'
            ? 'relative flex max-h-[calc(100vh_-_32px)] w-full max-w-[980px] flex-col overflow-hidden rounded-2xl corner-shape-squircle border border-[#eee] bg-white shadow-[0_10px_40px_rgba(0,0,0,0.18)]'
            : 'relative flex max-h-[calc(100vh_-_32px)] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl corner-shape-squircle border border-[#eee] bg-white shadow-[0_10px_40px_rgba(0,0,0,0.18)]'
        }
        onMouseDown={(e) => e.stopPropagation()}
      >
      {/* Sticky header so the X stays visible */}
        <div className="sticky top-0 z-10 border-b border-[#eee] bg-[#fafafa] px-4 py-[14px]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col pr-10">
              <strong className="text-[14px]">{title}</strong>
              <span className="mt-[2px] text-[12px] text-[#666]">Press Escape to close</span>
            </div>

            {/* Always top-right, inside the modal */}
            <SecondaryButton
              type="button"
              onClick={close}
              aria-label="Close"
              className="
                                absolute right-3 top-3
                                h-[36px] w-[36px]
                                cursor-pointer rounded-[10px]
                                border border-[#ddd] bg-white
                                text-[18px] leading-[1]
                                flex items-center justify-center
                            "
            >
              &times;
            </SecondaryButton>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">{children}</div>
      </div>
    </div>
  )
}
