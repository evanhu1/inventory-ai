'use client'

import { FormEvent, useEffect, useState } from 'react'
import { CardTile } from '@/components/CardTile'
import { useInventoryAuth } from '@/lib/auth'
import { useBootstrap } from '@/lib/bootstrap'
import { api } from '@/lib/api'
import type { InventoryPayload } from '@/lib/types'

type PublicInventoryPageProps = {
  username: string
}

export function PublicInventoryPage({ username }: PublicInventoryPageProps) {
  const auth = useInventoryAuth()
  const { bootstrap } = useBootstrap()
  const [inventory, setInventory] = useState<InventoryPayload | null>(null)
  const [myInventory, setMyInventory] = useState<InventoryPayload | null>(null)
  const [selectedOfferedCards, setSelectedOfferedCards] = useState<number[]>([])
  const [selectedRequestedCards, setSelectedRequestedCards] = useState<number[]>([])
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setInventory(await api.inventory(username))
        if (bootstrap?.viewer?.username) {
          setMyInventory(await api.inventory(bootstrap.viewer.username))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load inventory')
      }
    }
    void load()
  }, [bootstrap?.viewer?.username, username])

  function toggleOffered(cardId: number) {
    setSelectedOfferedCards((cur) =>
      cur.includes(cardId) ? cur.filter((id) => id !== cardId) : [...cur, cardId],
    )
  }

  function toggleRequested(cardId: number) {
    setSelectedRequestedCards((cur) =>
      cur.includes(cardId) ? cur.filter((id) => id !== cardId) : [...cur, cardId],
    )
  }

  async function handleTrade(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setStatus('Sending offer...')
    try {
      await api.createTrade({
        targetUsername: username,
        offeredCardIds: selectedOfferedCards,
        requestedCardIds: selectedRequestedCards,
        message,
      })
      setSelectedOfferedCards([])
      setSelectedRequestedCards([])
      setMessage('')
      setStatus('Trade sent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trade failed')
      setStatus(null)
    }
  }

  const isOwnProfile = bootstrap?.viewer?.username === username

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="border border-edge bg-surface p-5">
        <p className="font-mono text-[10px] tracking-[0.3em] text-faint">COLLECTOR</p>
        <h1 className="mt-1 font-display text-2xl text-parchment">@{username}</h1>
        {inventory && (
          <div className="mt-3 flex gap-4 font-mono text-xs">
            <span className="text-dim">{inventory.cards.length} cards</span>
            <span className="text-dim">{inventory.cards.filter((c) => c.isShiny).length} shiny</span>
            <span className="text-faint">Joined {new Date(inventory.profile.joinedAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {error && <p className="font-mono text-xs text-red-400">{error}</p>}

      {/* Their cards */}
      <div>
        <p className="mb-3 font-mono text-[10px] tracking-[0.3em] text-dim">
          {auth.isSignedIn && !isOwnProfile ? 'SELECT CARDS TO REQUEST' : 'COLLECTION'}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 stagger">
          {inventory?.cards.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              selectable={auth.isSignedIn && !isOwnProfile}
              selected={selectedRequestedCards.includes(card.id)}
              onToggle={toggleRequested}
            />
          ))}
        </div>
      </div>

      {/* Trade form */}
      {auth.isSignedIn && !isOwnProfile && (
        <div className="border border-gold/20 bg-gold/5 p-5">
          <h2 className="font-display text-lg text-parchment">Propose a Trade</h2>
          <p className="mt-1 text-xs text-dim">
            Select their cards above, then your cards below. Leave your selection empty to send a gift.
          </p>

          <form onSubmit={handleTrade} className="mt-4 space-y-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note..."
              className="min-h-20 w-full border border-edge bg-base px-4 py-3 text-sm text-parchment outline-none placeholder:text-faint"
            />

            <div>
              <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-dim">YOUR CARDS TO OFFER</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {myInventory?.cards.map((card) => (
                  <CardTile
                    key={card.id}
                    card={card}
                    selectable
                    selected={selectedOfferedCards.includes(card.id)}
                    onToggle={toggleOffered}
                  />
                ))}
              </div>
            </div>

            <button className="cursor-pointer border border-gold/40 bg-gold/10 px-6 py-2 font-mono text-xs tracking-[0.2em] text-gold transition-colors hover:bg-gold/20">
              SEND OFFER
            </button>
            {status && <p className="font-mono text-xs text-teal">{status}</p>}
          </form>
        </div>
      )}
    </div>
  )
}
