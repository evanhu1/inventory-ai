import type {
  ArenaResponse,
  BootstrapPayload,
  DuelResponse,
  InventoryPayload,
  LeaderboardEntry,
  TradeOffer,
} from '@/lib/types'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')

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
  createProfile: (input: { username: string; referralCode?: string }) =>
    request<{ username: string; craftsRemaining: number; referralCode: string; totalReferrals: number }>(
      '/api/me/profile',
      { method: 'POST', body: JSON.stringify(input) },
    ),
  craft: (word: string) =>
    request<{ card: InventoryPayload['cards'][number] }>('/api/craft', {
      method: 'POST',
      body: JSON.stringify({ word }),
    }),
  fuse: (cardIds: number[]) =>
    request<{ card: InventoryPayload['cards'][number] }>('/api/fuse', {
      method: 'POST',
      body: JSON.stringify({ cardIds }),
    }),
  inbox: () => request<{ offers: TradeOffer[] }>('/api/trades/inbox'),
  createTrade: (input: {
    targetUsername: string
    offeredCardIds: number[]
    requestedCardIds: number[]
    message?: string
  }) => request<{ offerId: number }>('/api/trades/offers', { method: 'POST', body: JSON.stringify(input) }),
  respondTrade: (id: number, action: 'accepted' | 'rejected') =>
    request<{ ok: boolean }>(`/api/trades/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
  leaderboard: () => request<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard'),
  arena: () => request<ArenaResponse>('/api/arena'),
  duel: (cardIds: number[]) =>
    request<DuelResponse>('/api/arena/duel', { method: 'POST', body: JSON.stringify({ cardIds }) }),
}
