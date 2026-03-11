export type BootstrapPayload = {
  authEnabled: boolean
  arena: ArenaPayload
  leaderboardPreview: LeaderboardEntry[]
  recentDrops: Card[]
  stats: {
    collectors: number
    live_cards: number
    unique_items: number
    trades_completed: number
  }
  viewer: {
    username: string
    craftsRemaining: number
    referralCode: string
    totalReferrals: number
  } | null
}

export type Card = {
  id: number
  itemName: string
  normalizedName: string
  editionNumber: number
  isShiny: boolean
  sourceType: string
  ingredients: string[]
  previousOwners: string[]
  craftedAt: string
  flavorText: string
  imageUrl: string
  traits: string[]
  owner: string
  craftedBy: string
}

export type InventoryPayload = {
  profile: {
    username: string
    craftsRemaining: number
    referralCode: string
    totalReferrals: number
    joinedAt: string
    itemCount: number
  }
  cards: Card[]
}

export type TradeOffer = {
  id: number
  status: string
  kind: string
  message: string
  cards: {
    id: number
    side: string
    itemName: string
    editionNumber: number
    isShiny: boolean
    imageUrl: string
  }[]
  createdAt: string
  fromUsername: string
  toUsername: string
}

export type LeaderboardEntry = {
  rank: number
  username: string
  itemCount: number
  craftedCount?: number
  shinyCount?: number
  bestDuelScore?: number
  craftsRemaining?: number
}

export type ArenaPayload = {
  date: string
  title: string
  modifiers: string[]
  wantedTraits: string[]
}

export type ArenaResponse = {
  arena: ArenaPayload
  cards: Card[]
  recommendedCards: Card[]
}

export type DuelResponse = {
  verdict: 'win' | 'loss'
  score: number
  threshold: number
  arena: ArenaPayload
  summary: string
}
