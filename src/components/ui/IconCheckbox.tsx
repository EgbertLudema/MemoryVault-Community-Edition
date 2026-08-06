'use client'

import * as React from 'react'
import { CheckIcon } from '@/components/icons/CheckIcon'

type IconCheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  boxClassName?: string
  iconClassName?: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function IconCheckbox({
  className,
  boxClassName,
  iconClassName,
  ...props
}: IconCheckboxProps) {
  return (
    <span className={cn('relative inline-flex h-4 w-4 shrink-0', className)}>
      <input
        {...props}
        type="checkbox"
        className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none inline-flex h-full w-full items-center justify-center rounded border border-stone-300 bg-white text-white transition',
          'peer-checked:border-purple-600 peer-checked:bg-purple-600',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-purple-600 peer-focus-visible:ring-offset-2',
          'peer-checked:[&>svg]:opacity-100',
          boxClassName,
        )}
      >
        <CheckIcon className={cn('h-[82%] w-[82%] opacity-0 transition-opacity', iconClassName)} />
      </span>
    </span>
  )
}
