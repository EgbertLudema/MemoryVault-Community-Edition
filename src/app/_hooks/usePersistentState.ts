'use client'

import * as React from 'react'

/**
 * Persistent state backed by localStorage.
 * - Safe for Next.js App Router (client-only).
 * - Reads once after mount to avoid hydration mismatches.
 */
export function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = React.useState<T>(initialValue)
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored !== null) {
        setValue(JSON.parse(stored) as T)
      }
    } catch {
      // Ignore storage errors (private mode, blocked, etc.)
    } finally {
      setHydrated(true)
    }
  }, [key])

  React.useEffect(() => {
    if (!hydrated) return

    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Ignore write errors
    }
  }, [key, value, hydrated])

  return [value, setValue] as const
}
