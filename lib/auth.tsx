'use client'

import { createContext, useContext } from 'react'

export type AuthState = {
  clerkAvailable: boolean
  isSignedIn: boolean
}

export const AuthContext = createContext<AuthState>({
  clerkAvailable: false,
  isSignedIn: false,
})

export function useInventoryAuth() {
  return useContext(AuthContext)
}
