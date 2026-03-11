'use client'

import { useAuth } from '@clerk/nextjs'
import type { PropsWithChildren } from 'react'
import { AuthContext } from '@/lib/auth'

export function AppProviders({ children }: PropsWithChildren) {
  const { isSignedIn } = useAuth()

  return (
    <AuthContext.Provider
      value={{
        clerkAvailable: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
        isSignedIn: Boolean(isSignedIn),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
