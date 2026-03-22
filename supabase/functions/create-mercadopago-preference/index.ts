// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const supabaseUrl = Deno.env.get('APP_SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('APP_SUPABASE_ANON_KEY') || '';
const supabaseServiceRoleKey = Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY') || '';
const mercadoPagoAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || '';
const publicSiteUrl = (Deno.env.get('PUBLIC_SITE_URL') || '').replace(/\/$/, '');

function getMercadoPagoPictureUrl(imagePath: string | null | undefined) {
    if (!imagePath) {
        return undefined;
    }

    try {
        const parsedUrl = new URL(imagePath);

        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return undefined;
        }

        if (parsedUrl.hostname === '127.0.0.1' || parsedUrl.hostname === 'localhost') {
            return undefined;
        }

        return parsedUrl.toString();
    } catch {
        return undefined;
    }
}

function getPublicRedirectBaseUrl(siteUrl: string) {
    if (!siteUrl) {
        return '';
    }

    try {
        const parsedUrl = new URL(siteUrl);

        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return '';
        }

        if (parsedUrl.hostname === '127.0.0.1' || parsedUrl.hostname === 'localhost') {
            return '';
        }

        return parsedUrl.toString().replace(/\/$/, '');
    } catch {
        return '';
    }
}

function buildMercadoPagoItems(orderItems: Array<Record<string, unknown>>, orderTotalAmount: number, shippingAmount: number) {
    const normalizedShippingAmount = Math.max(0, Number(shippingAmount || 0));
    const productTargetCents = Math.max(0, Math.round((Number(orderTotalAmount || 0) - normalizedShippingAmount) * 100));

    const expandedUnits = orderItems.flatMap(item => {
        const quantity = Math.max(1, Number(item.quantity || 1));
        const baseUnitCents = Math.max(0, Math.round(Number(item.unit_price || 0) * 100));
        const pictureUrl = getMercadoPagoPictureUrl(String(item.product_image || ''));

        return Array.from({ length: quantity }, () => ({
            id: String(item.product_id),
            title: String(item.product_name || 'Produto Aranha'),
            description: String(item.category || 'Produto Aranha'),
            picture_url: pictureUrl,
            baseUnitCents
        }));
    });

    const subtotalCents = expandedUnits.reduce((sum, item) => sum + item.baseUnitCents, 0);

    const pricedUnits = expandedUnits.map(item => ({
        ...item,
        exactCents: subtotalCents > 0 ? (item.baseUnitCents * productTargetCents) / subtotalCents : 0,
        allocatedCents: 0,
        remainder: 0
    }));

    let allocatedCents = 0;

    pricedUnits.forEach(item => {
        item.allocatedCents = Math.floor(item.exactCents);
        item.remainder = item.exactCents - item.allocatedCents;
        allocatedCents += item.allocatedCents;
    });

    let remainingCents = Math.max(0, productTargetCents - allocatedCents);

    pricedUnits
        .sort((left, right) => right.remainder - left.remainder)
        .forEach(item => {
            if (remainingCents <= 0) {
                return;
            }

            item.allocatedCents += 1;
            remainingCents -= 1;
        });

    const groupedItems = new Map<string, {
        id: string;
        title: string;
        description: string;
        picture_url?: string;
        quantity: number;
        unit_price: number;
    }>();

    pricedUnits.forEach(item => {
        const unitPrice = Number((item.allocatedCents / 100).toFixed(2));
        const groupKey = [item.id, item.title, item.description, item.picture_url || '', unitPrice.toFixed(2)].join('::');
        const currentItem = groupedItems.get(groupKey);

        if (currentItem) {
            currentItem.quantity += 1;
            return;
        }

        groupedItems.set(groupKey, {
            id: item.id,
            title: item.title,
            description: item.description,
            picture_url: item.picture_url || undefined,
            quantity: 1,
            unit_price: unitPrice
        });
    });

    const mercadoPagoItems = Array.from(groupedItems.values()).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        quantity: item.quantity,
        currency_id: 'BRL',
        unit_price: item.unit_price,
        ...(item.picture_url ? { picture_url: item.picture_url } : {})
    }));

    if (normalizedShippingAmount > 0) {
        mercadoPagoItems.push({
            id: 'shipping',
            title: 'Frete',
            description: 'Entrega do pedido',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: Number(normalizedShippingAmount.toFixed(2))
        });
    }

    return mercadoPagoItems;
}

serve(async request => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !mercadoPagoAccessToken || !publicSiteUrl) {
            return new Response(JSON.stringify({ error: 'Missing Edge Function environment variables.' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const authHeader = request.headers.get('Authorization') || request.headers.get('authorization') || '';
        const rawBody = await request.text();
        const requestBody = rawBody ? JSON.parse(rawBody) : {};
        const accessToken = String(
            requestBody.accessToken || authHeader.replace(/^Bearer\s+/i, '')
        ).trim();
        const orderId = String(requestBody.orderId || '').trim();

        if (!accessToken) {
            return new Response(JSON.stringify({ error: 'Missing access token or authorization header.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const userClient = createClient(supabaseUrl, supabaseAnonKey);

        const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

        const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);

        if (userError || !userData.user) {
            console.error('Falha ao validar usuario dentro da Edge Function.', userError);

            return new Response(JSON.stringify({
                error: 'User token could not be validated inside the Edge Function.',
                details: userError?.message || null
            }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (!orderId) {
            return new Response(JSON.stringify({ error: 'orderId is required.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { data: order, error: orderError } = await adminClient
            .from('orders')
            .select('id, user_id, subtotal_amount, discount_amount, total_amount, shipping_amount, coupon_code, shipping_zip_code, order_items(product_id, product_name, product_image, category, quantity, unit_price)')
            .eq('id', orderId)
            .eq('user_id', userData.user.id)
            .single();

        if (orderError || !order) {
            return new Response(JSON.stringify({ error: 'Order not found for this user.' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const orderItems = Array.isArray(order.order_items) ? order.order_items : [];

        if (!orderItems.length) {
            return new Response(JSON.stringify({ error: 'Order has no items.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const items = buildMercadoPagoItems(orderItems, Number(order.total_amount || 0), Number(order.shipping_amount || 0));

        const redirectBaseUrl = getPublicRedirectBaseUrl(publicSiteUrl);

        const preferencePayload: Record<string, unknown> = {
            items,
            payer: {
                email: userData.user.email || undefined
            },
            external_reference: order.id,
            notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
            statement_descriptor: 'ARANHA',
            metadata: {
                order_id: order.id,
                user_id: userData.user.id,
                coupon_code: order.coupon_code || null,
                shipping_zip_code: order.shipping_zip_code || null
            }
        };

        if (redirectBaseUrl) {
            preferencePayload.back_urls = {
                success: `${redirectBaseUrl}/pages/minha-conta/index.html?payment=success`,
                pending: `${redirectBaseUrl}/pages/minha-conta/index.html?payment=pending`,
                failure: `${redirectBaseUrl}/pages/carrinho/index.html?payment=failure`
            };
            preferencePayload.auto_return = 'approved';
        }

        const mercadoPagoResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${mercadoPagoAccessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preferencePayload)
        });

        const preferenceData = await mercadoPagoResponse.json();

        if (!mercadoPagoResponse.ok) {
            console.error('Mercado Pago retornou erro ao criar preferencia.', {
                status: mercadoPagoResponse.status,
                response: preferenceData
            });

            return new Response(JSON.stringify({
                error: preferenceData,
                mercadoPagoStatus: mercadoPagoResponse.status
            }), {
                status: 502,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { error: updateError } = await adminClient
            .from('orders')
            .update({
                status: 'awaiting_payment',
                payment_status: 'pending',
                payment_provider: 'mercado_pago',
                provider_order_id: preferenceData.id,
                notes: 'Checkout Mercado Pago iniciado.'
            })
            .eq('id', order.id)
            .eq('user_id', userData.user.id);

        if (updateError) {
            return new Response(JSON.stringify({ error: updateError.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            checkoutUrl: preferenceData.init_point,
            sandboxCheckoutUrl: preferenceData.sandbox_init_point,
            preferenceId: preferenceData.id
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});