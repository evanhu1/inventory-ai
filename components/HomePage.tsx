'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { SignInButton, SignedOut } from '@clerk/nextjs'
import { CardTile } from '@/components/CardTile'
import { useInventoryAuth } from '@/lib/auth'
import { useBootstrap } from '@/lib/bootstrap'
import { api } from '@/lib/api'
import type { Card } from '@/lib/types'

export function HomePage() {
  const auth = useInventoryAuth()
  const { bootstrap, loading, refreshBootstrap } = useBootstrap()
  const [word, setWord] = useState('')
  const [forging, setForging] = useState(false)
  const [forgedCard, setForgedCard] = useState<Card | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Profile setup state
  const [showProfileSetup, setShowProfileSetup] = useState(false)
  const [profileUsername, setProfileUsername] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [profileStatus, setProfileStatus] = useState<string | null>(null)

  async function handleForge(e: FormEvent) {
    e.preventDefault()
    if (!word.trim()) return
    setError(null)
    setForgedCard(null)

    if (!auth.isSignedIn) {
      setError('sign-in-required')
      return
    }

    if (!bootstrap?.viewer) {
      setShowProfileSetup(true)
      return
    }

    setForging(true)
    try {
      const result = await api.craft(word.trim())
      setForgedCard(result.card)
      setWord('')
      await refreshBootstrap()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Forging failed')
    } finally {
      setForging(false)
    }
  }

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setProfileStatus('Creating profile...')
    try {
      await api.createProfile({ username: profileUsername, referralCode })
      await refreshBootstrap()
      setShowProfileSetup(false)
      setProfileStatus(null)
      // Now auto-forge
      if (word.trim()) {
        setForging(true)
        try {
          const result = await api.craft(word.trim())
          setForgedCard(result.card)
          setWord('')
          await refreshBootstrap()
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Forging failed')
        } finally {
          setForging(false)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profile creation failed')
      setProfileStatus(null)
    }
  }

  return (
    <div className="space-y-10">
      {/* Forge section */}
      <section className="flex flex-col items-center pt-8 sm:pt-14">
        <p className="font-mono text-[10px] tracking-[0.4em] text-dim">
          ENTER A WORD TO FORGE
        </p>

        <form onSubmit={handleForge} className="mt-6 flex w-full max-w-lg flex-col items-center gap-4">
          <div className={`relative w-full ${forging ? 'animate-forging' : ''}`}>
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="type one word"
              disabled={forging}
              className={`w-full border bg-surface px-6 py-4 text-center font-display text-2xl tracking-wide text-parchment outline-none placeholder:text-faint transition-all ${
                word.trim()
                  ? 'animate-forge-pulse border-gold/30'
                  : 'border-edge'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={forging || !word.trim()}
            className="w-full cursor-pointer border border-gold/40 bg-gold/10 px-8 py-3 font-mono text-sm tracking-[0.3em] text-gold transition-all hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {forging ? 'FORGING...' : 'FORGE'}
          </button>
        </form>

        {/* Sign-in prompt */}
        {error === 'sign-in-required' && auth.clerkAvailable && (
          <div className="mt-6 flex flex-col items-center gap-3 border border-gold/20 bg-surface p-6 text-center">
            <p className="font-mono text-xs text-dim">SIGN IN TO FORGE & CLAIM YOUR CARD</p>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="cursor-pointer border border-gold/40 bg-gold/10 px-6 py-2 font-mono text-xs tracking-[0.2em] text-gold transition-colors hover:bg-gold/20">
                  SIGN IN
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        )}

        {/* Profile setup */}
        {showProfileSetup && (
          <div className="mt-6 w-full max-w-lg border border-gold/20 bg-surface p-6">
            <p className="text-center font-display text-lg text-parchment">Claim your identity</p>
            <p className="mt-2 text-center text-xs text-dim">
              Choose a username to start forging cards.
            </p>
            <form onSubmit={handleProfileSubmit} className="mt-4 space-y-3">
              <input
                value={profileUsername}
                onChange={(e) => setProfileUsername(e.target.value)}
                placeholder="username"
                className="w-full border border-edge bg-base px-4 py-3 text-parchment outline-none placeholder:text-faint"
              />
              <input
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="referral code (optional)"
                className="w-full border border-edge bg-base px-4 py-3 text-parchment outline-none placeholder:text-faint"
              />
              <button className="w-full cursor-pointer border border-gold/40 bg-gold/10 px-6 py-3 font-mono text-xs tracking-[0.2em] text-gold transition-colors hover:bg-gold/20">
                CREATE PROFILE
              </button>
              {profileStatus && <p className="text-center text-xs text-teal">{profileStatus}</p>}
            </form>
          </div>
        )}

        {/* Error */}
        {error && error !== 'sign-in-required' && (
          <p className="mt-4 font-mono text-xs text-red-400">{error}</p>
        )}

        {/* Forged card result */}
        {forgedCard && (
          <div className="mt-8 w-full max-w-sm">
            <p className="mb-3 text-center font-mono text-[10px] tracking-[0.3em] text-gold">
              CARD FORGED
            </p>
            <CardTile card={forgedCard} reveal />
          </div>
        )}

        {/* Crafts remaining */}
        {bootstrap?.viewer && (
          <p className="mt-6 font-mono text-[10px] tracking-wider text-faint">
            {bootstrap.viewer.craftsRemaining} FORGES REMAINING
          </p>
        )}
      </section>

      {/* Recent activity */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="border border-edge bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-[10px] tracking-[0.3em] text-dim">RECENT FORGES</h2>
            <Link href="/leaderboard" className="font-mono text-[10px] tracking-wider text-gold">
              VIEW ALL
            </Link>
          </div>
          <div className="mt-4 space-y-2 stagger">
            {loading && <p className="font-mono text-xs text-faint">Loading...</p>}
            {bootstrap?.recentDrops.map((entry) => (
              <div
                key={`${entry.owner}-${entry.craftedAt}-${entry.itemName}`}
                className="flex items-center justify-between border-b border-edge py-2 last:border-0"
              >
                <div>
                  <span className="font-display text-sm text-parchment">{entry.itemName}</span>
                  <span className="ml-2 font-mono text-[10px] text-faint">#{entry.editionNumber}</span>
                  {entry.isShiny && <span className="ml-2 font-mono text-[10px] text-shiny">SHINY</span>}
                </div>
                <Link href={`/u/${entry.owner}`} className="font-mono text-[10px] text-dim hover:text-gold">
                  {entry.owner}
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-edge bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-[10px] tracking-[0.3em] text-dim">TODAY&apos;S ARENA</h2>
            <Link href="/arena" className="font-mono text-[10px] tracking-wider text-gold">
              ENTER
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            <p className="font-display text-xl text-parchment">
              {bootstrap?.arena.title ?? 'Loading...'}
            </p>
            <div className="flex flex-wrap gap-2">
              {bootstrap?.arena.wantedTraits.map((trait) => (
                <span key={trait} className="bg-gold/8 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-gold-dim">
                  {trait}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 border-t border-edge pt-3">
              <div>
                <p className="font-mono text-[10px] text-faint">COLLECTORS</p>
                <p className="font-mono text-lg text-parchment">{bootstrap?.stats.collectors ?? '-'}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-faint">LIVE CARDS</p>
                <p className="font-mono text-lg text-parchment">{bootstrap?.stats.live_cards ?? '-'}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-faint">TRADES</p>
                <p className="font-mono text-lg text-parchment">{bootstrap?.stats.trades_completed ?? '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
