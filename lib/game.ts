import { z } from 'zod'
import { eq, and, sql, desc, asc, inArray } from 'drizzle-orm'
import { authEnabled } from './env'
import { db } from './db/client'
import { appUsers, itemCatalog, cards, tradeOffers, tradeOfferCards, duelRuns } from './db/schema'
import { AppError } from './errors'
import { generateCardCreative, generateCardImage } from './services/ai'
import { normalizeWord, validateCraftWord } from './services/words'

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

async function getViewer(clerkUserId?: string | null) {
  if (!authEnabled || !clerkUserId) return null
  const rows = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.clerkUserId, clerkUserId))
    .limit(1)
  return rows[0] ?? null
}

async function requireViewer(clerkUserId?: string | null) {
  if (!authEnabled) throw new AppError(503, 'Auth is not configured on the server.')
  if (!clerkUserId) throw new AppError(401, 'Sign in required.')
  const rows = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.clerkUserId, clerkUserId))
    .limit(1)
  if (!rows[0]) throw new AppError(403, 'Create your game profile first.')
  return rows[0]
}

async function fetchCardsForUser(userId: number): Promise<InventoryCard[]> {
  const rows = await db
    .select({
      id: cards.id,
      editionNumber: cards.editionNumber,
      isShiny: cards.isShiny,
      flavorText: cards.flavorText,
      imageUrl: cards.imageUrl,
      imagePrompt: cards.imagePrompt,
      sourceType: cards.sourceType,
      createdAt: cards.createdAt,
      ingredients: cards.ingredients,
      traits: cards.traits,
      previousOwners: cards.previousOwners,
      displayName: itemCatalog.displayName,
      normalizedName: itemCatalog.normalizedName,
      craftedByUsername: sql<string>`crafted_by.username`,
      ownerUsername: sql<string>`owner.username`,
    })
    .from(cards)
    .innerJoin(itemCatalog, eq(itemCatalog.id, cards.catalogId))
    .innerJoin(
      sql`app_users as crafted_by`,
      sql`crafted_by.id = ${cards.craftedByUserId}`,
    )
    .innerJoin(
      sql`app_users as owner`,
      sql`owner.id = ${cards.ownerUserId}`,
    )
    .where(and(eq(cards.ownerUserId, userId), eq(cards.status, 'active')))
    .orderBy(desc(cards.createdAt))

  return rows.map((row) => ({
    id: row.id,
    itemName: row.displayName,
    normalizedName: row.normalizedName,
    editionNumber: row.editionNumber,
    isShiny: row.isShiny,
    flavorText: row.flavorText,
    imageUrl: row.imageUrl,
    imagePrompt: row.imagePrompt,
    sourceType: row.sourceType,
    craftedAt: String(row.createdAt),
    craftedBy: row.craftedByUsername,
    owner: row.ownerUsername,
    ingredients: row.ingredients ?? [],
    traits: row.traits ?? [],
    previousOwners: row.previousOwners ?? [],
  }))
}

async function fetchInventory(username: string) {
  const users = await db
    .select()
    .from(appUsers)
    .where(sql`lower(${appUsers.username}) = lower(${username})`)
    .limit(1)
  const user = users[0]
  if (!user) return null
  const userCards = await fetchCardsForUser(user.id)
  return {
    profile: {
      username: user.username,
      referralCode: user.referralCode,
      craftsRemaining: user.craftsRemaining,
      totalReferrals: user.totalReferrals,
      joinedAt: String(user.createdAt),
      itemCount: userCards.length,
    },
    cards: userCards,
  }
}

export async function getBootstrap(clerkUserId?: string | null) {
  const viewer = await getViewer(clerkUserId)

  const leaders = await db
    .select({
      username: appUsers.username,
      itemCount: sql<number>`count(${cards.id})::int`,
    })
    .from(appUsers)
    .leftJoin(cards, and(eq(cards.ownerUserId, appUsers.id), eq(cards.status, 'active')))
    .groupBy(appUsers.id)
    .orderBy(sql`count(${cards.id}) desc`, asc(appUsers.createdAt))
    .limit(8)

  const recentDrops = await db
    .select({
      id: cards.id,
      editionNumber: cards.editionNumber,
      isShiny: cards.isShiny,
      flavorText: cards.flavorText,
      imageUrl: cards.imageUrl,
      imagePrompt: cards.imagePrompt,
      sourceType: cards.sourceType,
      createdAt: cards.createdAt,
      ingredients: cards.ingredients,
      traits: cards.traits,
      previousOwners: cards.previousOwners,
      displayName: itemCatalog.displayName,
      normalizedName: itemCatalog.normalizedName,
      craftedByUsername: sql<string>`crafted_by.username`,
      ownerUsername: sql<string>`owner.username`,
    })
    .from(cards)
    .innerJoin(itemCatalog, eq(itemCatalog.id, cards.catalogId))
    .innerJoin(
      sql`app_users as crafted_by`,
      sql`crafted_by.id = ${cards.craftedByUserId}`,
    )
    .innerJoin(
      sql`app_users as owner`,
      sql`owner.id = ${cards.ownerUserId}`,
    )
    .where(eq(cards.status, 'active'))
    .orderBy(desc(cards.createdAt))
    .limit(6)

  const statsResult = await db
    .select({
      collectors: sql<number>`(select count(*)::int from app_users)`,
      liveCards: sql<number>`(select count(*)::int from cards where status = 'active')`,
      uniqueItems: sql<number>`(select count(*)::int from item_catalog)`,
      tradesCompleted: sql<number>`(select count(*)::int from trade_offers where status = 'accepted')`,
    })
    .from(sql`(select 1) as _`)

  const stats = statsResult[0] ?? { collectors: 0, liveCards: 0, uniqueItems: 0, tradesCompleted: 0 }

  return {
    authEnabled,
    viewer: viewer
      ? {
          username: viewer.username,
          craftsRemaining: viewer.craftsRemaining,
          referralCode: viewer.referralCode,
          totalReferrals: viewer.totalReferrals,
        }
      : null,
    leaderboardPreview: leaders.map((row, index) => ({
      rank: index + 1,
      username: row.username,
      itemCount: row.itemCount,
    })),
    recentDrops: recentDrops.map((row) => ({
      id: row.id,
      itemName: row.displayName,
      normalizedName: row.normalizedName,
      editionNumber: row.editionNumber,
      isShiny: row.isShiny,
      flavorText: row.flavorText,
      imageUrl: row.imageUrl,
      imagePrompt: row.imagePrompt,
      sourceType: row.sourceType,
      craftedAt: String(row.createdAt),
      craftedBy: row.craftedByUsername,
      owner: row.ownerUsername,
      ingredients: row.ingredients ?? [],
      traits: row.traits ?? [],
      previousOwners: row.previousOwners ?? [],
    })),
    stats: {
      collectors: stats.collectors,
      live_cards: stats.liveCards,
      unique_items: stats.uniqueItems,
      trades_completed: stats.tradesCompleted,
    },
    arena: todayArena(),
  }
}

export async function getInventory(username: string) {
  const inventory = await fetchInventory(username)
  if (!inventory) throw new AppError(404, 'Inventory not found.')
  return inventory
}

export async function upsertProfile(clerkUserId: string | null | undefined, input: unknown) {
  if (!authEnabled) throw new AppError(503, 'Clerk is not configured.')
  if (!clerkUserId) throw new AppError(401, 'Sign in required.')

  const payload = z
    .object({
      username: usernameSchema,
      referralCode: z.string().trim().max(32).optional(),
    })
    .parse(input)

  const existingUsername = await db
    .select({ id: appUsers.id, clerkUserId: appUsers.clerkUserId })
    .from(appUsers)
    .where(sql`lower(${appUsers.username}) = lower(${payload.username})`)
    .limit(1)
  if (existingUsername[0] && existingUsername[0].clerkUserId !== clerkUserId) {
    throw new AppError(409, 'Username is already taken.')
  }

  const existingUser = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.clerkUserId, clerkUserId))
    .limit(1)

  let referredByUserId: number | null = existingUser[0]?.referredByUserId ?? null
  if (!existingUser[0] && payload.referralCode?.trim()) {
    const referrer = await db
      .select({ id: appUsers.id })
      .from(appUsers)
      .where(eq(appUsers.referralCode, payload.referralCode.trim().toUpperCase()))
      .limit(1)
    referredByUserId = referrer[0]?.id ?? null
  }

  const userRows = await db
    .insert(appUsers)
    .values({
      clerkUserId,
      username: payload.username,
      referralCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      referredByUserId,
    })
    .onConflictDoUpdate({
      target: appUsers.clerkUserId,
      set: { username: payload.username },
    })
    .returning()

  const user = userRows[0]
  return {
    username: user.username,
    craftsRemaining: user.craftsRemaining,
    referralCode: user.referralCode,
    totalReferrals: user.totalReferrals,
  }
}

export async function craft(clerkUserId: string | null | undefined, input: unknown) {
  const viewer = await requireViewer(clerkUserId)
  const payload = craftSchema.parse(input)
  const validation = validateCraftWord(payload.word)
  if (!validation.ok) throw new AppError(400, validation.error)
  if (viewer.craftsRemaining <= 0) {
    throw new AppError(400, 'No crafts remaining. Earn more with referrals.')
  }

  const currentCards = await fetchCardsForUser(viewer.id)
  const creative = await generateCardCreative({
    word: validation.normalized,
    sourceType: 'craft',
    ingredients: [],
  })
  const isShiny = currentCards.length === 0
  const imageUrl = await generateCardImage(creative.imagePrompt, validation.normalized, isShiny)

  const result = await db.transaction(async (tx) => {
    // Upsert catalog entry
    const catalogRows = await tx
      .insert(itemCatalog)
      .values({
        normalizedName: validation.normalized,
        displayName: titleCase(validation.normalized),
        totalInstances: 1,
      })
      .onConflictDoUpdate({
        target: itemCatalog.normalizedName,
        set: {
          displayName: titleCase(validation.normalized),
          totalInstances: sql`${itemCatalog.totalInstances} + 1`,
        },
      })
      .returning({ id: itemCatalog.id, totalInstances: itemCatalog.totalInstances })
    const catalog = catalogRows[0]

    // Maybe grant referral crafts
    if (currentCards.length === 0 && viewer.referredByUserId && !viewer.referralRewardGranted) {
      await tx
        .update(appUsers)
        .set({
          craftsRemaining: sql`${appUsers.craftsRemaining} + 2`,
          totalReferrals: sql`${appUsers.totalReferrals} + 1`,
        })
        .where(eq(appUsers.id, viewer.referredByUserId))
      await tx
        .update(appUsers)
        .set({ referralRewardGranted: true })
        .where(eq(appUsers.id, viewer.id))
    }

    // Insert card
    const inserted = await tx
      .insert(cards)
      .values({
        catalogId: catalog.id,
        ownerUserId: viewer.id,
        craftedByUserId: viewer.id,
        sourceType: 'craft',
        isShiny,
        flavorText: creative.flavorText,
        imageUrl,
        imagePrompt: creative.imagePrompt,
        editionNumber: catalog.totalInstances,
        ingredients: [],
        traits: creative.traits,
        previousOwners: [viewer.username],
      })
      .returning({ id: cards.id })

    // Decrement crafts
    await tx
      .update(appUsers)
      .set({ craftsRemaining: sql`${appUsers.craftsRemaining} - 1` })
      .where(eq(appUsers.id, viewer.id))

    // Fetch full card with joins
    const rows = await tx
      .select({
        id: cards.id,
        editionNumber: cards.editionNumber,
        isShiny: cards.isShiny,
        flavorText: cards.flavorText,
        imageUrl: cards.imageUrl,
        imagePrompt: cards.imagePrompt,
        sourceType: cards.sourceType,
        createdAt: cards.createdAt,
        ingredients: cards.ingredients,
        traits: cards.traits,
        previousOwners: cards.previousOwners,
        displayName: itemCatalog.displayName,
        normalizedName: itemCatalog.normalizedName,
        craftedByUsername: sql<string>`crafted_by.username`,
        ownerUsername: sql<string>`owner.username`,
      })
      .from(cards)
      .innerJoin(itemCatalog, eq(itemCatalog.id, cards.catalogId))
      .innerJoin(sql`app_users as crafted_by`, sql`crafted_by.id = ${cards.craftedByUserId}`)
      .innerJoin(sql`app_users as owner`, sql`owner.id = ${cards.ownerUserId}`)
      .where(eq(cards.id, inserted[0].id))

    return rows[0]
  })

  return {
    card: {
      id: result.id,
      itemName: result.displayName,
      normalizedName: result.normalizedName,
      editionNumber: result.editionNumber,
      isShiny: result.isShiny,
      flavorText: result.flavorText,
      imageUrl: result.imageUrl,
      imagePrompt: result.imagePrompt,
      sourceType: result.sourceType,
      craftedAt: String(result.createdAt),
      craftedBy: result.craftedByUsername,
      owner: result.ownerUsername,
      ingredients: result.ingredients ?? [],
      traits: result.traits ?? [],
      previousOwners: result.previousOwners ?? [],
    },
  }
}

export async function fuse(clerkUserId: string | null | undefined, input: unknown) {
  const viewer = await requireViewer(clerkUserId)
  const payload = cardActionSchema.parse(input)

  const ownedCards = await db
    .select({
      id: cards.id,
      previousOwners: cards.previousOwners,
      displayName: itemCatalog.displayName,
    })
    .from(cards)
    .innerJoin(itemCatalog, eq(itemCatalog.id, cards.catalogId))
    .where(
      and(
        eq(cards.ownerUserId, viewer.id),
        eq(cards.status, 'active'),
        inArray(cards.id, payload.cardIds),
      ),
    )

  if (ownedCards.length !== payload.cardIds.length) {
    throw new AppError(400, 'You can only fuse cards you currently own.')
  }

  const ingredientNames = ownedCards.map((c) => c.displayName)
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

  const createdCard = await db.transaction(async (tx) => {
    const catalogRows = await tx
      .insert(itemCatalog)
      .values({
        normalizedName: fusionWord,
        displayName: titleCase(fusionWord),
        totalInstances: 1,
      })
      .onConflictDoUpdate({
        target: itemCatalog.normalizedName,
        set: {
          displayName: titleCase(fusionWord),
          totalInstances: sql`${itemCatalog.totalInstances} + 1`,
        },
      })
      .returning({ id: itemCatalog.id, totalInstances: itemCatalog.totalInstances })
    const catalog = catalogRows[0]

    // Destroy ingredient cards
    await tx
      .update(cards)
      .set({ status: 'destroyed', destroyedAt: new Date() })
      .where(inArray(cards.id, payload.cardIds))

    // Create fusion card
    const fusionTraits = [
      ...new Set([...ingredientNames.map(normalizeWord), ...creative.traits, 'fusion']),
    ].slice(0, 5)

    const inserted = await tx
      .insert(cards)
      .values({
        catalogId: catalog.id,
        ownerUserId: viewer.id,
        craftedByUserId: viewer.id,
        sourceType: 'fusion',
        isShiny: false,
        flavorText: creative.flavorText,
        imageUrl,
        imagePrompt: creative.imagePrompt,
        editionNumber: catalog.totalInstances,
        ingredients: ingredientNames,
        traits: fusionTraits,
        previousOwners: [viewer.username],
      })
      .returning({ id: cards.id })

    const rows = await tx
      .select({
        id: cards.id,
        editionNumber: cards.editionNumber,
        isShiny: cards.isShiny,
        flavorText: cards.flavorText,
        imageUrl: cards.imageUrl,
        imagePrompt: cards.imagePrompt,
        sourceType: cards.sourceType,
        createdAt: cards.createdAt,
        ingredients: cards.ingredients,
        traits: cards.traits,
        previousOwners: cards.previousOwners,
        displayName: itemCatalog.displayName,
        normalizedName: itemCatalog.normalizedName,
        craftedByUsername: sql<string>`crafted_by.username`,
        ownerUsername: sql<string>`owner.username`,
      })
      .from(cards)
      .innerJoin(itemCatalog, eq(itemCatalog.id, cards.catalogId))
      .innerJoin(sql`app_users as crafted_by`, sql`crafted_by.id = ${cards.craftedByUserId}`)
      .innerJoin(sql`app_users as owner`, sql`owner.id = ${cards.ownerUserId}`)
      .where(eq(cards.id, inserted[0].id))

    return rows[0]
  })

  return {
    card: {
      id: createdCard.id,
      itemName: createdCard.displayName,
      normalizedName: createdCard.normalizedName,
      editionNumber: createdCard.editionNumber,
      isShiny: createdCard.isShiny,
      flavorText: createdCard.flavorText,
      imageUrl: createdCard.imageUrl,
      imagePrompt: createdCard.imagePrompt,
      sourceType: createdCard.sourceType,
      craftedAt: String(createdCard.createdAt),
      craftedBy: createdCard.craftedByUsername,
      owner: createdCard.ownerUsername,
      ingredients: createdCard.ingredients ?? [],
      traits: createdCard.traits ?? [],
      previousOwners: createdCard.previousOwners ?? [],
    },
  }
}

export async function getTradeInbox(clerkUserId: string | null | undefined) {
  const viewer = await requireViewer(clerkUserId)

  // Use raw SQL for the nested jsonb_agg subquery — cleaner than a complex Drizzle join
  const offers = await db.execute(sql`
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
  `)

  return {
    offers: (offers as unknown as Record<string, unknown>[]).map((offer) => ({
      id: Number(offer.id),
      kind: String(offer.kind),
      message: String(offer.message),
      status: String(offer.status),
      createdAt: String(offer.created_at),
      fromUsername: String(offer.from_username),
      toUsername: String(offer.to_username),
      cards: Array.isArray(offer.cards) ? (offer.cards as Record<string, unknown>[]) : [],
    })),
  }
}

export async function createTrade(clerkUserId: string | null | undefined, input: unknown) {
  const viewer = await requireViewer(clerkUserId)
  const payload = offerSchema.parse(input)
  if (payload.offeredCardIds.length === 0 && payload.requestedCardIds.length === 0) {
    throw new AppError(400, 'Choose cards to send or request.')
  }

  const targets = await db
    .select()
    .from(appUsers)
    .where(sql`lower(${appUsers.username}) = lower(${payload.targetUsername})`)
    .limit(1)
  const target = targets[0]
  if (!target || target.id === viewer.id) {
    throw new AppError(404, 'Target collector not found.')
  }

  if (payload.offeredCardIds.length > 0) {
    const ownedOffered = await db
      .select({ id: cards.id })
      .from(cards)
      .where(
        and(
          eq(cards.ownerUserId, viewer.id),
          eq(cards.status, 'active'),
          inArray(cards.id, payload.offeredCardIds),
        ),
      )
    if (ownedOffered.length !== payload.offeredCardIds.length) {
      throw new AppError(400, 'You can only offer cards you own.')
    }
  }

  if (payload.requestedCardIds.length > 0) {
    const requestedCards = await db
      .select({ id: cards.id })
      .from(cards)
      .where(
        and(
          eq(cards.ownerUserId, target.id),
          eq(cards.status, 'active'),
          inArray(cards.id, payload.requestedCardIds),
        ),
      )
    if (requestedCards.length !== payload.requestedCardIds.length) {
      throw new AppError(400, 'Requested cards are no longer available.')
    }
  }

  const kind = payload.requestedCardIds.length === 0 ? 'gift' : 'offer'

  const offer = await db.transaction(async (tx) => {
    const created = await tx
      .insert(tradeOffers)
      .values({
        fromUserId: viewer.id,
        toUserId: target.id,
        kind,
        message: payload.message,
      })
      .returning({ id: tradeOffers.id })

    for (const cardId of payload.offeredCardIds) {
      await tx.insert(tradeOfferCards).values({
        offerId: created[0].id,
        cardId,
        side: 'offered',
      })
    }
    for (const cardId of payload.requestedCardIds) {
      await tx.insert(tradeOfferCards).values({
        offerId: created[0].id,
        cardId,
        side: 'requested',
      })
    }
    return created[0]
  })

  return { offerId: offer.id }
}

export async function respondTrade(
  clerkUserId: string | null | undefined,
  tradeId: number,
  input: unknown,
) {
  const viewer = await requireViewer(clerkUserId)
  const payload = z.object({ action: z.enum(['accepted', 'rejected']) }).parse(input)

  const offers = await db
    .select()
    .from(tradeOffers)
    .where(
      and(
        eq(tradeOffers.id, tradeId),
        eq(tradeOffers.toUserId, viewer.id),
        eq(tradeOffers.status, 'pending'),
      ),
    )
    .limit(1)
  const offer = offers[0]
  if (!offer) throw new AppError(404, 'Pending trade not found.')

  if (payload.action === 'rejected') {
    await db
      .update(tradeOffers)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(tradeOffers.id, tradeId))
    return { ok: true }
  }

  await db.transaction(async (tx) => {
    const tradeCards = await tx
      .select({
        side: tradeOfferCards.side,
        cardId: tradeOfferCards.cardId,
        ownerUserId: cards.ownerUserId,
        previousOwners: cards.previousOwners,
      })
      .from(tradeOfferCards)
      .innerJoin(cards, and(eq(cards.id, tradeOfferCards.cardId), eq(cards.status, 'active')))
      .where(eq(tradeOfferCards.offerId, tradeId))

    const offered = tradeCards.filter((c) => c.side === 'offered')
    const requested = tradeCards.filter((c) => c.side === 'requested')

    if (
      offered.some((c) => c.ownerUserId !== offer.fromUserId) ||
      requested.some((c) => c.ownerUserId !== offer.toUserId)
    ) {
      throw new AppError(409, 'Trade cards changed owners before acceptance.')
    }

    for (const card of offered) {
      const prev = [...(card.previousOwners ?? []), viewer.username]
      await tx
        .update(cards)
        .set({ ownerUserId: offer.toUserId, previousOwners: prev })
        .where(eq(cards.id, card.cardId))
    }

    const senderRows = await tx
      .select({ username: appUsers.username })
      .from(appUsers)
      .where(eq(appUsers.id, offer.fromUserId))
      .limit(1)

    for (const card of requested) {
      const prev = [...(card.previousOwners ?? []), senderRows[0].username]
      await tx
        .update(cards)
        .set({ ownerUserId: offer.fromUserId, previousOwners: prev })
        .where(eq(cards.id, card.cardId))
    }

    await tx
      .update(tradeOffers)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(tradeOffers.id, tradeId))
  })

  return { ok: true }
}

export async function getLeaderboard() {
  const rows = await db
    .select({
      username: appUsers.username,
      itemCount: sql<number>`count(${cards.id})::int`,
      shinyCount: sql<number>`count(case when ${cards.isShiny} then 1 end)::int`,
      bestDuelScore: sql<number>`coalesce(max(${duelRuns.score}), 0)::int`,
    })
    .from(appUsers)
    .leftJoin(cards, and(eq(cards.ownerUserId, appUsers.id), eq(cards.status, 'active')))
    .leftJoin(duelRuns, eq(duelRuns.userId, appUsers.id))
    .groupBy(appUsers.id)
    .orderBy(sql`count(${cards.id}) desc`, sql`count(case when ${cards.isShiny} then 1 end) desc`, asc(appUsers.createdAt))
    .limit(100)

  return {
    leaderboard: rows.map((row, index) => ({
      rank: index + 1,
      username: row.username,
      itemCount: row.itemCount,
      shinyCount: row.shinyCount,
      bestDuelScore: row.bestDuelScore,
    })),
  }
}

export async function getArena(clerkUserId?: string | null) {
  const viewer = await getViewer(clerkUserId)
  const arena = todayArena()
  const userCards = viewer ? await fetchCardsForUser(viewer.id) : []
  return {
    arena,
    cards: userCards,
    recommendedCards: userCards
      .filter((card) => card.traits.some((trait) => arena.wantedTraits.includes(trait)))
      .slice(0, 6),
  }
}

export async function duelArena(clerkUserId: string | null | undefined, input: unknown) {
  const viewer = await requireViewer(clerkUserId)
  const payload = duelSchema.parse(input)
  const userCards = await fetchCardsForUser(viewer.id)
  const selected = payload.cardIds
    .map((id) => userCards.find((card) => card.id === id))
    .filter(Boolean) as InventoryCard[]

  if (selected.length !== 3) {
    throw new AppError(400, 'Choose exactly three cards you own.')
  }

  const arena = todayArena()
  const score = selected.reduce((total, card, index) => {
    let s = card.editionNumber <= 3 ? 18 - (card.editionNumber - 1) * 4 : 8
    if (card.isShiny) s += 15
    if (card.itemName.length >= 6) s += 7
    if (card.traits.some((t) => arena.wantedTraits.includes(t))) s += 12
    if (card.traits.includes(arena.wantedTraits[1])) s += 8
    return total + s + index * 2
  }, 0)

  const threshold = 72
  const verdict = score >= threshold ? 'win' : 'loss'

  await db.insert(duelRuns).values({
    userId: viewer.id,
    selectedCardIds: payload.cardIds,
    score,
    verdict,
  })

  return {
    verdict,
    score,
    threshold,
    arena,
    summary:
      verdict === 'win'
        ? 'Your lineup matched the arena pulse and held the vault.'
        : 'The arena exposed a gap in your collection. Hunt stronger synergies.',
  }
}
