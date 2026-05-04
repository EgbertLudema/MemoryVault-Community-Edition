// components/icons/NotesIcon.tsx
import * as React from 'react'

export function NotesIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="m17,0H7C4.243,0,2,2.243,2,5v14c0,2.757,2.243,5,5,5h10c2.757,0,5-2.243,5-5V5c0-2.757-2.243-5-5-5ZM7,2h10c1.654,0,3,1.346,3,3H4c0-1.654,1.346-3,3-3Zm10,20H7c-1.654,0-3-1.346-3-3V7h16v12c0,1.654-1.346,3-3,3Zm0-11c0,.553-.448,1-1,1h-8c-.552,0-1-.447-1-1s.448-1,1-1h8c.552,0,1,.447,1,1Zm-4,4c0,.553-.448,1-1,1h-4c-.552,0-1-.447-1-1s.448-1,1-1h4c.552,0,1,.447,1,1Z" />
    </svg>
  )
}
