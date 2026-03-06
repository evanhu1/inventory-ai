import { Link, NavLink, Outlet } from 'react-router-dom'
import { SignInButton, UserButton } from '@clerk/react'
import { useInventoryAuth } from '../lib/auth'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/inventory', label: 'My Inventory' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/trades', label: 'Trades' },
  { to: '/arena', label: 'Arena' },
]

export function Layout() {
  const auth = useInventoryAuth()

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#244769,transparent_35%),radial-gradient(circle_at_bottom,#68321f,transparent_25%),#08111d] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-20 rounded-full border border-white/10 bg-slate-950/70 px-5 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="font-serif text-2xl tracking-wide text-amber-100">
              Inventory.ai
            </Link>
            <nav className="hidden gap-1 md:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 text-sm transition ${isActive ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10'}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              {auth.clerkAvailable ? (
                <>
                  {!auth.isSignedIn ? (
                    <SignInButton mode="modal">
                      <button className="rounded-full bg-orange-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-orange-300">
                        Sign in with Google
                      </button>
                    </SignInButton>
                  ) : (
                    <UserButton />
                  )}
                </>
              ) : (
                <span className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300">
                  Clerk not configured
                </span>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
