export type BootstrapPayload = {
  integrations: {
    clerkEnabled: boolean
    anthropicEnabled: boolean
    googleGenAiEnabled: boolean
  }
  arena: ArenaPayload
  leaderboard: LeaderboardEntry[]
  recentCrafts: {
    username: string
    word: string
    serial_number: number
    shiny: boolean
    crafted_at: string
  }[]
  me: {
    username: string
    craftsRemaining: number
    referralCode: string
    inventoryCount: number
  } | null
}

export type Card = {
  id: string
  word: string
  serialNumber: number
  shiny: boolean
  isFusion: boolean
  ingredients: string[]
  previousOwners: string[]
  craftedAt: string
  power: number
  flavorText: string
  imageUrl: string
  tags: string[]
  ownerUsername: string
  craftedByUsername: string
}

export type InventoryPayload = {
  profile: {
    username: string
    craftsRemaining: number
    referralCode: string
    createdAt: string
  }
  cards: Card[]
}

export type TradeOffer = {
  id: string
  status: string
  isGift: boolean
  message: string
  offeredCardIds: string[]
  requestedCardIds: string[]
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
  craftsRemaining?: number
}

export type ArenaPayload = {
  season: string
  primaryTrait: string
  secondaryTrait: string
  targetLength: number
  sentinelScore: number
  summary: string
  myCards?: Card[]
}

export type DuelPayload = {
  arena: ArenaPayload
  totalScore: number
  result: 'victory' | 'defeat'
  targetScore: number
  cardBreakdown: {
    card: Card
    score: number
    bonus: number
  }[]
}
