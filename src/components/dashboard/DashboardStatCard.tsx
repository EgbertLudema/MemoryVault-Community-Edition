// components/dashboard/DashboardStatCard.tsx
'use client'

import * as React from 'react'
import gsap from 'gsap'

type DashboardStatCardProps = {
  icon: React.ReactNode
  value: number
  label: string
  backgroundImage: string
}

export function DashboardStatCard(props: DashboardStatCardProps) {
  const { icon, value, label, backgroundImage } = props
  const [displayValue, setDisplayValue] = React.useState(0)

  React.useEffect(() => {
    const counter = { current: 0 }
    setDisplayValue(0)

    const tween = gsap.to(counter, {
      current: value,
      duration: 0.9,
      ease: 'power3.out',
      onUpdate: () => {
        setDisplayValue(Math.round(counter.current))
      },
    })

    return () => {
      tween.kill()
    }
  }, [value])

  return (
    <div className="group relative overflow-hidden rounded-[28px] corner-shape-squircle border border-white/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(148,163,184,0.14)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(139,92,246,0.18)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/90"
      />

      <div className="relative flex flex-col items-start gap-4">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl corner-shape-squircle border border-white/20 shadow-lg transition-transform duration-200 group-hover:scale-105"
          style={{
            backgroundImage,
            color: '#ffffff',
          }}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <div className="text-[28px] font-bold leading-none tracking-tight text-slate-900">
            {displayValue}
          </div>
          <div className="mt-2 text-[13px] font-medium uppercase tracking-[0.18em] text-slate-500">
            {label}
          </div>
        </div>
      </div>
    </div>
  )
}
