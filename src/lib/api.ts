import type { ArenaResponse, BootstrapPayload, DuelResponse, InventoryPayload, LeaderboardEntry, TradeOffer } from './types'

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
    request<{ username: string; craftsRemaining: number; referralCode: string; totalReferrals: number }>(
      '/api/me/profile',
      { method: 'POST', body: JSON.stringify(input) },
      getToken,
    ),
  craft: (word: string, getToken: TokenProvider) =>
    request<{ card: InventoryPayload['cards'][number] }>('/api/craft', { method: 'POST', body: JSON.stringify({ word }) }, getToken),
  fuse: (cardIds: number[], getToken: TokenProvider) =>
    request<{ card: InventoryPayload['cards'][number] }>('/api/fuse', { method: 'POST', body: JSON.stringify({ cardIds }) }, getToken),
  inbox: (getToken: TokenProvider) => request<{ offers: TradeOffer[] }>('/api/trades/inbox', {}, getToken),
  createTrade: (
    input: { targetUsername: string; offeredCardIds: number[]; requestedCardIds: number[]; message?: string },
    getToken: TokenProvider,
  ) => request<{ offerId: number }>('/api/trades/offers', { method: 'POST', body: JSON.stringify(input) }, getToken),
  respondTrade: (id: number, action: 'accepted' | 'rejected', getToken: TokenProvider) =>
    request<{ ok: boolean }>(`/api/trades/${id}/respond`, { method: 'POST', body: JSON.stringify({ action }) }, getToken),
  leaderboard: () => request<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard'),
  arena: (getToken?: TokenProvider) => request<ArenaResponse>('/api/arena', {}, getToken ?? null),
  duel: (cardIds: number[], getToken: TokenProvider) =>
    request<DuelResponse>('/api/arena/duel', { method: 'POST', body: JSON.stringify({ cardIds }) }, getToken),
}
