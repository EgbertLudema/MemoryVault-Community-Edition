import * as React from 'react'
import { MEMORY_VAULT_LOGO_PATHS, MEMORY_VAULT_LOGO_VIEW_BOX } from '@/lib/memoryVaultLogo'

type MemoryVaultLogoProps = {
  className?: string
  size?: number
}

export function MemoryVaultLogo({ className, size = 56 }: MemoryVaultLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={MEMORY_VAULT_LOGO_VIEW_BOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {MEMORY_VAULT_LOGO_PATHS.map((path) => (
        <path
          key={path.d}
          d={path.d}
          stroke={path.stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}
