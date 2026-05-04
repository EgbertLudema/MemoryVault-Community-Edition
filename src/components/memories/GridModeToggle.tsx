'use client'

import React from 'react'
import type { GridMode } from '@/components/ui/MemoryFilters'

function DragGridIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="0.714286" cy="0.714286" r="0.714286" fill="currentColor" />
      <circle cx="5.00005" cy="0.714286" r="0.714286" fill="currentColor" />
      <circle cx="9.2857" cy="0.714286" r="0.714286" fill="currentColor" />
      <circle cx="0.714286" cy="5.00004" r="0.714286" fill="currentColor" />
      <circle cx="5.00005" cy="5.00004" r="0.714286" fill="currentColor" />
      <circle cx="9.2857" cy="5.00004" r="0.714286" fill="currentColor" />
      <circle cx="0.714286" cy="9.28579" r="0.714286" fill="currentColor" />
      <circle cx="5.00005" cy="9.28579" r="0.714286" fill="currentColor" />
      <circle cx="9.2857" cy="9.28579" r="0.714286" fill="currentColor" />
    </svg>
  )
}

function ScrollGridIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="4" height="4" rx="1.5" stroke="currentColor" />
      <rect x="7.5" y="0.5" width="4" height="4" rx="1.5" stroke="currentColor" />
      <rect x="0.5" y="7.5" width="4" height="4" rx="1.5" stroke="currentColor" />
      <rect x="7.5" y="7.5" width="4" height="4" rx="1.5" stroke="currentColor" />
    </svg>
  )
}

export function GridModeToggle({
  gridMode,
  onChange,
  size = 'compact',
}: {
  gridMode: GridMode
  isOpen?: boolean
  onOpenChange?: (next: boolean) => void
  onChange: (gridMode: GridMode) => void
  size?: 'compact' | 'regular'
}) {
  const isRegular = size === 'regular'

  return (
    <div
      className={
        isRegular
          ? 'inline-flex h-11 items-center gap-1 rounded-full border border-white/70 bg-white/84 px-1 py-0.5 text-neutral-900 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm'
          : 'inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/84 p-0.5 text-neutral-900 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm'
      }
    >
      {([
        { mode: 'scroll', label: 'Grid view', Icon: ScrollGridIcon },
        { mode: 'drag', label: 'Drag view', Icon: DragGridIcon },
      ] as const).map((option) => {
        const active = gridMode === option.mode
        const Icon = option.Icon

        return (
          <button
            key={option.mode}
            type="button"
            onClick={() => onChange(option.mode)}
            aria-pressed={active}
            className={
              active
                ? isRegular
                  ? 'inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-neutral-950 shadow-[0_8px_20px_rgba(15,23,42,0.08)]'
                  : 'inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-white px-3.5 text-sm font-semibold text-neutral-950 shadow-[0_8px_20px_rgba(15,23,42,0.08)]'
                : isRegular
                  ? 'inline-flex h-9 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium text-stone-600 transition hover:bg-white/75 hover:text-stone-800'
                  : 'inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-3.5 text-sm font-medium text-stone-600 transition hover:bg-white/75 hover:text-stone-800'
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
