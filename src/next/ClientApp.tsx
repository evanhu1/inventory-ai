'use client'

import { AppProviders } from '../lib/AppProviders'
import App from '../App'

export default function ClientApp() {
  return (
    <AppProviders>
      <App />
    </AppProviders>
  )
}
