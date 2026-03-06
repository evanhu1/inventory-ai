import { Link } from 'react-router-dom'
import type { BootstrapPayload } from '../lib/types'

type HomePageProps = {
  data: BootstrapPayload | null
  loading: boolean
}

export function HomePage({ data, loading }: HomePageProps) {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/6 p-8 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-200">Collect. Fuse. Duel.</p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-none text-white sm:text-6xl">
            A social collectible game where every crafted word becomes a tradable artifact.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-300">
            Craft real words into one-of-a-kind cards, chase first-edition shinies, trade with other players, and bring the right tags into the daily arena.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/inventory" className="rounded-full bg-orange-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-orange-300">
              Start Your Inventory
            </Link>
            <Link to="/leaderboard" className="rounded-full border border-white/15 px-5 py-3 text-slate-100 transition hover:bg-white/8">
              View Leaderboard
            </Link>
          </div>
        </div>

        <div className="rounded-[32px] border border-orange-300/20 bg-gradient-to-br from-orange-400/15 to-transparent p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-orange-200">Today&apos;s Arena</p>
          <p className="mt-4 text-3xl font-semibold text-white">{data?.arena.title ?? 'Arena loading'}</p>
          <p className="mt-3 text-slate-300">A rotating ruleset rewards collectors who can field the right traits and word profiles.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-slate-500">Wanted traits</p>
              <p className="mt-1 text-2xl text-white">{data?.arena.wantedTraits.join(' / ') ?? '-'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-slate-500">Live cards</p>
              <p className="mt-1 text-2xl text-white">{data?.stats.live_cards ?? '-'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/55 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Collectors Leading</h2>
            <Link to="/leaderboard" className="text-sm text-orange-200">
              Full board
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {loading && <p className="text-slate-400">Loading leaderboard…</p>}
            {data?.leaderboardPreview.map((entry) => (
              <div key={entry.username} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Rank {entry.rank}</p>
                  <Link to={`/u/${entry.username}`} className="mt-1 block text-lg text-white">
                    {entry.username}
                  </Link>
                </div>
                <div className="text-right">
                  <p className="text-2xl text-orange-200">{entry.itemCount}</p>
                  <p className="text-sm text-slate-400">cards held</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-950/55 p-6">
          <h2 className="font-serif text-2xl">Recent Crafts</h2>
          <div className="mt-5 space-y-3">
            {loading && <p className="text-slate-400">Loading recent crafts…</p>}
            {data?.recentDrops.map((entry) => (
              <div key={`${entry.owner}-${entry.craftedAt}-${entry.itemName}`} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                <p className="text-lg text-white">
                  {entry.itemName} <span className="text-slate-500">#{entry.editionNumber}</span>
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Crafted by <Link to={`/u/${entry.owner}`} className="text-orange-200">{entry.owner}</Link> on{' '}
                  {new Date(entry.craftedAt).toLocaleDateString()}
                  {entry.isShiny ? ' as the shiny first edition' : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
