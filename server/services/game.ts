import { randomUUID } from 'node:crypto'
import type { Request } from 'express'
import { getAuth } from '@clerk/express'
import { sql } from '../db'
import { AppError, assert } from '../lib/errors'
import { integrations } from '../config'
import { buildCardContent, validateSingleWord } from './content'

type DbUser = {
  id: string
  clerk_user_id: string
  username: string
  crafts_remaining: number
  referral_code: string
  referred_by: string | null
  referral_awarded: boolean
  created_at: string
}

type CardRow = {
  id: string
  serial_number: number
  shiny: boolean
  is_fusion: boolean
  ingredients: unknown
  previous_owners: unknown
  crafted_at: string
  power: number
  word: string
  flavor_text: string
  image_url: string
  tags: string[]
  owner_username: string
  crafted_by_username: string
}

const ARENA_TRAIT_CYCLE = ['arcane', 'relic', 'wild', 'urban', 'celestial', 'feral', 'mythic', 'mechanical']

function parseJsonArray(value: unknown) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as unknown[]
    } catch {
      return []
    }
  }
  return []
}

function serializeCard(row: CardRow) {
  return {
    id: row.id,
    word: row.word,
    serialNumber: row.serial_number,
    shiny: row.shiny,
    isFusion: row.is_fusion,
    ingredients: parseJsonArray(row.ingredients),
    previousOwners: parseJsonArray(row.previous_owners),
    craftedAt: row.crafted_at,
    power: row.power,
    flavorText: row.flavor_text,
    imageUrl: row.image_url,
    tags: row.tags,
    ownerUsername: row.owner_username,
    craftedByUsername: row.crafted_by_username,
  }
}

async function getCardsForOwner(userId: string) {
  const rows = await sql<CardRow[]>`
    select
      c.id,
      c.serial_number,
      c.shiny,
      c.is_fusion,
      c.ingredients,
      c.previous_owners,
      c.crafted_at,
      c.power,
      d.word,
      d.flavor_text,
      d.image_url,
      d.tags,
      owner.username as owner_username,
      crafter.username as crafted_by_username
    from cards c
    join item_definitions d on d.id = c.item_definition_id
    join users owner on owner.id = c.owner_user_id
    join users crafter on crafter.id = c.crafted_by_user_id
    where c.owner_user_id = ${userId}
    order by c.crafted_at desc
  `

  return rows.map(serializeCard)
}

async function getUserByClerkId(clerkUserId: string) {
  const rows = await sql<DbUser[]>`select * from users where clerk_user_id = ${clerkUserId} limit 1`
  return rows[0] ?? null
}

async function requireViewer(req: Request) {
  if (!integrations.clerkEnabled) {
    throw new AppError(503, 'Clerk is not configured on the server.')
  }

  const auth = getAuth(req)
  assert(auth.userId, 401, 'Sign in required.')
  const user = await getUserByClerkId(auth.userId)
  assert(user, 403, 'Create your profile before using the inventory.')
  return user
}

function buildArenaState() {
  const now = new Date()
  const dayIndex = Math.floor(now.getTime() / 86400000)
  const primaryTrait = ARENA_TRAIT_CYCLE[dayIndex % ARENA_TRAIT_CYCLE.length] ?? 'arcane'
  const secondaryTrait = ARENA_TRAIT_CYCLE[(dayIndex + 3) % ARENA_TRAIT_CYCLE.length] ?? 'relic'
  const targetLength = 4 + (dayIndex % 5)

  return {
    season: now.toISOString().slice(0, 10),
    primaryTrait,
    secondaryTrait,
    targetLength,
    sentinelScore: 42 + (dayIndex % 11),
    summary: `${primaryTrait} cards surge today. ${secondaryTrait} cards keep pace, and ${targetLength}-letter words trigger a finishing bonus.`,
  }
}

async function getOrCreateDefinition(word: string, userId: string, ingredients: string[]) {
  const existing = await sql<
    {
      id: string
      total_crafted: number
      word: string
      flavor_text: string
      image_url: string
      tags: string[]
      base_power: number
    }[]
  >`select id, total_crafted, word, flavor_text, image_url, tags, base_power from item_definitions where normalized_word = ${word} limit 1`

  if (existing[0]) {
    return existing[0]
  }

  const content = await buildCardContent(word, ingredients, true)
  await sql`
    insert into item_definitions (
      id, word, normalized_word, flavor_text, art_prompt, image_url, tags, base_power, created_by_user_id
    ) values (
      ${content.id}, ${word}, ${word}, ${content.flavorText}, ${content.artPrompt}, ${content.imageUrl}, ${sql.array(content.tags)},
      ${content.basePower}, ${userId}
    )
  `

  return {
    id: content.id,
    total_crafted: 0,
    word,
    flavor_text: content.flavorText,
    image_url: content.imageUrl,
    tags: content.tags,
    base_power: content.basePower,
  }
}

async function awardReferralIfNeeded(user: DbUser) {
  if (user.referral_awarded || !user.referred_by) {
    return
  }

  await sql.begin(async (tx) => {
    const run = tx as unknown as typeof sql
    await run`update users set crafts_remaining = crafts_remaining + 2 where id = ${user.referred_by}`
    await run`update users set referral_awarded = true where id = ${user.id}`
  })
}

export async function getBootstrap(req: Request) {
  const leaderboardRows = await sql<
    { username: string; item_count: number; crafts_remaining: number }[]
  >`
    select u.username, count(c.id)::int as item_count, u.crafts_remaining
    from users u
    left join cards c on c.owner_user_id = u.id
    group by u.id
    order by item_count desc, u.created_at asc
    limit 8
  `

  const recentRows = await sql<
    {
      username: string
      word: string
      serial_number: number
      shiny: boolean
      crafted_at: string
    }[]
  >`
    select u.username, d.word, c.serial_number, c.shiny, c.crafted_at
    from cards c
    join users u on u.id = c.owner_user_id
    join item_definitions d on d.id = c.item_definition_id
    order by c.crafted_at desc
    limit 8
  `

  let me: null | Record<string, unknown> = null
  if (integrations.clerkEnabled) {
    const auth = getAuth(req)
    if (auth.userId) {
      const user = await getUserByClerkId(auth.userId)
      if (user) {
        const cards = await getCardsForOwner(user.id)
        me = {
          username: user.username,
          craftsRemaining: user.crafts_remaining,
          referralCode: user.referral_code,
          inventoryCount: cards.length,
        }
      }
    }
  }

  return {
    integrations,
    arena: buildArenaState(),
    leaderboard: leaderboardRows.map((row, index) => ({
      rank: index + 1,
      username: row.username,
      itemCount: row.item_count,
      craftsRemaining: row.crafts_remaining,
    })),
    recentCrafts: recentRows,
    me,
  }
}

export async function upsertProfile(req: Request) {
  const auth = getAuth(req)
  assert(auth.userId, 401, 'Sign in required.')

  const body = req.body as { username?: string; referralCode?: string }
  const username = body.username?.trim().toLowerCase() ?? ''
  assert(/^[a-z0-9_]{3,20}$/.test(username), 400, 'Username must be 3-20 characters using letters, numbers, or underscores.')

  const existing = await getUserByClerkId(auth.userId)
  if (existing) {
    const rows = await sql<DbUser[]>`
      update users
      set username = ${username}
      where id = ${existing.id}
      returning *
    `
    return rows[0]
  }

  let referredBy: string | null = null
  if (body.referralCode) {
    const referrer = await sql<{ id: string }[]>`select id from users where referral_code = ${body.referralCode} limit 1`
    referredBy = referrer[0]?.id ?? null
  }

  const created = await sql<DbUser[]>`
    insert into users (id, clerk_user_id, username, referral_code, referred_by)
    values (${randomUUID()}, ${auth.userId}, ${username}, ${randomUUID().slice(0, 8)}, ${referredBy})
    returning *
  `

  return created[0]
}

export async function getInventory(username: string) {
  const users = await sql<DbUser[]>`select * from users where username = ${username.toLowerCase()} limit 1`
  const user = users[0]
  assert(user, 404, 'Inventory not found.')
  const cards = await getCardsForOwner(user.id)

  return {
    profile: {
      username: user.username,
      craftsRemaining: user.crafts_remaining,
      referralCode: user.referral_code,
      createdAt: user.created_at,
    },
    cards,
  }
}

export async function craftCard(req: Request) {
  const user = await requireViewer(req)
  assert(user.crafts_remaining > 0, 400, 'No crafts remaining. Refer a friend who crafts a card to unlock more.')

  const body = req.body as { word?: string }
  const validation = validateSingleWord(body.word ?? '')
  if (!validation.ok) {
    throw new AppError(400, validation.reason)
  }
  const normalizedWord = validation.normalized

  const definition = await getOrCreateDefinition(normalizedWord, user.id, [])
  const serialNumber = definition.total_crafted + 1
  const shiny = serialNumber === 1
  const cardId = randomUUID()

  await sql.begin(async (tx) => {
    const run = tx as unknown as typeof sql
    await run`
      update item_definitions
      set total_crafted = total_crafted + 1
      where id = ${definition.id}
    `

    await run`
      insert into cards (
        id, item_definition_id, owner_user_id, crafted_by_user_id, serial_number, shiny, is_fusion, ingredients, previous_owners, power
      ) values (
        ${cardId}, ${definition.id}, ${user.id}, ${user.id}, ${serialNumber}, ${shiny}, false, '[]'::jsonb, '[]'::jsonb, ${definition.base_power}
      )
    `

    await run`update users set crafts_remaining = crafts_remaining - 1 where id = ${user.id}`
  })

  await awardReferralIfNeeded(user)
  const inventory = await getInventory(user.username)
  return {
    crafted: inventory.cards.find((card) => card.id === cardId),
    inventory,
  }
}

export async function fuseCards(req: Request) {
  const user = await requireViewer(req)
  const body = req.body as { word?: string; cardIds?: string[] }
  const cardIds = [...new Set(body.cardIds ?? [])]
  assert(cardIds.length >= 2 && cardIds.length <= 3, 400, 'Fuse between 2 and 3 cards.')

  const validation = validateSingleWord(body.word ?? '')
  if (!validation.ok) {
    throw new AppError(400, validation.reason)
  }
  const normalizedWord = validation.normalized

  const cards = await sql<
    { id: string; previous_owners: unknown; word: string }[]
  >`
    select c.id, c.previous_owners, d.word
    from cards c
    join item_definitions d on d.id = c.item_definition_id
    where c.owner_user_id = ${user.id} and c.id = any(${sql.array(cardIds)})
  `

  assert(cards.length === cardIds.length, 400, 'You can only fuse cards you own.')
  const ingredientNames = cards.map((card) => card.word)
  const definition = await getOrCreateDefinition(normalizedWord, user.id, ingredientNames)
  const serialNumber = definition.total_crafted + 1
  const shiny = serialNumber === 1
  const cardId = randomUUID()
  const previousOwners = cards.flatMap((card) => parseJsonArray(card.previous_owners))
  previousOwners.push(user.username)

  await sql.begin(async (tx) => {
    const run = tx as unknown as typeof sql
    await run`delete from cards where owner_user_id = ${user.id} and id = any(${sql.array(cardIds)})`
    await run`update item_definitions set total_crafted = total_crafted + 1 where id = ${definition.id}`
    await run`
      insert into cards (
        id, item_definition_id, owner_user_id, crafted_by_user_id, serial_number, shiny, is_fusion, ingredients, previous_owners, power
      ) values (
        ${cardId},
        ${definition.id},
        ${user.id},
        ${user.id},
        ${serialNumber},
        ${shiny},
        true,
        ${JSON.stringify(ingredientNames)},
        ${JSON.stringify(previousOwners)},
        ${definition.base_power + ingredientNames.length}
      )
    `
  })

  const inventory = await getInventory(user.username)
  return {
    crafted: inventory.cards.find((card) => card.id === cardId),
    inventory,
  }
}

export async function getTradeInbox(req: Request) {
  const user = await requireViewer(req)
  const rows = await sql<
    {
      id: string
      status: string
      is_gift: boolean
      message: string
      offered_card_ids: unknown
      requested_card_ids: unknown
      created_at: string
      from_username: string
      to_username: string
    }[]
  >`
    select
      t.id,
      t.status,
      t.is_gift,
      t.message,
      t.offered_card_ids,
      t.requested_card_ids,
      t.created_at,
      fu.username as from_username,
      tu.username as to_username
    from trades t
    join users fu on fu.id = t.from_user_id
    join users tu on tu.id = t.to_user_id
    where t.to_user_id = ${user.id} or t.from_user_id = ${user.id}
    order by t.created_at desc
  `

  return {
    offers: rows.map((row) => ({
      id: row.id,
      status: row.status,
      isGift: row.is_gift,
      message: row.message,
      offeredCardIds: parseJsonArray(row.offered_card_ids),
      requestedCardIds: parseJsonArray(row.requested_card_ids),
      createdAt: row.created_at,
      fromUsername: row.from_username,
      toUsername: row.to_username,
    })),
  }
}

export async function createTrade(req: Request) {
  const user = await requireViewer(req)
  const body = req.body as {
    toUsername?: string
    offeredCardIds?: string[]
    requestedCardIds?: string[]
    message?: string
  }

  const toUsername = body.toUsername?.trim().toLowerCase() ?? ''
  assert(toUsername && toUsername !== user.username, 400, 'Choose another player to trade with.')

  const recipientRows = await sql<DbUser[]>`select * from users where username = ${toUsername} limit 1`
  const recipient = recipientRows[0]
  assert(recipient, 404, 'Target player not found.')

  const offeredCardIds = [...new Set(body.offeredCardIds ?? [])]
  const requestedCardIds = [...new Set(body.requestedCardIds ?? [])]
  assert(offeredCardIds.length > 0 || requestedCardIds.length > 0, 400, 'Trade must offer or request at least one card.')

  if (offeredCardIds.length > 0) {
    const owned = await sql<{ id: string }[]>`
      select id from cards where owner_user_id = ${user.id} and id = any(${sql.array(offeredCardIds)})
    `
    assert(owned.length === offeredCardIds.length, 400, 'You can only offer cards you own.')
  }

  if (requestedCardIds.length > 0) {
    const theirs = await sql<{ id: string }[]>`
      select id from cards where owner_user_id = ${recipient.id} and id = any(${sql.array(requestedCardIds)})
    `
    assert(theirs.length === requestedCardIds.length, 400, 'Requested cards are no longer available.')
  }

  const created = await sql`
    insert into trades (
      id, from_user_id, to_user_id, status, is_gift, message, offered_card_ids, requested_card_ids
    ) values (
      ${randomUUID()}, ${user.id}, ${recipient.id}, 'pending', ${requestedCardIds.length === 0}, ${body.message ?? ''},
      ${JSON.stringify(offeredCardIds)}, ${JSON.stringify(requestedCardIds)}
    )
    returning id
  `

  const trade = created[0]
  assert(trade, 500, 'Trade creation failed.')
  return { id: trade.id }
}

export async function respondToTrade(req: Request, tradeId: string) {
  const user = await requireViewer(req)
  const body = req.body as { action?: 'accept' | 'reject' }
  assert(body.action === 'accept' || body.action === 'reject', 400, 'Invalid trade response.')

  const rows = await sql<
    {
      id: string
      from_user_id: string
      to_user_id: string
      status: string
      offered_card_ids: unknown
      requested_card_ids: unknown
    }[]
  >`select * from trades where id = ${tradeId} limit 1`

  const trade = rows[0]
  assert(trade, 404, 'Trade not found.')
  assert(trade.to_user_id === user.id, 403, 'Only the recipient can respond.')
  assert(trade.status === 'pending', 400, 'Trade already resolved.')

  if (body.action === 'reject') {
    await sql`update trades set status = 'rejected', responded_at = now() where id = ${trade.id}`
    return { status: 'rejected' }
  }

  const offeredCardIds = parseJsonArray(trade.offered_card_ids).map(String)
  const requestedCardIds = parseJsonArray(trade.requested_card_ids).map(String)

  await sql.begin(async (tx) => {
    const run = tx as unknown as typeof sql
    const fromUserRows = await run<DbUser[]>`select * from users where id = ${trade.from_user_id} limit 1`
    const fromUser = fromUserRows[0]
    assert(fromUser, 404, 'Sender not found.')

    if (offeredCardIds.length > 0) {
      await run`
        update cards
        set owner_user_id = ${trade.to_user_id},
            previous_owners = previous_owners || ${JSON.stringify([fromUser.username])}::jsonb
        where owner_user_id = ${trade.from_user_id} and id = any(${sql.array(offeredCardIds)})
      `
    }

    if (requestedCardIds.length > 0) {
      await run`
        update cards
        set owner_user_id = ${trade.from_user_id},
            previous_owners = previous_owners || ${JSON.stringify([user.username])}::jsonb
        where owner_user_id = ${trade.to_user_id} and id = any(${sql.array(requestedCardIds)})
      `
    }

    await run`update trades set status = 'accepted', responded_at = now() where id = ${trade.id}`
  })

  return { status: 'accepted' }
}

export async function getLeaderboard() {
  const rows = await sql<
    { username: string; item_count: number; crafted_count: number; shiny_count: number }[]
  >`
    select
      u.username,
      count(c.id)::int as item_count,
      count(case when c.crafted_by_user_id = u.id then 1 end)::int as crafted_count,
      count(case when c.shiny then 1 end)::int as shiny_count
    from users u
    left join cards c on c.owner_user_id = u.id
    group by u.id
    order by item_count desc, shiny_count desc, crafted_count desc, u.created_at asc
  `

  return {
    players: rows.map((row, index) => ({
      rank: index + 1,
      username: row.username,
      itemCount: row.item_count,
      craftedCount: row.crafted_count,
      shinyCount: row.shiny_count,
    })),
  }
}

export async function getArena(req: Request) {
  const arena = buildArenaState()
  let myCards: ReturnType<typeof serializeCard>[] = []
  if (integrations.clerkEnabled) {
    const auth = getAuth(req)
    if (auth.userId) {
      const user = await getUserByClerkId(auth.userId)
      if (user) {
        myCards = await getCardsForOwner(user.id)
      }
    }
  }

  return {
    ...arena,
    myCards,
  }
}

export async function duelArena(req: Request) {
  const user = await requireViewer(req)
  const body = req.body as { selectedCardIds?: string[] }
  const selectedCardIds = [...new Set(body.selectedCardIds ?? [])]
  assert(selectedCardIds.length === 3, 400, 'Choose exactly three cards for the duel.')

  const arena = buildArenaState()
  const rows = await sql<CardRow[]>`
    select
      c.id,
      c.serial_number,
      c.shiny,
      c.is_fusion,
      c.ingredients,
      c.previous_owners,
      c.crafted_at,
      c.power,
      d.word,
      d.flavor_text,
      d.image_url,
      d.tags,
      owner.username as owner_username,
      crafter.username as crafted_by_username
    from cards c
    join item_definitions d on d.id = c.item_definition_id
    join users owner on owner.id = c.owner_user_id
    join users crafter on crafter.id = c.crafted_by_user_id
    where c.owner_user_id = ${user.id} and c.id = any(${sql.array(selectedCardIds)})
  `

  assert(rows.length === 3, 400, 'Selected cards must all belong to you.')

  const cards = rows.map(serializeCard)
  const cardBreakdown = cards.map((card) => {
    let bonus = 0
    if (card.tags.includes(arena.primaryTrait)) bonus += 8
    if (card.tags.includes(arena.secondaryTrait)) bonus += 4
    if (card.word.length === arena.targetLength) bonus += 6
    if (card.shiny) bonus += 3
    if (card.isFusion) bonus += 2

    return {
      card,
      score: card.power + bonus,
      bonus,
    }
  })

  const totalScore = cardBreakdown.reduce((sum, item) => sum + item.score, 0)
  const result = totalScore >= arena.sentinelScore ? 'victory' : 'defeat'

  await sql`
    insert into arena_runs (id, user_id, selected_card_ids, score, result)
    values (${randomUUID()}, ${user.id}, ${JSON.stringify(selectedCardIds)}, ${totalScore}, ${result})
  `

  return {
    arena,
    totalScore,
    result,
    targetScore: arena.sentinelScore,
    cardBreakdown,
  }
}
