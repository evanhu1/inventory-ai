import { FormEvent, useEffect, useState } from 'react'
import { CardTile } from '../components/CardTile'
import { useInventoryAuth } from '../lib/auth'
import { api } from '../lib/api'
import type { BootstrapPayload, InventoryPayload } from '../lib/types'

type InventoryPageProps = {
  bootstrap: BootstrapPayload | null
  refreshBootstrap: () => Promise<void>
}

export function InventoryPage({ bootstrap, refreshBootstrap }: InventoryPageProps) {
  const auth = useInventoryAuth()
  const [inventory, setInventory] = useState<InventoryPayload | null>(null)
  const [profileUsername, setProfileUsername] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [craftWord, setCraftWord] = useState('')
  const [fusionWord, setFusionWord] = useState('')
  const [selectedFuseCards, setSelectedFuseCards] = useState<string[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!bootstrap?.me?.username) {
        setInventory(null)
        return
      }

      try {
        const nextInventory = await api.inventory(bootstrap.me.username)
        setInventory(nextInventory)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load inventory')
      }
    }

    void load()
  }, [bootstrap?.me?.username])

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setStatus('Creating collector profile…')
    try {
      await api.createProfile({ username: profileUsername, referralCode }, auth.getToken)
      await refreshBootstrap()
      setStatus('Profile saved.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Profile setup failed')
      setStatus(null)
    }
  }

  async function handleCraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setStatus('Crafting new artifact…')
    try {
      const response = await api.craft(craftWord, auth.getToken)
      setInventory(response.inventory)
      setCraftWord('')
      setStatus('Card crafted.')
      await refreshBootstrap()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Crafting failed')
      setStatus(null)
    }
  }

  async function handleFusion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setStatus('Binding selected cards…')
    try {
      const response = await api.fuse(fusionWord, selectedFuseCards, auth.getToken)
      setInventory(response.inventory)
      setFusionWord('')
      setSelectedFuseCards([])
      setStatus('Fusion completed.')
      await refreshBootstrap()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Fusion failed')
      setStatus(null)
    }
  }

  function toggleCard(cardId: string) {
    setSelectedFuseCards((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : current.length < 3 ? [...current, cardId] : current,
    )
  }

  if (!auth.clerkAvailable) {
    return <div className="rounded-[28px] border border-white/10 bg-slate-950/60 p-8 text-slate-300">Clerk is not configured. Add Clerk keys to enable collector accounts.</div>
  }

  if (!auth.isSignedIn) {
    return <div className="rounded-[28px] border border-white/10 bg-slate-950/60 p-8 text-slate-300">Sign in with Google to claim a username, craft your starter shiny, and manage trades.</div>
  }

  return (
    <div className="space-y-6">
      {!bootstrap?.me ? (
        <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-8">
          <h1 className="font-serif text-3xl text-white">Claim your collector identity</h1>
          <p className="mt-3 max-w-2xl text-slate-300">Choose a unique username. Every craft, trade, and duel win will attach to it.</p>
          <form className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleProfileSubmit}>
            <input
              value={profileUsername}
              onChange={(event) => setProfileUsername(event.target.value)}
              placeholder="username"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            />
            <input
              value={referralCode}
              onChange={(event) => setReferralCode(event.target.value)}
              placeholder="referral code (optional)"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            />
            <button className="rounded-2xl bg-orange-400 px-5 py-3 font-medium text-slate-950">Create profile</button>
          </form>
          {status && <p className="mt-4 text-sm text-emerald-300">{status}</p>}
          {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
        </section>
      ) : (
        <>
          <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/60 p-8">
              <p className="text-sm uppercase tracking-[0.3em] text-orange-200">Collector Profile</p>
              <h1 className="mt-4 font-serif text-4xl text-white">@{bootstrap.me.username}</h1>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-sm text-slate-500">Cards held</p>
                  <p className="mt-1 text-3xl text-white">{inventory?.cards.length ?? bootstrap.me.inventoryCount}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-sm text-slate-500">Crafts left</p>
                  <p className="mt-1 text-3xl text-white">{inventory?.profile.craftsRemaining ?? bootstrap.me.craftsRemaining}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-sm text-slate-500">Referral code</p>
                  <p className="mt-1 text-xl text-white">{bootstrap.me.referralCode}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-orange-300/20 bg-gradient-to-br from-orange-400/15 to-transparent p-8">
              <h2 className="font-serif text-3xl text-white">Craft your next card</h2>
              <p className="mt-3 text-slate-300">Use a single real English word. First editions automatically become shiny.</p>
              <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={handleCraft}>
                <input
                  value={craftWord}
                  onChange={(event) => setCraftWord(event.target.value)}
                  placeholder="type one word"
                  className="flex-1 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
                <button className="rounded-2xl bg-orange-400 px-5 py-3 font-medium text-slate-950">Craft</button>
              </form>
              {status && <p className="mt-4 text-sm text-emerald-300">{status}</p>}
              {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-3xl text-white">Fusion Forge</h2>
                <p className="mt-2 text-slate-300">Choose 2-3 cards you own. The originals will be destroyed when the new fusion card is minted.</p>
              </div>
              <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleFusion}>
                <input
                  value={fusionWord}
                  onChange={(event) => setFusionWord(event.target.value)}
                  placeholder="new fused word"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
                <button className="rounded-2xl border border-orange-300/40 bg-orange-400/20 px-5 py-3 text-orange-100">Fuse selected</button>
              </form>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {inventory?.cards.map((card) => (
                <CardTile key={card.id} card={card} selectable selected={selectedFuseCards.includes(card.id)} onToggle={toggleCard} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
