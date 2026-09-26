-- ============================================================
-- Stockbase — Supabase schema
-- Paste this whole file into: Supabase Dashboard -> SQL Editor
-- -> New query -> Run
-- ============================================================

-- --- Tables ---------------------------------------------------

create table if not exists categories (
  id text primary key,
  name text not null,
  description text,
  color text
);

create table if not exists suppliers (
  id text primary key,
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  lead_time_days int
);

create table if not exists products (
  id text primary key,
  sku text unique not null,
  name text not null,
  category_id text references categories(id) on delete set null,
  supplier_id text references suppliers(id) on delete set null,
  unit text,
  cost_price numeric not null default 0,
  sell_price numeric not null default 0,
  quantity int not null default 0,
  reorder_level int not null default 0,
  location text,
  created_at timestamptz default now()
);

create table if not exists receipts (
  id text primary key,
  type text check (type in ('sale', 'purchase')) not null,
  receipt_number text not null,
  party_name text,
  party_contact text,
  party_address text,
  date timestamptz not null default now(),
  items jsonb not null,
  discount_percent numeric not null default 0,
  tax_percent numeric not null default 0,
  subtotal numeric not null default 0,
  discount_amount numeric not null default 0,
  tax_amount numeric not null default 0,
  total numeric not null default 0,
  note text
);

-- --- Row Level Security ----------------------------------------
-- Enabled + a permissive "allow all" policy so the app's anon key can
-- read/write. Fine for a single-user / internal tool. Tighten these
-- later if you add real multi-user auth.

alter table categories enable row level security;
alter table suppliers  enable row level security;
alter table products   enable row level security;
alter table receipts   enable row level security;

drop policy if exists "allow all - categories" on categories;
create policy "allow all - categories" on categories
  for all using (true) with check (true);

drop policy if exists "allow all - suppliers" on suppliers;
create policy "allow all - suppliers" on suppliers
  for all using (true) with check (true);

drop policy if exists "allow all - products" on products;
create policy "allow all - products" on products
  for all using (true) with check (true);

drop policy if exists "allow all - receipts" on receipts;
create policy "allow all - receipts" on receipts
  for all using (true) with check (true);

-- --- Realtime ----------------------------------------------------
-- Adds all four tables to the supabase_realtime publication so the
-- app gets live updates without you touching the dashboard UI.
-- (You can double check / toggle these under Database -> Replication.)
-- Wrapped so it's safe to re-run even if already added.

do $$
begin
  begin
    alter publication supabase_realtime add table categories;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table suppliers;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table products;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table receipts;
  exception when duplicate_object then null;
  end;
end $$;

-- ============================================================
-- Done. Your tables start empty — nothing here inserts demo/dummy
-- data. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
-- to .env.local in the app and it will connect automatically.
-- ============================================================
