'use client'

import * as React from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { AppHelpButton } from '@/components/onboarding/AppHelpButton'
import { AppIntroTour } from '@/components/onboarding/AppIntroTour'

export function AppShell(props: {
  children: React.ReactNode
  userFullName?: string | null
  userProfileImageSrc?: string | null
}) {
  return (
    <div className="h-screen w-full overflow-hidden bg-neutral-50">
      <AppIntroTour userFullName={props.userFullName} />
      <AppHelpButton />
      <div className="flex h-full w-full overflow-hidden">
        <Sidebar
          userFullName={props.userFullName}
          userProfileImageSrc={props.userProfileImageSrc}
        />

        <main className="relative flex-1 min-w-0 min-h-0 overflow-hidden">
          {props.children}
        </main>
      </div>
    </div>
  )
}
