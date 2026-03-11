import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { clerkMiddleware, getAuth } from '@clerk/express'
import { z } from 'zod'
import { authEnabled, env } from './env'
import { sql } from './db/client'
import { generateCardCreative, generateCardImage } from './services/ai'
import { normalizeWord, validateCraftWord } from './services/words'

const app = express()

app.use(
  cors({
    origin: env.appUrl || true,
    credentials: true,
  }),
)
app.use(express.json({ limit: '5mb' }))
app.use(authEnabled ? clerkMiddleware() : ((_req, _res, next) => next()))

type UserRecord = {
  id: number
  clerk_user_id: string
  username: string
  referral_code: string
  referred_by_user_id: number | null
  referral_reward_granted: boolean
  crafts_remaining: number
  total_referrals: number
  created_at: string
}

type InventoryCard = {
  id: number
  itemName: string
  normalizedName: string
  editionNumber: number
  isShiny: boolean
  flavorText: string
  imageUrl: string
  imagePrompt: string
  sourceType: string
  craftedAt: string
  craftedBy: string
  owner: string
  ingredients: string[]
  traits: string[]
  previousOwners: string[]
}

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(20)
  .regex(/^[a-zA-Z0-9_]+$/, 'Usernames can only contain letters, numbers, and underscores.')

const cardActionSchema = z.object({
  cardIds: z.array(z.number().int().positive()).min(2).max(3),
})

const offerSchema = z.object({
  targetUsername: z.string().trim().min(3),
  offeredCardIds: z.array(z.number().int().positive()).max(5),
  requestedCardIds: z.array(z.number().int().positive()).max(5),
  message: z.string().trim().max(280).default(''),
})

const duelSchema = z.object({
  cardIds: z.array(z.number().int().positive()).length(3),
})

const craftSchema = z.object({
  word: z.string().trim().min(1).max(32),
})

const parseJsonArray = <T>(value: unknown, fallback: T[] = []) =>
  Array.isArray(value) ? (value as T[]) : fallback

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const todayArena = () => {
  const seed = new Date().toISOString().slice(0, 10)
  const themes = ['solar', 'deep', 'ember', 'bloom', 'stone', 'echo', 'storm']
  const digits = seed.replaceAll('-', '').split('').map(Number)
  const primary = themes[digits[digits.length - 1] % themes.length]
  const secondary = themes[digits[digits.length - 3] % themes.length]
  return {
    date: seed,
    title: `${titleCase(primary)} Circuit`,
    modifiers: [
      `+12 if a card has the ${primary} trait`,
      '+7 if the item name has 6 or more letters',
      '+15 for one shiny slot bonus',
      `+8 if a card also echoes ${secondary}`,
    ],
    wantedTraits: [primary, secondary],
  }
}

const getViewer = async (req: Request) => {
  if (!authEnabled) {
    return null
  }
  const { userId } = getAuth(req)
  if (!userId) {
    return null
  }
  const rows = await sql<UserRecord[]>`
    select * from app_users where clerk_user_id = ${userId}
  `
  return rows[0] ?? null
}

const requireViewer = async (req: Request, res: Response) => {
  if (!authEnabled) {
    res.status(503).json({ error: 'Auth is not configured on the server.' })
    return null
  }
  const { userId } = getAuth(req)
  if (!userId) {
    res.status(401).json({ error: 'Sign in required.' })
    return null
  }
  const rows = await sql<UserRecord[]>`
    select * from app_users where clerk_user_id = ${userId}
  `
  if (!rows[0]) {
    res.status(403).json({ error: 'Create your game profile first.' })
    return null
  }
  return rows[0]
}

const serializeCard = (row: Record<string, unknown>): InventoryCard => ({
  id: Number(row.id),
  itemName: String(row.display_name),
  normalizedName: String(row.normalized_name),
  editionNumber: Number(row.edition_number),
  isShiny: Boolean(row.is_shiny),
  flavorText: String(row.flavor_text),
  imageUrl: String(row.image_url),
  imagePrompt: String(row.image_prompt),
  sourceType: String(row.source_type),
  craftedAt: String(row.created_at),
  craftedBy: String(row.crafted_by_username),
  owner: String(row.owner_username),
  ingredients: parseJsonArray<string>(row.ingredients),
  traits: parseJsonArray<string>(row.traits),
  previousOwners: parseJsonArray<string>(row.previous_owners),
})

const fetchCardsForUser = async (userId: number) => {
  const rows = await sql<Record<string, unknown>[]>`
    select
      c.id,
      c.edition_number,
      c.is_shiny,
      c.flavor_text,
      c.image_url,
      c.image_prompt,
      c.source_type,
      c.created_at,
      c.ingredients,
      c.traits,
      c.previous_owners,
      catalog.display_name,
      catalog.normalized_name,
      crafted_by.username as crafted_by_username,
      owner.username as owner_username
    from cards c
    join item_catalog catalog on catalog.id = c.catalog_id
    join app_users crafted_by on crafted_by.id = c.crafted_by_user_id
    join app_users owner on owner.id = c.owner_user_id
    where c.owner_user_id = ${userId} and c.status = 'active'
    order by c.created_at desc
  `
  return rows.map(serializeCard)
}

const fetchInventory = async (username: string) => {
  const users = await sql<UserRecord[]>`
    select * from app_users where lower(username) = lower(${username})
  `
  const user = users[0]
  if (!user) {
    return null
  }
  const cards = await fetchCardsForUser(user.id)
  return {
    profile: {
      username: user.username,
      referralCode: user.referral_code,
      craftsRemaining: user.crafts_remaining,
      totalReferrals: user.total_referrals,
      joinedAt: user.created_at,
      itemCount: cards.length,
    },
    cards,
  }
}

const ensureCatalogEntry = async (
  tx: typeof sql,
  normalizedName: string,
  displayName: string,
) => {
  const rows = await tx<{ id: number; total_instances: number }[]>`
    insert into item_catalog (normalized_name, display_name, total_instances)
    values (${normalizedName}, ${displayName}, 1)
    on conflict (normalized_name)
    do update set
      display_name = excluded.display_name,
      total_instances = item_catalog.total_instances + 1
    returning id, total_instances
  `
  return rows[0]
}

const maybeGrantReferralCrafts = async (tx: typeof sql, user: UserRecord, ownedCardCount: number) => {
  if (ownedCardCount !== 0 || !user.referred_by_user_id || user.referral_reward_granted) {
    return
  }

  await tx`
    update app_users
    set crafts_remaining = crafts_remaining + 2,
        total_referrals = total_referrals + 1
    where id = ${user.referred_by_user_id}
  `
  await tx`
    update app_users
    set referral_reward_granted = true
    where id = ${user.id}
  `
}

const computeDuelScore = (cards: InventoryCard[], arena: ReturnType<typeof todayArena>) =>
  cards.reduce((total, card, index) => {
    let score = card.editionNumber <= 3 ? 18 - (card.editionNumber - 1) * 4 : 8
    if (card.isShiny) {
      score += 15
    }
    if (card.itemName.length >= 6) {
      score += 7
    }
    if (card.traits.some((trait) => arena.wantedTraits.includes(trait))) {
      score += 12
    }
    if (card.traits.includes(arena.wantedTraits[1])) {
      score += 8
    }
    return total + score + index * 2
  }, 0)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/bootstrap', async (req, res, next) => {
  try {
    const viewer = await getViewer(req)
    const leaders = await sql<Record<string, unknown>[]>`
      select u.username, count(c.id)::int as item_count
      from app_users u
      left join cards c on c.owner_user_id = u.id and c.status = 'active'
      group by u.id
      order by item_count desc, u.created_at asc
      limit 8
    `
    const recentDrops = await sql<Record<string, unknown>[]>`
      select
        c.id,
        c.edition_number,
        c.is_shiny,
        c.flavor_text,
        c.image_url,
        c.image_prompt,
        c.source_type,
        c.created_at,
        c.ingredients,
        c.traits,
        c.previous_owners,
        catalog.display_name,
        catalog.normalized_name,
        crafted_by.username as crafted_by_username,
        owner.username as owner_username
      from cards c
      join item_catalog catalog on catalog.id = c.catalog_id
      join app_users crafted_by on crafted_by.id = c.crafted_by_user_id
      join app_users owner on owner.id = c.owner_user_id
      where c.status = 'active'
      order by c.created_at desc
      limit 6
    `
    const stats = await sql<Record<string, unknown>[]>`
      select
        (select count(*)::int from app_users) as collectors,
        (select count(*)::int from cards where status = 'active') as live_cards,
        (select count(*)::int from item_catalog) as unique_items,
        (select count(*)::int from trade_offers where status = 'accepted') as trades_completed
    `
    res.json({
      authEnabled,
      viewer: viewer
        ? {
            username: viewer.username,
            craftsRemaining: viewer.crafts_remaining,
            referralCode: viewer.referral_code,
            totalReferrals: viewer.total_referrals,
          }
        : null,
      leaderboardPreview: leaders.map((row, index) => ({
        rank: index + 1,
        username: String(row.username),
        itemCount: Number(row.item_count),
      })),
      recentDrops: recentDrops.map(serializeCard),
      stats: stats[0] ?? { collectors: 0, live_cards: 0, unique_items: 0, trades_completed: 0 },
      arena: todayArena(),
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/inventories/:username', async (req, res, next) => {
  try {
    const inventory = await fetchInventory(req.params.username)
    if (!inventory) {
      res.status(404).json({ error: 'Inventory not found.' })
      return
    }
    res.json(inventory)
  } catch (error) {
    next(error)
  }
})

app.post('/api/me/profile', async (req, res, next) => {
  try {
    if (!authEnabled) {
      res.status(503).json({ error: 'Clerk is not configured.' })
      return
    }
    const { userId } = getAuth(req)
    if (!userId) {
      res.status(401).json({ error: 'Sign in required.' })
      return
    }

    const payload = z
      .object({
        username: usernameSchema,
        referralCode: z.string().trim().max(32).optional(),
      })
      .parse(req.body)

    const existingUsername = await sql<{ id: number; clerk_user_id: string }[]>`
      select id, clerk_user_id from app_users where lower(username) = lower(${payload.username})
    `
    if (existingUsername[0] && existingUsername[0].clerk_user_id !== userId) {
      res.status(409).json({ error: 'Username is already taken.' })
      return
    }

    const existingUser = await sql<UserRecord[]>`
      select * from app_users where clerk_user_id = ${userId}
    `
    let referredByUserId: number | null = existingUser[0]?.referred_by_user_id ?? null
    if (!existingUser[0] && payload.referralCode?.trim()) {
      const referrer = await sql<{ id: number }[]>`
        select id from app_users where referral_code = ${payload.referralCode.trim().toUpperCase()}
      `
      referredByUserId = referrer[0]?.id ?? null
    }

    const userRows = await sql<UserRecord[]>`
      insert into app_users (clerk_user_id, username, referral_code, referred_by_user_id)
      values (${userId}, ${payload.username}, ${Math.random().toString(36).slice(2, 8).toUpperCase()}, ${referredByUserId})
      on conflict (clerk_user_id)
      do update set username = excluded.username
      returning *
    `
    const user = userRows[0]
    res.json({
      username: user.username,
      craftsRemaining: user.crafts_remaining,
      referralCode: user.referral_code,
      totalReferrals: user.total_referrals,
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/craft', async (req, res, next) => {
  try {
    const viewer = await requireViewer(req, res)
    if (!viewer) {
      return
    }

    const payload = craftSchema.parse(req.body)
    const validation = validateCraftWord(payload.word)
    if (!validation.ok) {
      res.status(400).json({ error: validation.error })
      return
    }
    if (viewer.crafts_remaining <= 0) {
      res.status(400).json({ error: 'No crafts remaining. Earn more with referrals.' })
      return
    }

    const currentCards = await fetchCardsForUser(viewer.id)
    const creative = await generateCardCreative({
      word: validation.normalized,
      sourceType: 'craft',
      ingredients: [],
    })
    const isShiny = currentCards.length === 0
    const imageUrl = await generateCardImage(creative.imagePrompt, validation.normalized, isShiny)

    const result = await sql.begin(async (tx) => {
      const db = tx as unknown as typeof sql
      const catalog = await ensureCatalogEntry(db, validation.normalized, titleCase(validation.normalized))
      await maybeGrantReferralCrafts(db, viewer, currentCards.length)
      const inserted = await db<Record<string, unknown>[]>`
        insert into cards (
          catalog_id,
          owner_user_id,
          crafted_by_user_id,
          source_type,
          is_shiny,
          flavor_text,
          image_url,
          image_prompt,
          edition_number,
          ingredients,
          traits,
          previous_owners
        )
        values (
          ${catalog.id},
          ${viewer.id},
          ${viewer.id},
          'craft',
          ${isShiny},
          ${creative.flavorText},
          ${imageUrl},
          ${creative.imagePrompt},
          ${catalog.total_instances},
          ${db.json([])},
          ${db.json(creative.traits)},
          ${db.json([viewer.username])}
        )
        returning id
      `
      await db`
        update app_users
        set crafts_remaining = crafts_remaining - 1
        where id = ${viewer.id}
      `
      const rows = await db<Record<string, unknown>[]>`
        select
          c.id,
          c.edition_number,
          c.is_shiny,
          c.flavor_text,
          c.image_url,
          c.image_prompt,
          c.source_type,
          c.created_at,
          c.ingredients,
          c.traits,
          c.previous_owners,
          catalog.display_name,
          catalog.normalized_name,
          crafted_by.username as crafted_by_username,
          owner.username as owner_username
        from cards c
        join item_catalog catalog on catalog.id = c.catalog_id
        join app_users crafted_by on crafted_by.id = c.crafted_by_user_id
        join app_users owner on owner.id = c.owner_user_id
        where c.id = ${Number(inserted[0].id)}
      `
      return rows[0]
    })

    res.json({ card: serializeCard(result) })
  } catch (error) {
    next(error)
  }
})

app.post('/api/fuse', async (req, res, next) => {
  try {
    const viewer = await requireViewer(req, res)
    if (!viewer) {
      return
    }

    const payload = cardActionSchema.parse(req.body)
    const rows = await sql<Record<string, unknown>[]>`
      select
        c.id,
        c.previous_owners,
        catalog.display_name
      from cards c
      join item_catalog catalog on catalog.id = c.catalog_id
      where c.owner_user_id = ${viewer.id}
        and c.status = 'active'
        and c.id = any(${sql.array(payload.cardIds)})
    `
    if (rows.length !== payload.cardIds.length) {
      res.status(400).json({ error: 'You can only fuse cards you currently own.' })
      return
    }

    const ingredientNames = rows.map((card) => String(card.display_name))
    const fusionWord = normalizeWord(
      ingredientNames
        .map((name) => name.slice(0, Math.max(2, Math.ceil(name.length / 2))))
        .join('')
        .slice(0, 14),
    )
    const creative = await generateCardCreative({
      word: fusionWord,
      sourceType: 'fusion',
      ingredients: ingredientNames,
    })
    const imageUrl = await generateCardImage(creative.imagePrompt, fusionWord, false)

    const createdCard = await sql.begin(async (tx) => {
      const db = tx as unknown as typeof sql
      const catalog = await ensureCatalogEntry(db, fusionWord, titleCase(fusionWord))
      await db`
        update cards
        set status = 'destroyed', destroyed_at = now()
        where id = any(${sql.array(payload.cardIds)})
      `
      const inserted = await db<Record<string, unknown>[]>`
        insert into cards (
          catalog_id,
          owner_user_id,
          crafted_by_user_id,
          source_type,
          is_shiny,
          flavor_text,
          image_url,
          image_prompt,
          edition_number,
          ingredients,
          traits,
          previous_owners
        )
        values (
          ${catalog.id},
          ${viewer.id},
          ${viewer.id},
          'fusion',
          false,
          ${creative.flavorText},
          ${imageUrl},
          ${creative.imagePrompt},
          ${catalog.total_instances},
          ${db.json(ingredientNames)},
          ${db.json([...new Set([...ingredientNames.map(normalizeWord), ...creative.traits, 'fusion'])].slice(0, 5))},
          ${db.json([viewer.username])}
        )
        returning id
      `
      const cards = await db<Record<string, unknown>[]>`
        select
          c.id,
          c.edition_number,
          c.is_shiny,
          c.flavor_text,
          c.image_url,
          c.image_prompt,
          c.source_type,
          c.created_at,
          c.ingredients,
          c.traits,
          c.previous_owners,
          catalog.display_name,
          catalog.normalized_name,
          crafted_by.username as crafted_by_username,
          owner.username as owner_username
        from cards c
        join item_catalog catalog on catalog.id = c.catalog_id
        join app_users crafted_by on crafted_by.id = c.crafted_by_user_id
        join app_users owner on owner.id = c.owner_user_id
        where c.id = ${Number(inserted[0].id)}
      `
      return cards[0]
    })

    res.json({ card: serializeCard(createdCard) })
  } catch (error) {
    next(error)
  }
})

app.get('/api/trades/inbox', async (req, res, next) => {
  try {
    const viewer = await requireViewer(req, res)
    if (!viewer) {
      return
    }
    const offers = await sql<Record<string, unknown>[]>`
      select
        t.id,
        t.kind,
        t.message,
        t.status,
        t.created_at,
        from_user.username as from_username,
        to_user.username as to_username,
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', c.id,
              'side', toc.side,
              'itemName', catalog.display_name,
              'editionNumber', c.edition_number,
              'isShiny', c.is_shiny,
              'imageUrl', c.image_url
            )
          )
          from trade_offer_cards toc
          join cards c on c.id = toc.card_id
          join item_catalog catalog on catalog.id = c.catalog_id
          where toc.offer_id = t.id
        ) as cards
      from trade_offers t
      join app_users from_user on from_user.id = t.from_user_id
      join app_users to_user on to_user.id = t.to_user_id
      where t.from_user_id = ${viewer.id} or t.to_user_id = ${viewer.id}
      order by t.created_at desc
    `
    res.json({
      offers: offers.map((offer) => ({
        id: Number(offer.id),
        kind: String(offer.kind),
        message: String(offer.message),
        status: String(offer.status),
        createdAt: String(offer.created_at),
        fromUsername: String(offer.from_username),
        toUsername: String(offer.to_username),
        cards: parseJsonArray<Record<string, unknown>>(offer.cards),
      })),
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/trades/offers', async (req, res, next) => {
  try {
    const viewer = await requireViewer(req, res)
    if (!viewer) {
      return
    }

    const payload = offerSchema.parse(req.body)
    if (payload.offeredCardIds.length === 0 && payload.requestedCardIds.length === 0) {
      res.status(400).json({ error: 'Choose cards to send or request.' })
      return
    }

    const targets = await sql<UserRecord[]>`
      select * from app_users where lower(username) = lower(${payload.targetUsername})
    `
    const target = targets[0]
    if (!target || target.id === viewer.id) {
      res.status(404).json({ error: 'Target collector not found.' })
      return
    }

    const ownedOffered = payload.offeredCardIds.length
      ? await sql<{ id: number }[]>`
          select id from cards
          where owner_user_id = ${viewer.id}
            and status = 'active'
            and id = any(${sql.array(payload.offeredCardIds)})
        `
      : []
    if (ownedOffered.length !== payload.offeredCardIds.length) {
      res.status(400).json({ error: 'You can only offer cards you own.' })
      return
    }

    const requestedCards = payload.requestedCardIds.length
      ? await sql<{ id: number }[]>`
          select id from cards
          where owner_user_id = ${target.id}
            and status = 'active'
            and id = any(${sql.array(payload.requestedCardIds)})
        `
      : []
    if (requestedCards.length !== payload.requestedCardIds.length) {
      res.status(400).json({ error: 'Requested cards are no longer available.' })
      return
    }

    const kind = payload.requestedCardIds.length === 0 ? 'gift' : 'offer'
    const offer = await sql.begin(async (tx) => {
      const db = tx as unknown as typeof sql
      const created = await db<{ id: number }[]>`
        insert into trade_offers (from_user_id, to_user_id, kind, message)
        values (${viewer.id}, ${target.id}, ${kind}, ${payload.message})
        returning id
      `

      for (const cardId of payload.offeredCardIds) {
        await db`
          insert into trade_offer_cards (offer_id, card_id, side)
          values (${created[0].id}, ${cardId}, 'offered')
        `
      }
      for (const cardId of payload.requestedCardIds) {
        await db`
          insert into trade_offer_cards (offer_id, card_id, side)
          values (${created[0].id}, ${cardId}, 'requested')
        `
      }
      return created[0]
    })

    res.status(201).json({ offerId: offer.id })
  } catch (error) {
    next(error)
  }
})

app.post('/api/trades/:id/respond', async (req, res, next) => {
  try {
    const viewer = await requireViewer(req, res)
    if (!viewer) {
      return
    }

    const payload = z.object({ action: z.enum(['accepted', 'rejected']) }).parse(req.body)
    const offers = await sql<Record<string, unknown>[]>`
      select * from trade_offers
      where id = ${Number(req.params.id)} and to_user_id = ${viewer.id} and status = 'pending'
    `
    const offer = offers[0]
    if (!offer) {
      res.status(404).json({ error: 'Pending trade not found.' })
      return
    }

    if (payload.action === 'rejected') {
      await sql`
        update trade_offers set status = 'rejected', updated_at = now()
        where id = ${Number(req.params.id)}
      `
      res.json({ ok: true })
      return
    }

    await sql.begin(async (tx) => {
      const db = tx as unknown as typeof sql
      const tradeCards = await db<Record<string, unknown>[]>`
        select toc.side, c.id, c.owner_user_id, c.previous_owners
        from trade_offer_cards toc
        join cards c on c.id = toc.card_id
        where toc.offer_id = ${Number(req.params.id)} and c.status = 'active'
      `
      const offered = tradeCards.filter((card: Record<string, unknown>) => card.side === 'offered')
      const requested = tradeCards.filter((card: Record<string, unknown>) => card.side === 'requested')
      const fromUserId = Number(offer.from_user_id)
      const toUserId = Number(offer.to_user_id)

      if (
        offered.some((card: Record<string, unknown>) => Number(card.owner_user_id) !== fromUserId) ||
        requested.some((card: Record<string, unknown>) => Number(card.owner_user_id) !== toUserId)
      ) {
        throw new Error('Trade cards changed owners before acceptance.')
      }

      for (const card of offered) {
        const previousOwners = [...parseJsonArray<string>(card.previous_owners), viewer.username]
        await db`
          update cards
          set owner_user_id = ${toUserId},
              previous_owners = ${db.json(previousOwners)}
          where id = ${Number(card.id)}
        `
      }
      const senderRows = await db<{ username: string }[]>`
        select username from app_users where id = ${fromUserId}
      `
      for (const card of requested) {
        const previousOwners = [...parseJsonArray<string>(card.previous_owners), senderRows[0].username]
        await db`
          update cards
          set owner_user_id = ${fromUserId},
              previous_owners = ${db.json(previousOwners)}
          where id = ${Number(card.id)}
        `
      }

      await db`
        update trade_offers set status = 'accepted', updated_at = now()
        where id = ${Number(req.params.id)}
      `
    })

    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

app.get('/api/leaderboard', async (_req, res, next) => {
  try {
    const rows = await sql<Record<string, unknown>[]>`
      select
        u.username,
        count(c.id)::int as item_count,
        count(case when c.is_shiny then 1 end)::int as shiny_count,
        coalesce(max(d.score), 0)::int as best_duel_score
      from app_users u
      left join cards c on c.owner_user_id = u.id and c.status = 'active'
      left join duel_runs d on d.user_id = u.id
      group by u.id
      order by item_count desc, shiny_count desc, u.created_at asc
      limit 100
    `
    res.json({
      leaderboard: rows.map((row, index) => ({
        rank: index + 1,
        username: String(row.username),
        itemCount: Number(row.item_count),
        shinyCount: Number(row.shiny_count),
        bestDuelScore: Number(row.best_duel_score),
      })),
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/arena', async (req, res, next) => {
  try {
    const viewer = await getViewer(req)
    const arena = todayArena()
    const cards = viewer ? await fetchCardsForUser(viewer.id) : []
    res.json({
      arena,
      cards,
      recommendedCards: cards.filter((card) => card.traits.some((trait) => arena.wantedTraits.includes(trait))).slice(0, 6),
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/arena/duel', async (req, res, next) => {
  try {
    const viewer = await requireViewer(req, res)
    if (!viewer) {
      return
    }

    const payload = duelSchema.parse(req.body)
    const cards = await fetchCardsForUser(viewer.id)
    const selected = payload.cardIds
      .map((id) => cards.find((card) => card.id === id))
      .filter(Boolean) as InventoryCard[]

    if (selected.length !== 3) {
      res.status(400).json({ error: 'Choose exactly three cards you own.' })
      return
    }

    const arena = todayArena()
    const score = computeDuelScore(selected, arena)
    const threshold = 72
    const verdict = score >= threshold ? 'win' : 'loss'

    await sql`
      insert into duel_runs (user_id, selected_card_ids, score, verdict)
      values (${viewer.id}, ${sql.json(payload.cardIds)}, ${score}, ${verdict})
    `

    res.json({
      verdict,
      score,
      threshold,
      arena,
      summary:
        verdict === 'win'
          ? 'Your lineup matched the arena pulse and held the vault.'
          : 'The arena exposed a gap in your collection. Hunt stronger synergies.',
    })
  } catch (error) {
    next(error)
  }
})

app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  void next
  console.error(error)
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: error.issues[0]?.message ?? 'Invalid request.' })
    return
  }
  res.status(500).json({
    error: error instanceof Error ? error.message : 'Internal server error.',
  })
})

export default app
