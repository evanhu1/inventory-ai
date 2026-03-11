'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import type { PropsWithChildren } from 'react'
import { useInventoryAuth } from '@/lib/auth'

const navItems = [
  { href: '/', label: 'Forge', icon: '◇' },
  { href: '/inventory', label: 'Inventory', icon: '▦' },
  { href: '/arena', label: 'Arena', icon: '⚔' },
  { href: '/trades', label: 'Trades', icon: '⇄' },
  { href: '/leaderboard', label: 'Ranks', icon: '★' },
]

export function Shell({ children }: PropsWithChildren) {
  const auth = useInventoryAuth()
  const pathname = usePathname()

  return (
    <div className="min-h-screen text-parchment">
      <header className="sticky top-0 z-30 border-b border-edge bg-base/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="font-display text-lg tracking-widest text-gold">
            INVENTORY
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs tracking-wider transition-colors ${
                    active
                      ? 'bg-gold/10 text-gold'
                      : 'text-dim hover:text-parchment'
                  }`}
                >
                  <span className="text-[10px]">{item.icon}</span>
                  {item.label.toUpperCase()}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-3">
            {auth.clerkAvailable ? (
              <>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="cursor-pointer font-mono text-xs tracking-wider text-gold transition-colors hover:text-gold-light">
                      SIGN IN
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </>
            ) : (
              <span className="font-mono text-[10px] text-faint">NO AUTH</span>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="flex items-center justify-around border-t border-edge md:hidden">
          {navItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-center font-mono text-[10px] tracking-wider transition-colors ${
                  active ? 'text-gold' : 'text-dim'
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                {item.label.toUpperCase()}
              </Link>
            )
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}
