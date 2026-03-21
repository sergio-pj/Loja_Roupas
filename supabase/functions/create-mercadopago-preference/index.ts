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
            .select('id, user_id, subtotal_amount, discount_amount, total_amount, coupon_code, shipping_zip_code, order_items(product_id, product_name, product_image, category, quantity, unit_price)')
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

        const items = orderItems.map(item => {
            const mappedItem = {
                id: String(item.product_id),
                title: item.product_name,
                description: item.category || 'Produto Aranha',
                quantity: Number(item.quantity),
                currency_id: 'BRL',
                unit_price: Number(item.unit_price)
            };

            const pictureUrl = getMercadoPagoPictureUrl(item.product_image);

            if (pictureUrl) {
                return {
                    ...mappedItem,
                    picture_url: pictureUrl
                };
            }

            return mappedItem;
        });

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