create table if not exists public.inventory_items (
  id text primary key,
  merchant_id uuid not null references auth.users (id) on delete cascade,
  sku text not null,
  name text not null,
  category text not null,
  supplier text not null,
  neighborhood text not null,
  unit_price integer not null check (unit_price >= 0),
  selling_price integer not null check (selling_price >= 0),
  pack_size text not null,
  min_order text not null,
  stock_on_hand integer not null default 0 check (stock_on_hand >= 0),
  reorder_point integer not null default 0 check (reorder_point >= 0),
  reorder_quantity integer not null default 0 check (reorder_quantity >= 0),
  lead_time_days integer not null default 1 check (lead_time_days >= 0),
  last_restocked_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists inventory_items_merchant_id_idx
  on public.inventory_items (merchant_id);

create unique index if not exists inventory_items_merchant_id_sku_idx
  on public.inventory_items (merchant_id, sku);

create table if not exists public.supplier_orders (
  id text primary key,
  merchant_id uuid not null references auth.users (id) on delete cascade,
  reference text not null,
  supplier_name text not null,
  status text not null check (
    status in (
      'Draft',
      'Pending',
      'Confirmed',
      'Packed',
      'In Transit',
      'Delivered',
      'Cancelled'
    )
  ),
  source text not null check (source in ('Home', 'Orders', 'Inventory')),
  source_detail text not null check (
    source_detail in (
      'manual-new-order',
      'quick-reorder',
      'low-stock-reorder',
      'inventory-restock',
      'saved-basket-reload'
    )
  ),
  delivery_address text not null default 'Delivery details pending',
  notes text,
  total_amount integer not null default 0 check (total_amount >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  eta_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists supplier_orders_merchant_id_idx
  on public.supplier_orders (merchant_id);

create index if not exists supplier_orders_merchant_id_status_idx
  on public.supplier_orders (merchant_id, status);

create unique index if not exists supplier_orders_merchant_reference_idx
  on public.supplier_orders (merchant_id, reference);

create table if not exists public.supplier_order_items (
  id text primary key,
  merchant_id uuid not null references auth.users (id) on delete cascade,
  supplier_order_id text not null references public.supplier_orders (id) on delete cascade,
  product_id text not null,
  name text not null,
  supplier text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  pack_size text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists supplier_order_items_merchant_id_idx
  on public.supplier_order_items (merchant_id);

create index if not exists supplier_order_items_order_id_idx
  on public.supplier_order_items (supplier_order_id);

create table if not exists public.sales (
  id text primary key,
  merchant_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  product_name text not null,
  category text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  total_amount integer not null check (total_amount >= 0),
  payment_method text not null check (payment_method in ('Cash', 'Mobile Money', 'Card')),
  sold_at timestamptz not null,
  stock_after_sale integer not null check (stock_after_sale >= 0),
  triggered_low_stock boolean not null default false,
  quick_added_product boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists sales_merchant_id_idx
  on public.sales (merchant_id);

create index if not exists sales_merchant_id_sold_at_idx
  on public.sales (merchant_id, sold_at desc);

create table if not exists public.delivery_updates (
  id text primary key,
  merchant_id uuid not null references auth.users (id) on delete cascade,
  supplier_order_id text not null references public.supplier_orders (id) on delete cascade,
  status text not null check (
    status in (
      'Pending',
      'Confirmed',
      'Packed',
      'In Transit',
      'Delivered',
      'Cancelled'
    )
  ),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists delivery_updates_merchant_id_idx
  on public.delivery_updates (merchant_id);

create index if not exists delivery_updates_order_id_idx
  on public.delivery_updates (supplier_order_id);

create table if not exists public.activity_feed (
  id text primary key,
  merchant_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('alert', 'order', 'delivery', 'sale')),
  tone text not null check (tone in ('accent', 'warning', 'success')),
  title text not null,
  detail text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists activity_feed_merchant_id_idx
  on public.activity_feed (merchant_id);

create index if not exists activity_feed_merchant_id_created_at_idx
  on public.activity_feed (merchant_id, created_at desc);

alter table public.inventory_items enable row level security;
alter table public.supplier_orders enable row level security;
alter table public.supplier_order_items enable row level security;
alter table public.sales enable row level security;
alter table public.delivery_updates enable row level security;
alter table public.activity_feed enable row level security;

create policy "inventory_items_select_own"
  on public.inventory_items
  for select
  using (auth.uid() = merchant_id);

create policy "inventory_items_insert_own"
  on public.inventory_items
  for insert
  with check (auth.uid() = merchant_id);

create policy "inventory_items_update_own"
  on public.inventory_items
  for update
  using (auth.uid() = merchant_id)
  with check (auth.uid() = merchant_id);

create policy "inventory_items_delete_own"
  on public.inventory_items
  for delete
  using (auth.uid() = merchant_id);

create policy "supplier_orders_select_own"
  on public.supplier_orders
  for select
  using (auth.uid() = merchant_id);

create policy "supplier_orders_insert_own"
  on public.supplier_orders
  for insert
  with check (auth.uid() = merchant_id);

create policy "supplier_orders_update_own"
  on public.supplier_orders
  for update
  using (auth.uid() = merchant_id)
  with check (auth.uid() = merchant_id);

create policy "supplier_orders_delete_own"
  on public.supplier_orders
  for delete
  using (auth.uid() = merchant_id);

create policy "supplier_order_items_select_own"
  on public.supplier_order_items
  for select
  using (auth.uid() = merchant_id);

create policy "supplier_order_items_insert_own"
  on public.supplier_order_items
  for insert
  with check (auth.uid() = merchant_id);

create policy "supplier_order_items_update_own"
  on public.supplier_order_items
  for update
  using (auth.uid() = merchant_id)
  with check (auth.uid() = merchant_id);

create policy "supplier_order_items_delete_own"
  on public.supplier_order_items
  for delete
  using (auth.uid() = merchant_id);

create policy "sales_select_own"
  on public.sales
  for select
  using (auth.uid() = merchant_id);

create policy "sales_insert_own"
  on public.sales
  for insert
  with check (auth.uid() = merchant_id);

create policy "sales_update_own"
  on public.sales
  for update
  using (auth.uid() = merchant_id)
  with check (auth.uid() = merchant_id);

create policy "sales_delete_own"
  on public.sales
  for delete
  using (auth.uid() = merchant_id);

create policy "delivery_updates_select_own"
  on public.delivery_updates
  for select
  using (auth.uid() = merchant_id);

create policy "delivery_updates_insert_own"
  on public.delivery_updates
  for insert
  with check (auth.uid() = merchant_id);

create policy "delivery_updates_update_own"
  on public.delivery_updates
  for update
  using (auth.uid() = merchant_id)
  with check (auth.uid() = merchant_id);

create policy "delivery_updates_delete_own"
  on public.delivery_updates
  for delete
  using (auth.uid() = merchant_id);

create policy "activity_feed_select_own"
  on public.activity_feed
  for select
  using (auth.uid() = merchant_id);

create policy "activity_feed_insert_own"
  on public.activity_feed
  for insert
  with check (auth.uid() = merchant_id);

create policy "activity_feed_update_own"
  on public.activity_feed
  for update
  using (auth.uid() = merchant_id)
  with check (auth.uid() = merchant_id);

create policy "activity_feed_delete_own"
  on public.activity_feed
  for delete
  using (auth.uid() = merchant_id);
