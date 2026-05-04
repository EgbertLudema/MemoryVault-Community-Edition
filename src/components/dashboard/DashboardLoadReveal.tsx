'use client'

import * as React from 'react'

type DashboardLoadRevealProps = {
  children: React.ReactNode
  className?: string
  delayMs?: number
  as?: React.ElementType
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function DashboardLoadReveal({
  children,
  className,
  delayMs = 0,
  as = 'div',
}: DashboardLoadRevealProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      setIsVisible(true)
      return
    }

    const timeout = window.setTimeout(() => {
      setIsVisible(true)
    }, 24)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [])

  return React.createElement(
    as,
    {
      className: cn(
        'transition-[opacity,transform,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,transform,filter]',
        isVisible
          ? 'translate-y-0 scale-100 opacity-100 blur-0'
          : 'translate-y-6 scale-[0.985] opacity-0 blur-[10px]',
        className,
      ),
      style: {
        transitionDelay: `${delayMs}ms`,
      },
    },
    children,
  )
}
