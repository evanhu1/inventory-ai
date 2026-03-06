import type { ArenaPayload, BootstrapPayload, DuelPayload, InventoryPayload, LeaderboardEntry, TradeOffer } from './types'

type TokenProvider = (() => Promise<string | null>) | null

async function request<T>(path: string, init: RequestInit = {}, getToken: TokenProvider = null): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')

  if (getToken) {
    const token = await getToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(path, {
    ...init,
    headers,
  })

  const payload = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed')
  }

  return payload as T
}

export const api = {
  bootstrap: () => request<BootstrapPayload>('/api/bootstrap'),
  inventory: (username: string) => request<InventoryPayload>(`/api/inventories/${username}`),
  createProfile: (input: { username: string; referralCode?: string }, getToken: TokenProvider) =>
    request<{ username: string }>('/api/me/profile', { method: 'POST', body: JSON.stringify(input) }, getToken),
  craft: (word: string, getToken: TokenProvider) =>
    request<{ inventory: InventoryPayload }>('/api/craft', { method: 'POST', body: JSON.stringify({ word }) }, getToken),
  fuse: (word: string, cardIds: string[], getToken: TokenProvider) =>
    request<{ inventory: InventoryPayload }>('/api/fuse', { method: 'POST', body: JSON.stringify({ word, cardIds }) }, getToken),
  inbox: (getToken: TokenProvider) => request<{ offers: TradeOffer[] }>('/api/trades/inbox', {}, getToken),
  createTrade: (
    input: { toUsername: string; offeredCardIds: string[]; requestedCardIds: string[]; message?: string },
    getToken: TokenProvider,
  ) => request<{ id: string }>('/api/trades/offers', { method: 'POST', body: JSON.stringify(input) }, getToken),
  respondTrade: (id: string, action: 'accept' | 'reject', getToken: TokenProvider) =>
    request<{ status: string }>(`/api/trades/${id}/respond`, { method: 'POST', body: JSON.stringify({ action }) }, getToken),
  leaderboard: () => request<{ players: LeaderboardEntry[] }>('/api/leaderboard'),
  arena: () => request<ArenaPayload>('/api/arena'),
  duel: (selectedCardIds: string[], getToken: TokenProvider) =>
    request<DuelPayload>('/api/arena/duel', { method: 'POST', body: JSON.stringify({ selectedCardIds }) }, getToken),
}
