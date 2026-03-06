import { ClerkProvider, useAuth } from '@clerk/react'
import { BrowserRouter } from 'react-router-dom'
import type { PropsWithChildren } from 'react'
import { AuthContext } from './auth'

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function ClerkBoundProviders({ children }: PropsWithChildren) {
  const { isSignedIn, getToken } = useAuth()

  return (
    <AuthContext.Provider value={{ clerkAvailable: true, isSignedIn: Boolean(isSignedIn), getToken }}>
      <BrowserRouter>{children}</BrowserRouter>
    </AuthContext.Provider>
  )
}

function LocalProviders({ children }: PropsWithChildren) {
  return (
    <AuthContext.Provider value={{ clerkAvailable: false, isSignedIn: false, getToken: null }}>
      <BrowserRouter>{children}</BrowserRouter>
    </AuthContext.Provider>
  )
}

export function AppProviders({ children }: PropsWithChildren) {
  if (!clerkKey) {
    return <LocalProviders>{children}</LocalProviders>
  }

  return (
    <ClerkProvider publishableKey={clerkKey} afterSignOutUrl="/">
      <ClerkBoundProviders>{children}</ClerkBoundProviders>
    </ClerkProvider>
  )
}
