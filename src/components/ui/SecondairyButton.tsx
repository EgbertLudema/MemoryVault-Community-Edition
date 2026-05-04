'use client'

import * as React from 'react'
import { Link } from '@/i18n/navigation'

type SecondaryButtonProps = {
  href?: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  children: React.ReactNode
  className?: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function SecondaryButton({
  href,
  onClick,
  type = 'button',
  disabled = false,
  children,
  className,
}: SecondaryButtonProps) {
  const baseClasses = cn(
    // Layout
    'inline-flex items-center justify-center px-4 py-2 rounded-xl corner-shape-squircle cursor-pointer',
    // Typography
    'text-md font-medium',
    // Colors
    'bg-white text-black border border-neutral-300',
    // Effects
    'transition-all duration-200',
    'hover:bg-neutral-100',
    'active:scale-[0.95]',
    // Disabled state
    disabled && 'opacity-50 cursor-not-allowed',
    // Optional overrides
    className,
  )

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={baseClasses}>
      {children}
    </button>
  )
}
