import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { LeaderboardEntry } from '../lib/types'

export function LeaderboardPage() {
  const [players, setPlayers] = useState<LeaderboardEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void api
      .leaderboard()
      .then((response) => setPlayers(response.players))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load leaderboard'))
  }, [])

  return (
    <section className="rounded-[32px] border border-white/10 bg-slate-950/60 p-8">
      <h1 className="font-serif text-4xl text-white">Global Leaderboard</h1>
      <p className="mt-3 text-slate-300">Collectors are ranked by what they currently hold, then by shiny ownership and total crafting output.</p>
      {error && <p className="mt-4 text-rose-300">{error}</p>}
      <div className="mt-8 space-y-4">
        {players.map((player) => (
          <div key={player.username} className="grid gap-4 rounded-[24px] border border-white/8 bg-white/4 p-5 md:grid-cols-[80px_1fr_repeat(3,120px)] md:items-center">
            <p className="text-4xl font-semibold text-orange-200">#{player.rank}</p>
            <div>
              <Link to={`/u/${player.username}`} className="text-2xl text-white">
                {player.username}
              </Link>
              <p className="mt-1 text-sm text-slate-400">Collector archive</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Inventory</p>
              <p className="mt-1 text-xl text-white">{player.itemCount}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Crafted</p>
              <p className="mt-1 text-xl text-white">{player.craftedCount ?? 0}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Shiny</p>
              <p className="mt-1 text-xl text-white">{player.shinyCount ?? 0}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
