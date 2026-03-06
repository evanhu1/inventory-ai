import { useEffect, useState } from 'react'
import { CardTile } from '../components/CardTile'
import { useInventoryAuth } from '../lib/auth'
import { api } from '../lib/api'
import type { ArenaPayload, DuelPayload } from '../lib/types'

export function ArenaPage() {
  const auth = useInventoryAuth()
  const [arena, setArena] = useState<ArenaPayload | null>(null)
  const [duelResult, setDuelResult] = useState<DuelPayload | null>(null)
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void api
      .arena()
      .then((response) => setArena(response))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load arena'))
  }, [])

  function toggleCard(cardId: string) {
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
        <h1 className="mt-4 font-serif text-4xl text-white">{arena?.primaryTrait ?? 'arcane'} Dominion</h1>
        <p className="mt-3 max-w-3xl text-slate-200">{arena?.summary}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
            <p className="text-sm text-slate-500">Secondary trait</p>
            <p className="mt-1 text-2xl text-white">{arena?.secondaryTrait ?? '-'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
            <p className="text-sm text-slate-500">Letter bonus</p>
            <p className="mt-1 text-2xl text-white">{arena?.targetLength ?? '-'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
            <p className="text-sm text-slate-500">Sentinel score</p>
            <p className="mt-1 text-2xl text-white">{arena?.sentinelScore ?? '-'}</p>
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
            {arena?.myCards?.map((card) => (
              <CardTile key={card.id} card={card} selectable selected={selectedCardIds.includes(card.id)} onToggle={toggleCard} />
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-[28px] border border-white/10 bg-slate-950/60 p-8 text-slate-300">Sign in to enter your cards into the arena.</div>
      )}

      {duelResult && (
        <section className="rounded-[32px] border border-white/10 bg-slate-950/60 p-8">
          <h2 className="font-serif text-3xl text-white">Duel Result: {duelResult.result}</h2>
          <p className="mt-2 text-slate-300">
            You scored {duelResult.totalScore} against a target of {duelResult.targetScore}.
          </p>
          <div className="mt-6 space-y-3">
            {duelResult.cardBreakdown.map((entry) => (
              <div key={entry.card.id} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                <div>
                  <p className="text-lg text-white">{entry.card.word}</p>
                  <p className="text-sm text-slate-400">{entry.card.tags.join(' • ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl text-orange-200">{entry.score}</p>
                  <p className="text-sm text-slate-400">bonus +{entry.bonus}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
