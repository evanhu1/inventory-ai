import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { api } from './lib/api'
import type { BootstrapPayload } from './lib/types'
import { ArenaPage } from './pages/ArenaPage'
import { HomePage } from './pages/HomePage'
import { InventoryPage } from './pages/InventoryPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { PublicInventoryPage } from './pages/PublicInventoryPage'
import { TradesPage } from './pages/TradesPage'

function App() {
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
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage data={bootstrap} loading={loading} />} />
        <Route path="/inventory" element={<InventoryPage bootstrap={bootstrap} refreshBootstrap={refreshBootstrap} />} />
        <Route path="/u/:username" element={<PublicInventoryPage bootstrap={bootstrap} />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/trades" element={<TradesPage />} />
        <Route path="/arena" element={<ArenaPage />} />
      </Route>
    </Routes>
  )
}

export default App
