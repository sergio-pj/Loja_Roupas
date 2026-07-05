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
const tonPaymentLink = String(Deno.env.get('TON_PAYMENT_LINK') || '').trim();

function getTonPaymentLinkId(link: string) {
    const match = String(link).match(/(pl_[A-Za-z0-9]+)/);
    return match ? match[1] : null;
}

function isValidPublicUrl(value: string) {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

serve(async request => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !tonPaymentLink) {
            return new Response(JSON.stringify({ error: 'Missing Edge Function environment variables.' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (!isValidPublicUrl(tonPaymentLink)) {
            return new Response(JSON.stringify({ error: 'TON_PAYMENT_LINK must be a valid https URL.' }), {
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

        if (!orderId) {
            return new Response(JSON.stringify({ error: 'orderId is required.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const userClient = createClient(supabaseUrl, supabaseAnonKey);
        const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

        const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);

        if (userError || !userData.user) {
            return new Response(JSON.stringify({
                error: 'User token could not be validated inside the Edge Function.',
                details: userError?.message || null
            }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { data: order, error: orderError } = await adminClient
            .from('orders')
            .select('id, user_id, total_amount, order_items(id)')
            .eq('id', orderId)
            .eq('user_id', userData.user.id)
            .single();

        if (orderError || !order) {
            return new Response(JSON.stringify({ error: 'Order not found for this user.' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const hasItems = Array.isArray(order.order_items) && order.order_items.length > 0;

        if (!hasItems) {
            return new Response(JSON.stringify({ error: 'Order has no items.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const paymentLinkId = getTonPaymentLinkId(tonPaymentLink);

        const { error: updateError } = await adminClient
            .from('orders')
            .update({
                status: 'awaiting_payment',
                payment_status: 'pending',
                payment_provider: 'ton',
                provider_order_id: paymentLinkId,
                provider_payment_id: null,
                notes: 'Checkout Ton iniciado via link de pagamento PIX.'
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
            checkoutUrl: tonPaymentLink,
            paymentProvider: 'ton',
            providerOrderId: paymentLinkId,
            orderId: order.id
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
