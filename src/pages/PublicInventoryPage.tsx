import { FormEvent, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CardTile } from '../components/CardTile'
import { useInventoryAuth } from '../lib/auth'
import { api } from '../lib/api'
import type { BootstrapPayload, InventoryPayload } from '../lib/types'

type PublicInventoryPageProps = {
  bootstrap: BootstrapPayload | null
}

export function PublicInventoryPage({ bootstrap }: PublicInventoryPageProps) {
  const { username = '' } = useParams()
  const auth = useInventoryAuth()
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
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load inventory')
      }
    }

    void load()
  }, [bootstrap?.viewer?.username, username])

  function toggleOffered(cardId: number) {
    setSelectedOfferedCards((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId],
    )
  }

  function toggleRequested(cardId: number) {
    setSelectedRequestedCards((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId],
    )
  }

  async function handleTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setStatus('Sending offer…')
    try {
      await api.createTrade(
        {
          targetUsername: username,
          offeredCardIds: selectedOfferedCards,
          requestedCardIds: selectedRequestedCards,
          message,
        },
        auth.getToken,
      )
      setSelectedOfferedCards([])
      setSelectedRequestedCards([])
      setMessage('')
      setStatus('Trade sent.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Trade failed')
      setStatus(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-8">
        <h1 className="font-serif text-4xl text-white">@{username}</h1>
        <p className="mt-3 text-slate-300">Browse any collector anonymously. Sign in to send trade offers or gifts.</p>
      </section>

      {error && <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-rose-200">{error}</div>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {inventory?.cards.map((card) => (
          <CardTile key={card.id} card={card} selectable={auth.isSignedIn} selected={selectedRequestedCards.includes(card.id)} onToggle={toggleRequested} />
        ))}
      </section>

      {auth.isSignedIn && bootstrap?.viewer && bootstrap.viewer.username !== username && (
        <section className="rounded-[28px] border border-orange-300/20 bg-white/6 p-8">
          <h2 className="font-serif text-3xl text-white">Propose a Trade</h2>
          <p className="mt-3 text-slate-300">Select their cards above, then choose what you want to offer from your own vault below. Leave requested cards empty to send a gift.</p>
          <form className="mt-6 space-y-5" onSubmit={handleTrade}>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Add a note to the offer"
              className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {myInventory?.cards.map((card) => (
                <CardTile key={card.id} card={card} selectable selected={selectedOfferedCards.includes(card.id)} onToggle={toggleOffered} />
              ))}
            </div>
            <button className="rounded-2xl bg-orange-400 px-5 py-3 font-medium text-slate-950">Send offer</button>
            {status && <p className="text-sm text-emerald-300">{status}</p>}
          </form>
        </section>
      )}
    </div>
  )
}
