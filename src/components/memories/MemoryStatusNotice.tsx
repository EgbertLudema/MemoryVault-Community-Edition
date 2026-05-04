'use client'

import React from 'react'

export function MemoryStatusNotice({
  message,
  tone,
  left,
  top,
  position = 'absolute',
}: {
  message: string
  tone: 'default' | 'error'
  left: number
  top: number
  position?: 'absolute' | 'fixed'
}) {
  const isError = tone === 'error'

  return (
    <div
      className="pointer-events-none z-30 max-w-[360px] rounded-[20px] corner-shape-squircle border px-4 py-3 shadow-[0_20px_50px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-xs"
      style={{
        position,
        left: `${left}px`,
        top: `${top}px`,
        background: isError ? 'rgba(127, 29, 29, 0.72)' : 'rgba(255, 255, 255, 0.22)',
        borderColor: isError ? 'rgba(252, 165, 165, 0.34)' : 'rgba(255, 255, 255, 0.42)',
        color: isError ? 'rgb(254, 226, 226)' : 'rgb(15, 23, 42)',
      }}
    >
      <p className="text-[13px] font-medium leading-5">{message}</p>
    </div>
  )
}
