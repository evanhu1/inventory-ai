import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import '../src/index.css'

export const metadata: Metadata = {
  title: 'Inventory.ai',
  description: 'Collectible social game for crafting, trading, and dueling word-based artifacts.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
