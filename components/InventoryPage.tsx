'use client'

import { FormEvent, useEffect, useState } from 'react'
import { CardTile } from '@/components/CardTile'
import { useInventoryAuth } from '@/lib/auth'
import { useBootstrap } from '@/lib/bootstrap'
import { api } from '@/lib/api'
import type { Card, InventoryPayload } from '@/lib/types'

type Tab = 'collection' | 'craft' | 'fuse'

export function InventoryPage() {
  const auth = useInventoryAuth()
  const { bootstrap, refreshBootstrap } = useBootstrap()
  const [inventory, setInventory] = useState<InventoryPayload | null>(null)
  const [tab, setTab] = useState<Tab>('collection')
  const [craftWord, setCraftWord] = useState('')
  const [selectedFuseCards, setSelectedFuseCards] = useState<number[]>([])
  const [forging, setForging] = useState(false)
  const [forgedCard, setForgedCard] = useState<Card | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!bootstrap?.viewer?.username) {
      setInventory(null)
      return
    }
    void api.inventory(bootstrap.viewer.username).then(setInventory).catch((err) => {
      setError(err instanceof Error ? err.message : 'Unable to load inventory')
    })
  }, [bootstrap?.viewer?.username])

  async function refreshInventory() {
    if (!bootstrap?.viewer?.username) return
    setInventory(await api.inventory(bootstrap.viewer.username))
  }

  async function handleCraft(e: FormEvent) {
    e.preventDefault()
    if (!craftWord.trim()) return
    setError(null)
    setForgedCard(null)
    setForging(true)
    try {
      const result = await api.craft(craftWord.trim())
      setForgedCard(result.card)
      setCraftWord('')
      await refreshInventory()
      await refreshBootstrap()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Crafting failed')
    } finally {
      setForging(false)
    }
  }

  async function handleFusion(e: FormEvent) {
    e.preventDefault()
    if (selectedFuseCards.length < 2) return
    setError(null)
    setForgedCard(null)
    setStatus('Channeling fusion...')
    try {
      const result = await api.fuse(selectedFuseCards)
      setForgedCard(result.card)
      setSelectedFuseCards([])
      setStatus(null)
      await refreshInventory()
      await refreshBootstrap()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fusion failed')
      setStatus(null)
    }
  }

  function toggleFuseCard(cardId: number) {
    setSelectedFuseCards((cur) =>
      cur.includes(cardId)
        ? cur.filter((id) => id !== cardId)
        : cur.length < 3 ? [...cur, cardId] : cur,
    )
  }

  if (!auth.clerkAvailable) {
    return (
      <div className="border border-edge bg-surface p-8 text-center text-dim">
        Authentication is not configured.
      </div>
    )
  }

  if (!auth.isSignedIn) {
    return (
      <div className="flex flex-col items-center gap-4 border border-edge bg-surface py-16 text-center">
        <p className="font-display text-xl text-parchment">Sign in to access your inventory</p>
        <p className="text-sm text-dim">Forge cards, fuse them, and manage your collection.</p>
      </div>
    )
  }

  if (!bootstrap?.viewer) {
    return (
      <div className="border border-edge bg-surface p-8 text-center text-dim">
        Loading your profile...
      </div>
    )
  }

  const cards = inventory?.cards ?? []

  return (
    <div className="space-y-6">
      {/* Stats HUD */}
      <div className="grid grid-cols-2 gap-px bg-edge sm:grid-cols-4">
        <div className="bg-surface px-4 py-3">
          <p className="font-mono text-[10px] tracking-[0.2em] text-faint">COLLECTOR</p>
          <p className="mt-1 font-display text-lg text-gold">@{bootstrap.viewer.username}</p>
        </div>
        <div className="bg-surface px-4 py-3">
          <p className="font-mono text-[10px] tracking-[0.2em] text-faint">CARDS HELD</p>
          <p className="mt-1 font-mono text-2xl text-parchment">{cards.length}</p>
        </div>
        <div className="bg-surface px-4 py-3">
          <p className="font-mono text-[10px] tracking-[0.2em] text-faint">FORGES LEFT</p>
          <p className="mt-1 font-mono text-2xl text-parchment">{inventory?.profile.craftsRemaining ?? bootstrap.viewer.craftsRemaining}</p>
        </div>
        <div className="bg-surface px-4 py-3">
          <p className="font-mono text-[10px] tracking-[0.2em] text-faint">REFERRAL</p>
          <p className="mt-1 font-mono text-sm text-dim">{bootstrap.viewer.referralCode}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-px bg-edge">
        {(['collection', 'craft', 'fuse'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(null); setForgedCard(null); }}
            className={`flex-1 cursor-pointer py-2.5 text-center font-mono text-xs tracking-[0.2em] transition-colors ${
              tab === t
                ? t === 'fuse' ? 'bg-mystic/10 text-mystic-light' : 'bg-gold/10 text-gold'
                : 'bg-surface text-dim hover:text-parchment'
            }`}
          >
            {t === 'collection' && '▦ COLLECTION'}
            {t === 'craft' && '◇ FORGE'}
            {t === 'fuse' && '✦ FUSE'}
          </button>
        ))}
      </div>

      {error && <p className="font-mono text-xs text-red-400">{error}</p>}

      {/* Collection tab */}
      {tab === 'collection' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 stagger">
          {cards.length === 0 && (
            <p className="col-span-full py-12 text-center text-dim">
              Your inventory is empty. Forge your first card.
            </p>
          )}
          {cards.map((card) => (
            <CardTile key={card.id} card={card} />
          ))}
        </div>
      )}

      {/* Craft tab */}
      {tab === 'craft' && (
        <div className="flex flex-col items-center py-8">
          <p className="font-mono text-[10px] tracking-[0.3em] text-dim">ENTER A WORD TO FORGE</p>
          <form onSubmit={handleCraft} className="mt-6 flex w-full max-w-md flex-col gap-3">
            <input
              value={craftWord}
              onChange={(e) => setCraftWord(e.target.value)}
              placeholder="type one word"
              disabled={forging}
              className={`w-full border bg-base px-5 py-4 text-center font-display text-xl tracking-wide text-parchment outline-none placeholder:text-faint ${
                craftWord.trim() ? 'animate-forge-pulse border-gold/30' : 'border-edge'
              }`}
            />
            <button
              type="submit"
              disabled={forging || !craftWord.trim()}
              className="cursor-pointer border border-gold/40 bg-gold/10 py-3 font-mono text-xs tracking-[0.3em] text-gold transition-colors hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {forging ? 'FORGING...' : 'FORGE'}
            </button>
          </form>

          {forgedCard && (
            <div className="mt-8 w-full max-w-sm">
              <p className="mb-3 text-center font-mono text-[10px] tracking-[0.3em] text-gold">CARD FORGED</p>
              <CardTile card={forgedCard} reveal />
            </div>
          )}
        </div>
      )}

      {/* Fuse tab */}
      {tab === 'fuse' && (
        <div className="space-y-5">
          <div className="border border-mystic/20 bg-mystic/5 p-5 text-center animate-mystic-glow">
            <p className="font-display text-lg text-mystic-light">Arcane Fusion</p>
            <p className="mt-2 text-xs text-dim">
              Select 2-3 cards to fuse. The originals are consumed. A new, more powerful card emerges.
            </p>
            <div className="mt-3 flex items-center justify-center gap-3 font-mono text-xs text-mystic-light">
              <span>{selectedFuseCards.length}/3 selected</span>
              {selectedFuseCards.length >= 2 && (
                <form onSubmit={handleFusion}>
                  <button className="cursor-pointer border border-mystic/40 bg-mystic/10 px-5 py-2 tracking-[0.2em] text-mystic-light transition-colors hover:bg-mystic/20">
                    FUSE
                  </button>
                </form>
              )}
            </div>
            {status && <p className="mt-2 font-mono text-xs text-mystic-light">{status}</p>}
          </div>

          {forgedCard && (
            <div className="mx-auto max-w-sm">
              <p className="mb-3 text-center font-mono text-[10px] tracking-[0.3em] text-mystic-light">FUSION COMPLETE</p>
              <CardTile card={forgedCard} reveal />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 stagger">
            {cards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                selectable
                selected={selectedFuseCards.includes(card.id)}
                onToggle={toggleFuseCard}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
