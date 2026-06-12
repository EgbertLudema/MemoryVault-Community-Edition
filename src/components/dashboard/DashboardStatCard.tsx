// components/dashboard/DashboardStatCard.tsx
'use client'

import * as React from 'react'
import gsap from 'gsap'
import { Link } from '@/i18n/navigation'
import { PlusIcon } from '@/components/icons/PlusIcon'
import { useMemoryCreationGate } from '@/components/memories/AddMemoryGate'

type DashboardStatCardProps = {
  icon: React.ReactNode
  value: number
  label: string
  backgroundImage: string
  href?: string
  actionLabel?: string
}

export function DashboardStatCard(props: DashboardStatCardProps) {
  const { icon, value, label, backgroundImage, href, actionLabel } = props
  const [displayValue, setDisplayValue] = React.useState(0)
  const memoryCreationGate = useMemoryCreationGate()

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

  const content = (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/90"
      />

      {href ? (
        <div className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-purple-100 bg-purple-50 text-purple-700 shadow-[0_10px_24px_rgba(139,92,246,0.12)] transition group-hover:border-purple-200 group-hover:bg-purple-100 group-hover:text-purple-800">
          <PlusIcon className="h-3.5 w-3.5" />
        </div>
      ) : null}

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
    </>
  )

  const className =
    'group relative block overflow-hidden rounded-[28px] corner-shape-squircle border border-white/70 bg-white/80 p-5 text-inherit no-underline shadow-[0_18px_50px_rgba(148,163,184,0.14)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(139,92,246,0.18)] focus:outline-none focus:ring-2 focus:ring-purple-300/70'

  if (href) {
    return (
      <Link
        href={href}
        onClick={(event) => memoryCreationGate?.guardAddMemoryClick(event, href)}
        className={className}
        aria-label={actionLabel ?? label}
      >
        {content}
      </Link>
    )
  }

  return (
    <div className={className} aria-label={actionLabel ?? label}>
      {content}
    </div>
  )
}
