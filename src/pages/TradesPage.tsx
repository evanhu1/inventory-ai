import { useEffect, useState } from 'react'
import { useInventoryAuth } from '../lib/auth'
import { api } from '../lib/api'
import type { TradeOffer } from '../lib/types'

export function TradesPage() {
  const auth = useInventoryAuth()
  const [offers, setOffers] = useState<TradeOffer[]>([])
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      const response = await api.inbox(auth.getToken)
      setOffers(response.offers)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load trades')
    }
  }

  useEffect(() => {
    if (!auth.isSignedIn) return

    let cancelled = false
    void api
      .inbox(auth.getToken)
      .then((response) => {
        if (!cancelled) {
          setOffers(response.offers)
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load trades')
        }
      })

    return () => {
      cancelled = true
    }
  }, [auth.getToken, auth.isSignedIn])

  async function respond(id: string, action: 'accept' | 'reject') {
    setError(null)
    try {
      await api.respondTrade(id, action, auth.getToken)
      await load()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to update trade')
    }
  }

  if (!auth.isSignedIn) {
    return <div className="rounded-[28px] border border-white/10 bg-slate-950/60 p-8 text-slate-300">Sign in to manage inbound and outbound offers.</div>
  }

  return (
    <section className="rounded-[32px] border border-white/10 bg-slate-950/60 p-8">
      <h1 className="font-serif text-4xl text-white">Trades</h1>
      <p className="mt-3 text-slate-300">Direct offers support many-for-one swaps and gifts. Pending requests can be accepted or rejected here.</p>
      {error && <p className="mt-4 text-rose-300">{error}</p>}
      <div className="mt-8 space-y-4">
        {offers.map((offer) => (
          <div key={offer.id} className="rounded-[24px] border border-white/8 bg-white/4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{offer.status}</p>
                <p className="mt-1 text-xl text-white">
                  {offer.fromUsername} {offer.isGift ? 'gifted' : 'offered'} {offer.offeredCardIds.length} card(s)
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Wants {offer.requestedCardIds.length} card(s) from {offer.toUsername}. Sent {new Date(offer.createdAt).toLocaleString()}.
                </p>
              </div>
              {offer.status === 'pending' && (
                <div className="flex gap-3">
                  <button className="rounded-2xl border border-white/10 px-4 py-2 text-white" onClick={() => void respond(offer.id, 'reject')}>
                    Reject
                  </button>
                  <button className="rounded-2xl bg-orange-400 px-4 py-2 font-medium text-slate-950" onClick={() => void respond(offer.id, 'accept')}>
                    Accept
                  </button>
                </div>
              )}
            </div>
            {offer.message && <p className="mt-4 rounded-2xl border border-white/8 bg-slate-950/50 px-4 py-3 text-slate-300">{offer.message}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}
