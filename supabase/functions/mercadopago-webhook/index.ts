// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const supabaseUrl = Deno.env.get('APP_SUPABASE_URL') || '';
const supabaseServiceRoleKey = Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY') || '';
const mercadoPagoAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || '';

serve(async request => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (!supabaseUrl || !supabaseServiceRoleKey || !mercadoPagoAccessToken) {
            return new Response(JSON.stringify({ error: 'Missing Edge Function environment variables.' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
        const url = new URL(request.url);
        const searchParams = url.searchParams;
        const body = request.method === 'POST' ? await request.text() : '';

        let payload: Record<string, unknown> = {};

        if (body) {
            try {
                payload = JSON.parse(body);
            } catch {
                payload = {};
            }
        }

        const type = String(payload.type || payload.topic || searchParams.get('type') || searchParams.get('topic') || '');
        const paymentId = String(
            (payload.data as Record<string, unknown> | undefined)?.id ||
            searchParams.get('data.id') ||
            searchParams.get('id') ||
            ''
        );

        if (!paymentId || (type && type !== 'payment')) {
            return new Response(JSON.stringify({ received: true, ignored: true }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
                Authorization: `Bearer ${mercadoPagoAccessToken}`
            }
        });

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
            return new Response(JSON.stringify({ error: paymentData }), {
                status: 502,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const orderId = String(paymentData.external_reference || paymentData.metadata?.order_id || '');

        if (!orderId) {
            return new Response(JSON.stringify({ received: true, ignored: true, reason: 'Missing external reference.' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const paymentStatus = String(paymentData.status || '').toLowerCase();

        if (paymentStatus === 'approved' || paymentStatus === 'authorized') {
            const finalStatus = paymentStatus === 'approved' ? 'approved' : 'paid';

            const { error } = await adminClient.rpc('finalize_order_payment', {
                p_order_id: orderId,
                p_payment_provider: 'mercado_pago',
                p_provider_order_id: paymentData.order?.id ? String(paymentData.order.id) : null,
                p_provider_payment_id: paymentData.id ? String(paymentData.id) : null,
                p_final_status: finalStatus
            });

            if (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        } else {
            const nextOrderStatus = paymentStatus === 'cancelled' || paymentStatus === 'rejected'
                ? 'cancelled'
                : 'awaiting_payment';
            const nextPaymentStatus = paymentStatus === 'rejected'
                ? 'failed'
                : paymentStatus === 'cancelled'
                    ? 'cancelled'
                    : 'pending';

            const { error } = await adminClient
                .from('orders')
                .update({
                    status: nextOrderStatus,
                    payment_status: nextPaymentStatus,
                    payment_provider: 'mercado_pago',
                    provider_order_id: paymentData.order?.id ? String(paymentData.order.id) : null,
                    provider_payment_id: paymentData.id ? String(paymentData.id) : null,
                    notes: `Webhook Mercado Pago recebido com status ${paymentStatus}.`
                })
                .eq('id', orderId);

            if (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        return new Response(JSON.stringify({ received: true }), {
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