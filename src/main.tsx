import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import App from './App.tsx'
import { AppProviders } from './lib/AppProviders.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider afterSignOutUrl="/">
      <AppProviders>
        <App />
      </AppProviders>
    </ClerkProvider>
  </StrictMode>,
)
