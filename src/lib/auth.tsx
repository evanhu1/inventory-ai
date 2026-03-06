import { createContext, useContext } from 'react'

export type AuthState = {
  clerkAvailable: boolean
  isSignedIn: boolean
  getToken: (() => Promise<string | null>) | null
}

export const AuthContext = createContext<AuthState>({
  clerkAvailable: false,
  isSignedIn: false,
  getToken: null,
})

export function useInventoryAuth() {
  return useContext(AuthContext)
}
