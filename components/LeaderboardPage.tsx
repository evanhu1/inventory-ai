'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { LeaderboardEntry } from '@/lib/types'

export function LeaderboardPage() {
  const [players, setPlayers] = useState<LeaderboardEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void api.leaderboard()
      .then((res) => setPlayers(res.leaderboard))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load leaderboard'))
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-parchment">Leaderboard</h1>
        <p className="mt-1 text-xs text-dim">Ranked by cards held, then shinies and best arena score.</p>
      </div>

      {error && <p className="font-mono text-xs text-red-400">{error}</p>}

      {/* Header row */}
      <div className="hidden gap-px bg-edge sm:grid sm:grid-cols-[60px_1fr_80px_80px_80px]">
        <div className="bg-surface px-3 py-2 font-mono text-[10px] text-faint">#</div>
        <div className="bg-surface px-3 py-2 font-mono text-[10px] text-faint">COLLECTOR</div>
        <div className="bg-surface px-3 py-2 text-right font-mono text-[10px] text-faint">CARDS</div>
        <div className="bg-surface px-3 py-2 text-right font-mono text-[10px] text-faint">SHINY</div>
        <div className="bg-surface px-3 py-2 text-right font-mono text-[10px] text-faint">BEST DUEL</div>
      </div>

      {/* Rows */}
      <div className="space-y-px stagger">
        {players.map((player) => (
          <div
            key={player.username}
            className="grid items-center gap-px bg-edge sm:grid-cols-[60px_1fr_80px_80px_80px]"
          >
            <div className="bg-surface px-3 py-3">
              <span className={`font-mono text-lg ${player.rank <= 3 ? 'text-gold' : 'text-dim'}`}>
                {player.rank}
              </span>
            </div>
            <div className="bg-surface px-3 py-3">
              <Link href={`/u/${player.username}`} className="font-display text-parchment hover:text-gold transition-colors">
                {player.username}
              </Link>
            </div>
            <div className="bg-surface px-3 py-3 text-right font-mono text-sm text-parchment">
              {player.itemCount}
            </div>
            <div className="bg-surface px-3 py-3 text-right font-mono text-sm text-parchment">
              {player.shinyCount ?? 0}
            </div>
            <div className="bg-surface px-3 py-3 text-right font-mono text-sm text-parchment">
              {player.bestDuelScore ?? 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
