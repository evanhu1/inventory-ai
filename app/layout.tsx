import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import '@/app/globals.css'
import { Shell } from '@/components/Shell'
import { AppProviders } from '@/lib/providers'
import { BootstrapProvider } from '@/lib/bootstrap'

export const metadata: Metadata = {
  title: 'Inventory.ai',
  description: 'Forge unique trading cards from words. Fuse, trade, and duel.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en">
        <body>
          <AppProviders>
            <BootstrapProvider>
              <Shell>{children}</Shell>
            </BootstrapProvider>
          </AppProviders>
        </body>
      </html>
    </ClerkProvider>
  )
}
