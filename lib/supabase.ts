/**
 * Supabase client — ready to connect.
 *
 * 1. Create a project at https://supabase.com
 * 2. Copy `.env.local.example` to `.env.local` and fill in your values
 *    (see that file for exactly which keys go where).
 * 3. Everywhere in this codebase that currently reads/writes to the local
 *    Zustand store (see `lib/store.ts`) is marked with a `// TODO: SUPABASE`
 *    comment showing the query that would replace it, e.g.:
 *
 *      // TODO: SUPABASE — replace with:
 *      // const { data, error } = await supabase.from("products").select("*");
 *
 * Until you add real env vars, `supabase` below will be `null` and the app
 * keeps working exactly as it does now (data lives in the browser only).
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

/**
 * Table schema — paste into the Supabase SQL editor (Project -> SQL Editor
 * -> New query) before connecting. Column names match lib/db.ts exactly.
 *
 * create table categories (
 *   id text primary key,
 *   name text not null,
 *   description text,
 *   color text
 * );
 *
 * create table suppliers (
 *   id text primary key,
 *   name text not null,
 *   contact_name text,
 *   email text,
 *   phone text,
 *   address text,
 *   lead_time_days int
 * );
 *
 * create table products (
 *   id text primary key,
 *   sku text unique not null,
 *   name text not null,
 *   category_id text references categories(id),
 *   supplier_id text references suppliers(id),
 *   unit text,
 *   cost_price numeric not null default 0,
 *   sell_price numeric not null default 0,
 *   quantity int not null default 0,
 *   reorder_level int not null default 0,
 *   location text,
 *   created_at timestamptz default now()
 * );
 *
 * create table receipts (
 *   id text primary key,
 *   type text check (type in ('sale','purchase')) not null,
 *   receipt_number text not null,
 *   party_name text,
 *   party_contact text,
 *   party_address text,
 *   date timestamptz not null default now(),
 *   items jsonb not null,
 *   discount_percent numeric not null default 0,
 *   tax_percent numeric not null default 0,
 *   subtotal numeric not null default 0,
 *   discount_amount numeric not null default 0,
 *   tax_amount numeric not null default 0,
 *   total numeric not null default 0,
 *   note text
 * );
 *
 * -- Enable Row Level Security + a permissive policy so the anon key can
 * -- read/write. Fine for a single-user/internal tool; tighten later if
 * -- you add real multi-user auth.
 * alter table categories enable row level security;
 * alter table suppliers enable row level security;
 * alter table products enable row level security;
 * alter table receipts enable row level security;
 *
 * create policy "allow all - categories" on categories for all using (true) with check (true);
 * create policy "allow all - suppliers" on suppliers for all using (true) with check (true);
 * create policy "allow all - products" on products for all using (true) with check (true);
 * create policy "allow all - receipts" on receipts for all using (true) with check (true);
 *
 * -- Turn on Realtime for each table: Database -> Replication -> click
 * -- each table (categories, suppliers, products, receipts) to enable it.
 * -- Without this step the app still works, it just won't auto-update
 * -- across browser tabs/devices until you refresh.
 */
