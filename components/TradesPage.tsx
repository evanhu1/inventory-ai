'use client'

import { useEffect, useState } from 'react'
import { useInventoryAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import type { TradeOffer } from '@/lib/types'

export function TradesPage() {
  const auth = useInventoryAuth()
  const [offers, setOffers] = useState<TradeOffer[]>([])
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      const res = await api.inbox()
      setOffers(res.offers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load trades')
    }
  }

  useEffect(() => {
    if (!auth.isSignedIn) return
    let cancelled = false
    void api.inbox()
      .then((res) => { if (!cancelled) setOffers(res.offers) })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load trades') })
    return () => { cancelled = true }
  }, [auth.isSignedIn])

  async function respond(id: number, action: 'accepted' | 'rejected') {
    setError(null)
    try {
      await api.respondTrade(id, action)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update trade')
    }
  }

  if (!auth.isSignedIn) {
    return (
      <div className="border border-edge bg-surface py-12 text-center text-dim">
        Sign in to manage trades.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-parchment">Trades</h1>
        <p className="mt-1 text-xs text-dim">Send gifts or propose swaps. Pending offers appear here.</p>
      </div>

      {error && <p className="font-mono text-xs text-red-400">{error}</p>}

      <div className="space-y-2 stagger">
        {offers.length === 0 && (
          <p className="py-12 text-center text-dim">No trades yet.</p>
        )}
        {offers.map((offer) => (
          <div key={offer.id} className="border border-edge bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className={`font-mono text-[10px] tracking-wider ${
                  offer.status === 'pending' ? 'text-gold' : 'text-faint'
                }`}>
                  {offer.status.toUpperCase()}
                </span>
                <p className="mt-1 text-parchment">
                  <span className="font-display">{offer.fromUsername}</span>
                  <span className="text-dim"> {offer.kind === 'gift' ? 'gifted' : 'offered'} </span>
                  <span className="font-mono text-sm">{offer.cards.filter((c) => c.side === 'offered').length} card(s)</span>
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-faint">
                  Wants {offer.cards.filter((c) => c.side === 'requested').length} from {offer.toUsername}
                  {' · '}
                  {new Date(offer.createdAt).toLocaleDateString()}
                </p>
              </div>

              {offer.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => void respond(offer.id, 'rejected')}
                    className="cursor-pointer border border-edge px-3 py-1.5 font-mono text-[10px] tracking-wider text-dim transition-colors hover:text-parchment"
                  >
                    REJECT
                  </button>
                  <button
                    onClick={() => void respond(offer.id, 'accepted')}
                    className="cursor-pointer border border-gold/40 bg-gold/10 px-3 py-1.5 font-mono text-[10px] tracking-wider text-gold transition-colors hover:bg-gold/20"
                  >
                    ACCEPT
                  </button>
                </div>
              )}
            </div>

            {offer.message && (
              <p className="mt-3 border-l-2 border-edge pl-3 text-xs text-dim">{offer.message}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-1">
              {offer.cards.map((card) => (
                <span
                  key={`${offer.id}-${card.id}-${card.side}`}
                  className={`px-2 py-0.5 font-mono text-[10px] ${
                    card.side === 'offered'
                      ? 'bg-teal/10 text-teal'
                      : 'bg-gold/8 text-gold-dim'
                  }`}
                >
                  {card.side === 'offered' ? '→' : '←'} {card.itemName} #{card.editionNumber}
                  {card.isShiny && ' ✦'}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
