create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    status text not null default 'checkout_started' check (status in ('checkout_started', 'awaiting_payment', 'paid', 'approved', 'cancelled', 'refunded')),
    payment_status text not null default 'pending' check (payment_status in ('pending', 'authorized', 'paid', 'failed', 'cancelled', 'refunded')),
    payment_provider text,
    shipping_zip_code text,
    shipping_amount numeric(10,2) not null default 0,
    subtotal_amount numeric(10,2) not null default 0,
    discount_amount numeric(10,2) not null default 0,
    total_amount numeric(10,2) not null default 0,
    coupon_code text,
    coupon_snapshot jsonb not null default '{}'::jsonb,
    notes text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists orders_user_id_idx on public.orders (user_id, created_at desc);
create index if not exists orders_user_status_idx on public.orders (user_id, status);

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.orders enable row level security;

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
on public.orders
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
on public.orders
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "orders_update_own" on public.orders;
create policy "orders_update_own"
on public.orders
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete cascade,
    product_id bigint not null,
    product_name text not null,
    product_image text,
    category text,
    color text,
    unit_price numeric(10,2) not null,
    quantity integer not null check (quantity > 0),
    line_total numeric(10,2) not null,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_user_id_idx on public.order_items (user_id, created_at desc);

alter table public.order_items enable row level security;

drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own"
on public.order_items
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own"
on public.order_items
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "order_items_update_own" on public.order_items;
create policy "order_items_update_own"
on public.order_items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "order_items_delete_own" on public.order_items;
create policy "order_items_delete_own"
on public.order_items
for delete
to authenticated
using (auth.uid() = user_id);

create table if not exists public.coupon_redemptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    order_id uuid references public.orders (id) on delete set null,
    coupon_code text not null,
    discount_amount numeric(10,2) not null default 0,
    status text not null default 'redeemed' check (status in ('reserved', 'redeemed', 'cancelled')),
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists coupon_redemptions_user_coupon_idx on public.coupon_redemptions (user_id, coupon_code);
create unique index if not exists coupon_redemptions_single_use_idx
on public.coupon_redemptions (user_id, coupon_code)
where status in ('reserved', 'redeemed');

alter table public.coupon_redemptions enable row level security;

drop policy if exists "coupon_redemptions_select_own" on public.coupon_redemptions;
create policy "coupon_redemptions_select_own"
on public.coupon_redemptions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "coupon_redemptions_insert_own" on public.coupon_redemptions;
create policy "coupon_redemptions_insert_own"
on public.coupon_redemptions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "coupon_redemptions_update_own" on public.coupon_redemptions;
create policy "coupon_redemptions_update_own"
on public.coupon_redemptions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);