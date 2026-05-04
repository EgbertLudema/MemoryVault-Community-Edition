// components/ui/GroupButton.tsx
'use client'

import * as React from 'react'

type GroupButtonProps = {
  label: string
  active?: boolean
  onClick?: () => void
  colorValue?: string | null
  icon?: React.ReactNode
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function hexToRgba(hex: string, alpha: number) {
  const normalizedHex = String(hex ?? '')
    .trim()
    .replace('#', '')

  const value =
    normalizedHex.length === 3
      ? normalizedHex
          .split('')
          .map((x) => `${x}${x}`)
          .join('')
      : normalizedHex

  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return undefined
  }

  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function GroupButton(props: GroupButtonProps) {
  const { label, active = false, onClick, colorValue, icon } = props

  const hasColor = Boolean(colorValue)

  const softBackground = hasColor ? hexToRgba(colorValue as string, 0.1) : undefined
  const softBorder = hasColor ? hexToRgba(colorValue as string, 0.35) : undefined

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-2xl corner-shape-squircle border px-4 py-2 text-sm font-semibold transition duration-150',
      )}
      style={
        hasColor
          ? active
            ? {
                color: '#ffffff',
                backgroundColor: colorValue ?? undefined,
                borderColor: colorValue ?? undefined,
              }
            : {
                color: colorValue ?? undefined,
                backgroundColor: softBackground,
                borderColor: softBorder,
              }
          : active
            ? {
                color: '#ffffff',
                backgroundColor: '#111111',
                borderColor: '#111111',
              }
            : undefined
      }
    >
      {icon ? <span className="inline-flex shrink-0 items-center">{icon}</span> : null}
      <span className="block leading-none">{label}</span>
    </button>
  )
}
