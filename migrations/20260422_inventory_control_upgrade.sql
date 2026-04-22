alter table public.inventory_items
  add column if not exists is_active boolean not null default true;

create table if not exists public.inventory_movements (
  id text primary key,
  merchant_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  product_name text not null,
  reason text not null check (
    reason in (
      'sale',
      'order-received',
      'manual-entry',
      'inventory-correction',
      'breakage-loss',
      'manual-output'
    )
  ),
  quantity_change integer not null check (quantity_change <> 0),
  stock_after integer not null check (stock_after >= 0),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists inventory_movements_merchant_id_idx
  on public.inventory_movements (merchant_id);

create index if not exists inventory_movements_product_id_idx
  on public.inventory_movements (product_id);

create index if not exists inventory_movements_merchant_id_created_at_idx
  on public.inventory_movements (merchant_id, created_at desc);

alter table public.inventory_movements enable row level security;

create policy "inventory_movements_select_own"
  on public.inventory_movements
  for select
  using (auth.uid() = merchant_id);

create policy "inventory_movements_insert_own"
  on public.inventory_movements
  for insert
  with check (auth.uid() = merchant_id);

create policy "inventory_movements_update_own"
  on public.inventory_movements
  for update
  using (auth.uid() = merchant_id)
  with check (auth.uid() = merchant_id);

create policy "inventory_movements_delete_own"
  on public.inventory_movements
  for delete
  using (auth.uid() = merchant_id);
