alter table public.orders
    add column if not exists provider_order_id text,
    add column if not exists provider_payment_id text,
    add column if not exists paid_at timestamptz,
    add column if not exists approved_at timestamptz;

create or replace function public.finalize_order_payment(
    p_order_id uuid,
    p_payment_provider text,
    p_provider_order_id text default null,
    p_provider_payment_id text default null,
    p_final_status text default 'approved'
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
    target_order public.orders;
    next_status text;
begin
    next_status := case
        when p_final_status in ('paid', 'approved') then p_final_status
        else 'approved'
    end;

    select *
    into target_order
    from public.orders
    where id = p_order_id
    limit 1;

    if not found then
        raise exception 'Order not found';
    end if;

    update public.orders
    set
        status = next_status,
        payment_status = 'paid',
        payment_provider = coalesce(p_payment_provider, payment_provider),
        provider_order_id = coalesce(p_provider_order_id, provider_order_id),
        provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
        paid_at = coalesce(paid_at, timezone('utc', now())),
        approved_at = case
            when next_status = 'approved' then coalesce(approved_at, timezone('utc', now()))
            else approved_at
        end,
        updated_at = timezone('utc', now())
    where id = p_order_id
    returning * into target_order;

    if target_order.coupon_code is not null and target_order.discount_amount > 0 then
        insert into public.coupon_redemptions (
            user_id,
            order_id,
            coupon_code,
            discount_amount,
            status
        )
        values (
            target_order.user_id,
            target_order.id,
            target_order.coupon_code,
            target_order.discount_amount,
            'redeemed'
        )
        on conflict (user_id, coupon_code)
        where status in ('reserved', 'redeemed')
        do update
        set
            order_id = excluded.order_id,
            discount_amount = excluded.discount_amount,
            status = 'redeemed';
    end if;

    return target_order;
end;
$$;

revoke all on function public.finalize_order_payment(uuid, text, text, text, text) from public;
revoke all on function public.finalize_order_payment(uuid, text, text, text, text) from anon;
revoke all on function public.finalize_order_payment(uuid, text, text, text, text) from authenticated;