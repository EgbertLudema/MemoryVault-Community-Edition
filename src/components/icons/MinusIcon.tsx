import * as React from 'react'

export function MinusIcon({ className = 'h-4 w-4', ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      {...props}
    >
      <path d="M5 12h14" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
