create extension if not exists pgcrypto;

create table if not exists app_users (
  id bigserial primary key,
  clerk_user_id text not null unique,
  username text not null,
  referral_code text not null unique,
  referred_by_user_id bigint references app_users(id),
  referral_reward_granted boolean not null default false,
  crafts_remaining integer not null default 2,
  total_referrals integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists app_users_username_lower_idx on app_users (lower(username));

create table if not exists item_catalog (
  id bigserial primary key,
  normalized_name text not null unique,
  display_name text not null,
  total_instances integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists cards (
  id bigserial primary key,
  catalog_id bigint not null references item_catalog(id),
  owner_user_id bigint not null references app_users(id),
  crafted_by_user_id bigint not null references app_users(id),
  source_type text not null check (source_type in ('craft', 'fusion')),
  is_shiny boolean not null default false,
  flavor_text text not null,
  image_url text not null,
  image_prompt text not null,
  edition_number integer not null,
  ingredients jsonb not null default '[]'::jsonb,
  traits jsonb not null default '[]'::jsonb,
  previous_owners jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'destroyed')),
  destroyed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists cards_owner_idx on cards (owner_user_id);
create index if not exists cards_catalog_idx on cards (catalog_id);

create table if not exists trade_offers (
  id bigserial primary key,
  from_user_id bigint not null references app_users(id),
  to_user_id bigint not null references app_users(id),
  kind text not null check (kind in ('offer', 'gift')),
  message text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trade_offer_cards (
  id bigserial primary key,
  offer_id bigint not null references trade_offers(id) on delete cascade,
  card_id bigint not null references cards(id),
  side text not null check (side in ('offered', 'requested'))
);

create table if not exists duel_runs (
  id bigserial primary key,
  user_id bigint not null references app_users(id),
  selected_card_ids jsonb not null default '[]'::jsonb,
  score integer not null,
  verdict text not null check (verdict in ('win', 'loss')),
  created_at timestamptz not null default now()
);
