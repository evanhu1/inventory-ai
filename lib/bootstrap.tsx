'use client'

import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react'
import { api } from '@/lib/api'
import type { BootstrapPayload } from '@/lib/types'

type BootstrapState = {
  bootstrap: BootstrapPayload | null
  loading: boolean
  refreshBootstrap: () => Promise<void>
}

const BootstrapContext = createContext<BootstrapState>({
  bootstrap: null,
  loading: true,
  refreshBootstrap: async () => {},
})

export function BootstrapProvider({ children }: PropsWithChildren) {
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null)
  const [loading, setLoading] = useState(true)

  async function refreshBootstrap() {
    setLoading(true)
    try {
      setBootstrap(await api.bootstrap())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshBootstrap()
  }, [])

  return (
    <BootstrapContext.Provider value={{ bootstrap, loading, refreshBootstrap }}>
      {children}
    </BootstrapContext.Provider>
  )
}

export function useBootstrap() {
  return useContext(BootstrapContext)
}
