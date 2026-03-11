'use client'

import { useEffect, useState } from 'react'
import { CardTile } from '@/components/CardTile'
import { useInventoryAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import type { ArenaResponse, DuelResponse } from '@/lib/types'

export function ArenaPage() {
  const auth = useInventoryAuth()
  const [arenaData, setArenaData] = useState<ArenaResponse | null>(null)
  const [duelResult, setDuelResult] = useState<DuelResponse | null>(null)
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void api.arena()
      .then(setArenaData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load arena'))
  }, [])

  function toggleCard(cardId: number) {
    setSelectedCardIds((cur) =>
      cur.includes(cardId)
        ? cur.filter((id) => id !== cardId)
        : cur.length < 3 ? [...cur, cardId] : cur,
    )
  }

  async function runDuel() {
    setError(null)
    try {
      setDuelResult(await api.duel(selectedCardIds))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duel failed')
    }
  }

  return (
    <div className="space-y-6">
      {/* Arena contract */}
      <div className="border border-gold/20 bg-gold/5 p-6">
        <p className="font-mono text-[10px] tracking-[0.4em] text-gold-dim">DAILY ARENA CONTRACT</p>
        <h1 className="mt-3 font-display text-3xl text-parchment">
          {arenaData?.arena.title ?? 'Loading...'}
        </h1>
        <p className="mt-2 text-sm text-dim">
          Field three cards. Matching traits, word length, and shiny anchors boost your score.
        </p>

        <div className="mt-5 grid gap-px bg-edge sm:grid-cols-3">
          <div className="bg-surface px-4 py-3">
            <p className="font-mono text-[10px] text-faint">WANTED TRAITS</p>
            <p className="mt-1 font-mono text-sm text-parchment">
              {arenaData?.arena.wantedTraits.join(' / ') ?? '-'}
            </p>
          </div>
          <div className="bg-surface px-4 py-3">
            <p className="font-mono text-[10px] text-faint">MODIFIER</p>
            <p className="mt-1 font-mono text-sm text-parchment">
              {arenaData?.arena.modifiers[0] ?? '-'}
            </p>
          </div>
          <div className="bg-surface px-4 py-3">
            <p className="font-mono text-[10px] text-faint">RESETS</p>
            <p className="mt-1 font-mono text-sm text-parchment">
              {arenaData?.arena.date ?? '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Duel result */}
      {duelResult && (
        <div className={`border p-6 ${
          duelResult.verdict === 'win'
            ? 'border-teal/30 bg-teal/5'
            : 'border-red-500/30 bg-red-500/5'
        }`}>
          <div className="flex items-center gap-3">
            <span className={`font-display text-2xl ${
              duelResult.verdict === 'win' ? 'text-teal' : 'text-red-400'
            }`}>
              {duelResult.verdict === 'win' ? 'VICTORY' : 'DEFEAT'}
            </span>
            <span className="font-mono text-sm text-dim">
              {duelResult.score} / {duelResult.threshold}
            </span>
          </div>
          <p className="mt-3 text-sm text-dim">{duelResult.summary}</p>
        </div>
      )}

      {/* Card selection */}
      {auth.isSignedIn ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-mono text-[10px] tracking-[0.3em] text-dim">SELECT YOUR LINEUP</h2>
              <p className="mt-1 text-xs text-faint">Pick exactly 3 cards</p>
            </div>
            <button
              onClick={() => void runDuel()}
              disabled={selectedCardIds.length !== 3}
              className="cursor-pointer border border-gold/40 bg-gold/10 px-6 py-2 font-mono text-xs tracking-[0.2em] text-gold transition-colors hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-30"
            >
              DUEL ({selectedCardIds.length}/3)
            </button>
          </div>

          {error && <p className="font-mono text-xs text-red-400">{error}</p>}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 stagger">
            {arenaData?.cards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                selectable
                selected={selectedCardIds.includes(card.id)}
                onToggle={toggleCard}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-edge bg-surface py-12 text-center text-dim">
          Sign in to enter your cards into the arena.
        </div>
      )}
    </div>
  )
}
