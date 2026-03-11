import {
  pgTable,
  bigserial,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  bigint,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const appUsers = pgTable(
  'app_users',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    clerkUserId: text('clerk_user_id').notNull().unique(),
    username: text().notNull(),
    referralCode: text('referral_code').notNull().unique(),
    referredByUserId: bigint('referred_by_user_id', { mode: 'number' }).references(
      (): any => appUsers.id,
    ),
    referralRewardGranted: boolean('referral_reward_granted').notNull().default(false),
    craftsRemaining: integer('crafts_remaining').notNull().default(2),
    totalReferrals: integer('total_referrals').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('app_users_username_lower_idx').on(sql`lower(${table.username})`),
  ],
)

export const itemCatalog = pgTable('item_catalog', {
  id: bigserial({ mode: 'number' }).primaryKey(),
  normalizedName: text('normalized_name').notNull().unique(),
  displayName: text('display_name').notNull(),
  totalInstances: integer('total_instances').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const cards = pgTable(
  'cards',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    catalogId: bigint('catalog_id', { mode: 'number' })
      .notNull()
      .references(() => itemCatalog.id),
    ownerUserId: bigint('owner_user_id', { mode: 'number' })
      .notNull()
      .references(() => appUsers.id),
    craftedByUserId: bigint('crafted_by_user_id', { mode: 'number' })
      .notNull()
      .references(() => appUsers.id),
    sourceType: text('source_type').notNull(),
    isShiny: boolean('is_shiny').notNull().default(false),
    flavorText: text('flavor_text').notNull(),
    imageUrl: text('image_url').notNull(),
    imagePrompt: text('image_prompt').notNull(),
    editionNumber: integer('edition_number').notNull(),
    ingredients: jsonb().$type<string[]>().notNull().default([]),
    traits: jsonb().$type<string[]>().notNull().default([]),
    previousOwners: jsonb('previous_owners').$type<string[]>().notNull().default([]),
    status: text().notNull().default('active'),
    destroyedAt: timestamp('destroyed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('cards_owner_idx').on(table.ownerUserId),
    index('cards_catalog_idx').on(table.catalogId),
  ],
)

export const tradeOffers = pgTable('trade_offers', {
  id: bigserial({ mode: 'number' }).primaryKey(),
  fromUserId: bigint('from_user_id', { mode: 'number' })
    .notNull()
    .references(() => appUsers.id),
  toUserId: bigint('to_user_id', { mode: 'number' })
    .notNull()
    .references(() => appUsers.id),
  kind: text().notNull(),
  message: text().notNull().default(''),
  status: text().notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tradeOfferCards = pgTable('trade_offer_cards', {
  id: bigserial({ mode: 'number' }).primaryKey(),
  offerId: bigint('offer_id', { mode: 'number' })
    .notNull()
    .references(() => tradeOffers.id, { onDelete: 'cascade' }),
  cardId: bigint('card_id', { mode: 'number' })
    .notNull()
    .references(() => cards.id),
  side: text().notNull(),
})

export const duelRuns = pgTable('duel_runs', {
  id: bigserial({ mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => appUsers.id),
  selectedCardIds: jsonb('selected_card_ids').$type<number[]>().notNull().default([]),
  score: integer().notNull(),
  verdict: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
