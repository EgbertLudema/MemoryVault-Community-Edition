'use client'

import Link from 'next/link'
import * as React from 'react'
import { TrashIcon } from '@/components/icons/TrashIcon'

type DeleteButtonProps = {
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

export function DeleteButton({
  href,
  onClick,
  type = 'button',
  disabled = false,
  children,
  className,
}: DeleteButtonProps) {
  const baseClasses = cn(
    'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md corner-shape-squircle cursor-pointer',
    'text-md font-medium',
    'bg-red-50 text-red-700 border border-red-200',
    'transition-all duration-200',
    'hover:bg-red-100',
    'active:scale-[0.95]',
    disabled && 'opacity-50 cursor-not-allowed',
    className,
  )

  const content = (
    <>
      <TrashIcon className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {content}
      </Link>
    )
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={baseClasses}>
      {content}
    </button>
  )
}
