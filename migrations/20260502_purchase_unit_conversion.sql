-- Purchase-unit to sale-unit conversion support for the merchant MVP.
-- Stock quantities remain canonical in the smallest/base unit.

alter table public.inventory_items
  add column if not exists base_unit_name text not null default 'unité',
  add column if not exists purchase_unit_name text not null default 'unité',
  add column if not exists purchase_unit_size integer not null default 1,
  add column if not exists sale_unit_name text not null default 'unité',
  add column if not exists sale_unit_size integer not null default 1,
  add column if not exists unit_schema_version smallint not null default 0;

update public.inventory_items
set
  base_unit_name = coalesce(nullif(trim(base_unit_name), ''), 'unité'),
  purchase_unit_name = coalesce(nullif(trim(purchase_unit_name), ''), base_unit_name, 'unité'),
  purchase_unit_size = greatest(coalesce(purchase_unit_size, 1), 1),
  sale_unit_name = coalesce(nullif(trim(sale_unit_name), ''), base_unit_name, 'unité'),
  sale_unit_size = greatest(coalesce(sale_unit_size, 1), 1),
  unit_schema_version = coalesce(unit_schema_version, 0);

alter table public.supplier_order_items
  add column if not exists quantity_base integer,
  add column if not exists display_unit_name text,
  add column if not exists unit_size integer,
  add column if not exists base_unit_name text;

update public.supplier_order_items
set
  quantity_base = coalesce(quantity_base, quantity),
  display_unit_name = coalesce(nullif(trim(display_unit_name), ''), 'unité'),
  unit_size = greatest(coalesce(unit_size, 1), 1),
  base_unit_name = coalesce(nullif(trim(base_unit_name), ''), 'unité');

alter table public.supplier_order_items
  alter column quantity_base set default 0,
  alter column display_unit_name set default 'unité',
  alter column unit_size set default 1,
  alter column base_unit_name set default 'unité';

alter table public.supplier_order_items
  alter column quantity_base set not null,
  alter column display_unit_name set not null,
  alter column unit_size set not null,
  alter column base_unit_name set not null;

alter table public.sales
  add column if not exists quantity_base integer,
  add column if not exists display_unit_name text,
  add column if not exists unit_size integer;

update public.sales
set
  quantity_base = coalesce(quantity_base, quantity),
  display_unit_name = coalesce(nullif(trim(display_unit_name), ''), 'unité'),
  unit_size = greatest(coalesce(unit_size, 1), 1);

alter table public.sales
  alter column quantity_base set default 0,
  alter column display_unit_name set default 'unité',
  alter column unit_size set default 1;

alter table public.sales
  alter column quantity_base set not null,
  alter column display_unit_name set not null,
  alter column unit_size set not null;

alter table public.inventory_movements
  add column if not exists movement_type text,
  add column if not exists display_quantity integer,
  add column if not exists display_unit_name text,
  add column if not exists unit_size integer;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'inventory_movements'
      and column_name = 'reason'
  ) then
    update public.inventory_movements
    set movement_type = reason
    where movement_type is null;

    alter table public.inventory_movements
      alter column reason drop not null;
  end if;
end $$;

update public.inventory_movements
set
  movement_type = coalesce(nullif(trim(movement_type), ''), 'manual-entry'),
  display_quantity = coalesce(display_quantity, abs(quantity_change)),
  display_unit_name = coalesce(nullif(trim(display_unit_name), ''), 'unité'),
  unit_size = greatest(coalesce(unit_size, 1), 1);

do $$
declare
  check_constraint record;
begin
  for check_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.inventory_movements'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%movement_type%'
  loop
    execute format(
      'alter table public.inventory_movements drop constraint %I',
      check_constraint.conname
    );
  end loop;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'inventory_movements_movement_type_valid'
  ) then
    alter table public.inventory_movements
      add constraint inventory_movements_movement_type_valid
      check (
        movement_type in (
          'stock_initial',
          'sale',
          'order-received',
          'manual-entry',
          'inventory-correction',
          'breakage-loss',
          'manual-output'
        )
      );
  end if;
end $$;

alter table public.inventory_movements
  alter column movement_type set default 'manual-entry',
  alter column display_quantity set default 0,
  alter column display_unit_name set default 'unité',
  alter column unit_size set default 1;

alter table public.inventory_movements
  alter column movement_type set not null,
  alter column display_quantity set not null,
  alter column display_unit_name set not null,
  alter column unit_size set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inventory_items_purchase_unit_size_positive'
  ) then
    alter table public.inventory_items
      add constraint inventory_items_purchase_unit_size_positive
      check (purchase_unit_size >= 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'inventory_items_sale_unit_size_positive'
  ) then
    alter table public.inventory_items
      add constraint inventory_items_sale_unit_size_positive
      check (sale_unit_size >= 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'supplier_order_items_unit_size_positive'
  ) then
    alter table public.supplier_order_items
      add constraint supplier_order_items_unit_size_positive
      check (unit_size >= 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_unit_size_positive'
  ) then
    alter table public.sales
      add constraint sales_unit_size_positive
      check (unit_size >= 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'inventory_movements_unit_size_positive'
  ) then
    alter table public.inventory_movements
      add constraint inventory_movements_unit_size_positive
      check (unit_size >= 1);
  end if;
end $$;
