import { useEffect, useState } from 'react'
import { CardTile } from '../components/CardTile'
import { useInventoryAuth } from '../lib/auth'
import { api } from '../lib/api'
import type { ArenaResponse, DuelResponse } from '../lib/types'

export function ArenaPage() {
  const auth = useInventoryAuth()
  const [arenaData, setArenaData] = useState<ArenaResponse | null>(null)
  const [duelResult, setDuelResult] = useState<DuelResponse | null>(null)
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void api
      .arena(auth.getToken)
      .then((response) => setArenaData(response))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load arena'))
  }, [auth.getToken])

  function toggleCard(cardId: number) {
    setSelectedCardIds((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : current.length < 3 ? [...current, cardId] : current,
    )
  }

  async function runDuel() {
    setError(null)
    try {
      setDuelResult(await api.duel(selectedCardIds, auth.getToken))
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Duel failed')
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-orange-300/20 bg-gradient-to-br from-orange-400/18 to-transparent p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-orange-200">Daily Arena Contract</p>
        <h1 className="mt-4 font-serif text-4xl text-white">{arenaData?.arena.title ?? 'Arena loading'}</h1>
        <p className="mt-3 max-w-3xl text-slate-200">The arena rewards the right traits, longer names, and a well-timed shiny anchor.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
            <p className="text-sm text-slate-500">Wanted traits</p>
            <p className="mt-1 text-2xl text-white">{arenaData?.arena.wantedTraits.join(' / ') ?? '-'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
            <p className="text-sm text-slate-500">Modifiers</p>
            <p className="mt-1 text-sm text-white">{arenaData?.arena.modifiers[0] ?? '-'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
            <p className="text-sm text-slate-500">Reset date</p>
            <p className="mt-1 text-2xl text-white">{arenaData?.arena.date ?? '-'}</p>
          </div>
        </div>
      </section>

      {auth.isSignedIn ? (
        <section className="rounded-[32px] border border-white/10 bg-slate-950/60 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl text-white">Select your lineup</h2>
              <p className="mt-2 text-slate-300">Pick exactly three cards. Matching traits, perfect word length, shinies, and fusions all increase score.</p>
            </div>
            <button className="rounded-2xl bg-orange-400 px-5 py-3 font-medium text-slate-950" onClick={() => void runDuel()}>
              Duel Sentinel
            </button>
          </div>
          {error && <p className="mt-4 text-rose-300">{error}</p>}
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {arenaData?.cards.map((card) => (
              <CardTile key={card.id} card={card} selectable selected={selectedCardIds.includes(card.id)} onToggle={toggleCard} />
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-[28px] border border-white/10 bg-slate-950/60 p-8 text-slate-300">Sign in to enter your cards into the arena.</div>
      )}

      {duelResult && (
        <section className="rounded-[32px] border border-white/10 bg-slate-950/60 p-8">
          <h2 className="font-serif text-3xl text-white">Duel Result: {duelResult.verdict}</h2>
          <p className="mt-2 text-slate-300">You scored {duelResult.score} against a target of {duelResult.threshold}.</p>
          <p className="mt-6 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-slate-200">{duelResult.summary}</p>
        </section>
      )}
    </div>
  )
}
