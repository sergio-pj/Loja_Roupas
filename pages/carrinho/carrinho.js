import { supabase } from '../../json/supabase-browser.js';

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    if (!sidebar || !overlay) {
        return;
    }

    if (sidebar.style.width === '250px') {
        sidebar.style.width = '0';
        overlay.style.display = 'none';
    } else {
        sidebar.style.width = '250px';
        overlay.style.display = 'block';
    }
}

window.toggleMenu = toggleMenu;

const firstPurchaseCoupon = 'PRIMEIRACOMPRA';
const couponKey = 'aranha-cart-coupon';
const orderDraftKey = 'aranha-order-draft';
let appliedCoupon = '';
let currentUser = null;
let couponEligibility = {
    checked: false,
    schemaReady: true,
    canUseFirstPurchase: false,
    reason: 'Faça login para validar cupons da conta.'
};

const cartItemsContainer = document.getElementById('cart-items');
const cartEmpty = document.getElementById('cart-empty');
const cartLoginRequired = document.getElementById('cart-login-required');
const shippingZip = document.getElementById('shipping-zip');
const shippingFeedback = document.getElementById('shipping-feedback');
const couponForm = document.getElementById('coupon-form');
const couponCode = document.getElementById('coupon-code');
const couponFeedback = document.getElementById('coupon-feedback');
const removeCouponButton = document.getElementById('remove-coupon-button');
const checkoutButton = document.getElementById('checkout-button');
const checkoutFeedback = document.getElementById('checkout-feedback');
const summarySubtotal = document.getElementById('summary-subtotal');
const summaryDiscount = document.getElementById('summary-discount');
const summaryShipping = document.getElementById('summary-shipping');
const summaryTotal = document.getElementById('summary-total');
const debugPanel = document.getElementById('cart-debug-panel');
const debugOutput = document.getElementById('cart-debug-output');
const debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';

function appendDebugLine(message) {
    if (!debugEnabled || !debugPanel || !debugOutput) {
        return;
    }

    debugPanel.hidden = false;
    const nextMessage = String(message || '').trim();

    if (!nextMessage) {
        return;
    }

    debugOutput.textContent = debugOutput.textContent
        ? `${debugOutput.textContent}\n${nextMessage}`
        : nextMessage;
}

if (debugEnabled) {
    appendDebugLine('debug bootstrap: carrinho.js iniciou');

    window.addEventListener('error', event => {
        appendDebugLine(`window error: ${event.message || 'erro desconhecido'}`);
    });

    window.addEventListener('unhandledrejection', event => {
        const reason = event.reason?.message || event.reason || 'promise rejeitada sem detalhe';
        appendDebugLine(`unhandled rejection: ${String(reason)}`);
    });
}

function getUserScopedStorageKey(baseKey, userId = currentUser?.id || window.storefront?.getCurrentUserId?.()) {
    const normalizedUserId = String(userId || '').trim();

    if (!normalizedUserId) {
        return '';
    }

    if (window.storefront?.getScopedStorageKey) {
        return window.storefront.getScopedStorageKey(baseKey, normalizedUserId);
    }

    return `${baseKey}:${normalizedUserId}`;
}

function loadAppliedCoupon() {
    const resolvedUserId = String(currentUser?.id || window.storefront?.getCurrentUserId?.() || '').trim();

    if (!resolvedUserId) {
        appliedCoupon = '';

        if (couponCode) {
            couponCode.value = '';
        }

        return;
    }

    const scopedCouponKey = getUserScopedStorageKey(couponKey, resolvedUserId);
    appliedCoupon = scopedCouponKey ? window.localStorage.getItem(scopedCouponKey) || '' : '';

    if (couponCode) {
        couponCode.value = appliedCoupon;
    }
}

async function getSessionSnapshot(timeoutMs = 1800) {
    let timeoutId = null;

    try {
        return await Promise.race([
            supabase.auth.getSession().then(result => ({ ...result, timedOut: false })),
            new Promise(resolve => {
                timeoutId = window.setTimeout(() => {
                    resolve({
                        data: { session: null },
                        error: null,
                        timedOut: true
                    });
                }, timeoutMs);
            })
        ]);
    } finally {
        if (timeoutId) {
            window.clearTimeout(timeoutId);
        }
    }
}

async function withTimeout(promise, timeoutMs, timeoutValueFactory) {
    let timeoutId = null;

    try {
        return await Promise.race([
            promise,
            new Promise(resolve => {
                timeoutId = window.setTimeout(() => {
                    resolve(timeoutValueFactory());
                }, timeoutMs);
            })
        ]);
    } finally {
        if (timeoutId) {
            window.clearTimeout(timeoutId);
        }
    }
}

async function syncAuthState() {
    appendDebugLine('syncAuthState: iniciando getSession');
    const { data, error, timedOut } = await getSessionSnapshot();
    appendDebugLine(`syncAuthState: getSession finalizou; timedOut=${String(Boolean(timedOut))}; user=${String(data?.session?.user?.id || '').trim() || '(vazio)'}`);

    if (error) {
        currentUser = null;
        appendDebugLine(`syncAuthState: erro=${String(error.message || 'erro desconhecido')}`);
        return false;
    }

    if (!data.session?.user) {
        const fallbackAuth = window.storefront?.getAuth?.() || null;

        if (fallbackAuth?.userId) {
            currentUser = {
                id: fallbackAuth.userId,
                email: fallbackAuth.email || ''
            };
            appendDebugLine(`syncAuthState: usando fallback local=${fallbackAuth.userId}`);
            return true;
        }

        currentUser = null;
        appendDebugLine('syncAuthState: sem sessao e sem fallback local');
        return false;
    }

    currentUser = data.session.user;

    if (window.storefront) {
        window.storefront.setAuth({
            userId: data.session.user.id,
            email: data.session.user.email || ''
        });
    }

    return true;
}

function isMissingSchemaError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('does not exist') || message.includes('relation');
}

function clearAppliedCoupon() {
    appliedCoupon = '';

    const scopedCouponKey = getUserScopedStorageKey(couponKey);

    if (scopedCouponKey) {
        window.localStorage.removeItem(scopedCouponKey);
    }

    if (couponCode) {
        couponCode.value = '';
    }
}

async function updateDebugPanel() {
    if (!debugEnabled || !debugPanel || !debugOutput) {
        return;
    }

    debugPanel.hidden = false;
    appendDebugLine('updateDebugPanel: iniciando coleta');

    const storageKeys = Object.keys(window.localStorage);
    const supabaseTokenKey = storageKeys.find(key => /^sb-[a-z0-9]+-auth-token$/i.test(key)) || '';
    const localAuth = window.storefront?.getAuth?.() || null;
    const userId = String(currentUser?.id || window.storefront?.getCurrentUserId?.() || '').trim();
    const scopedCartKey = userId ? window.storefront.getScopedStorageKey('aranha-cart', userId) : '';
    const rawCart = scopedCartKey ? window.localStorage.getItem(scopedCartKey) : null;
    const rawCoupon = userId ? window.localStorage.getItem(window.storefront.getScopedStorageKey(couponKey, userId)) : null;

    let sessionUserId = '';
    let sessionEmail = '';
    let sessionErrorMessage = '';
    let sessionTimedOut = false;

    try {
        const { data, error, timedOut } = await getSessionSnapshot(1200);
        sessionUserId = String(data?.session?.user?.id || '').trim();
        sessionEmail = String(data?.session?.user?.email || '').trim();
        sessionErrorMessage = String(error?.message || '').trim();
        sessionTimedOut = Boolean(timedOut);
    } catch (error) {
        sessionErrorMessage = String(error?.message || error || '').trim();
    }

    const lines = [
        'debug bootstrap: updateDebugPanel executou',
        `supabase session timedOut: ${String(sessionTimedOut)}`,
        `supabase session userId: ${sessionUserId || '(vazio)'}`,
        `supabase session email: ${sessionEmail || '(vazio)'}`,
        `supabase session error: ${sessionErrorMessage || '(sem erro)'}`,
        `currentUser.id: ${String(currentUser?.id || '').trim() || '(vazio)'}`,
        `storefront auth: ${JSON.stringify(localAuth) || '(vazio)'}`,
        `scoped cart key: ${scopedCartKey || '(vazio)'}`,
        `raw scoped cart: ${rawCart || '(vazio)'}`,
        `cart items loaded: ${window.storefront.getCart().length}`,
        `appliedCoupon: ${appliedCoupon || '(vazio)'}`,
        `scoped coupon value: ${rawCoupon || '(vazio)'}`,
        `supabase token key: ${supabaseTokenKey || '(nao encontrado)'}`
    ];

    debugOutput.textContent = lines.join('\n');
}

function syncCouponStateMessage() {
    if (removeCouponButton) {
        removeCouponButton.hidden = !appliedCoupon;
    }

    if (!couponFeedback) {
        return;
    }

    if (appliedCoupon === firstPurchaseCoupon && couponEligibility.canUseFirstPurchase) {
        couponFeedback.textContent = 'Cupom aplicado: 10% de desconto liberado para a primeira compra aprovada.';
        return;
    }

    couponFeedback.textContent = couponEligibility.reason;
}

async function loadCouponEligibility() {
    appendDebugLine(`loadCouponEligibility: currentUser=${String(currentUser?.id || '').trim() || '(vazio)'}`);

    if (!currentUser) {
        couponEligibility = {
            checked: true,
            schemaReady: true,
            canUseFirstPurchase: false,
            reason: 'Faça login para validar o cupom PRIMEIRACOMPRA.'
        };
        appendDebugLine('loadCouponEligibility: sem usuario, usando padrao');
        return;
    }

    const paidOrdersRequest = supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .in('status', ['paid', 'approved']);

    const couponUseRequest = supabase
        .from('coupon_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .eq('coupon_code', firstPurchaseCoupon)
        .in('status', ['reserved', 'redeemed']);

    const [paidOrdersResult, couponUseResult] = await withTimeout(
        Promise.all([paidOrdersRequest, couponUseRequest]),
        1800,
        () => ([
            { count: 0, error: { message: 'coupon eligibility timeout' } },
            { count: 0, error: { message: 'coupon eligibility timeout' } }
        ])
    );
    appendDebugLine(`loadCouponEligibility: paidError=${String(paidOrdersResult.error?.message || '').trim() || '(sem erro)'}; couponError=${String(couponUseResult.error?.message || '').trim() || '(sem erro)'}`);

    if (paidOrdersResult.error || couponUseResult.error) {
        const firstError = paidOrdersResult.error || couponUseResult.error;

        if (String(firstError?.message || '').toLowerCase().includes('timeout')) {
            couponEligibility = {
                checked: true,
                schemaReady: true,
                canUseFirstPurchase: false,
                reason: 'A validacao do cupom demorou mais que o esperado. O carrinho segue disponivel.'
            };
            appendDebugLine('loadCouponEligibility: timeout, seguindo sem bloquear carrinho');
            return;
        }

        if (isMissingSchemaError(firstError)) {
            couponEligibility = {
                checked: true,
                schemaReady: false,
                canUseFirstPurchase: false,
                reason: 'Execute o SQL supabase/003_orders_coupons.sql no Supabase para validar cupons e pedidos.'
            };
            clearAppliedCoupon();
            return;
        }

        couponEligibility = {
            checked: true,
            schemaReady: false,
            canUseFirstPurchase: false,
            reason: 'Nao foi possivel validar a elegibilidade do cupom agora.'
        };
        clearAppliedCoupon();
        return;
    }

    const paidOrdersCount = Number(paidOrdersResult.count || 0);
    const couponUsageCount = Number(couponUseResult.count || 0);
    const canUseFirstPurchase = paidOrdersCount === 0 && couponUsageCount === 0;

    couponEligibility = {
        checked: true,
        schemaReady: true,
        canUseFirstPurchase,
        reason: canUseFirstPurchase
            ? 'Cupom PRIMEIRACOMPRA disponivel para a primeira compra aprovada desta conta.'
            : 'Este cliente ja possui compra aprovada ou ja utilizou o cupom PRIMEIRACOMPRA.'
    };

    if (!canUseFirstPurchase && appliedCoupon === firstPurchaseCoupon) {
        clearAppliedCoupon();
    }
}

function formatPrice(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatZipCode(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);

    if (digits.length <= 5) {
        return digits;
    }

    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function getDiscount(subtotal) {
    if (appliedCoupon === firstPurchaseCoupon && couponEligibility.canUseFirstPurchase) {
        return subtotal * 0.1;
    }

    return 0;
}

function buildCouponSnapshot(discount) {
    if (!appliedCoupon) {
        return {};
    }

    return {
        code: appliedCoupon,
        type: 'first_purchase',
        discount_percentage: appliedCoupon === firstPurchaseCoupon ? 10 : 0,
        discount_amount: Number(discount.toFixed(2)),
        eligibility: couponEligibility.canUseFirstPurchase ? 'validated' : 'rejected'
    };
}

async function persistOrderDraft() {
    if (!currentUser) {
        return { ok: false, message: 'Faça login para continuar a compra.' };
    }

    if (!couponEligibility.schemaReady) {
        return { ok: false, message: 'Ative primeiro o SQL supabase/003_orders_coupons.sql no Supabase.' };
    }

    const cart = window.storefront.getCart();

    if (!cart.length) {
        return { ok: false, message: 'Seu carrinho está vazio.' };
    }

    const subtotal = cart.reduce((total, item) => total + item.preco * item.quantity, 0);
    const discount = getDiscount(subtotal);
    const total = subtotal - discount;

    const orderPayload = {
        user_id: currentUser.id,
        status: 'checkout_started',
        payment_status: 'pending',
        shipping_zip_code: shippingZip?.value.trim() || null,
        shipping_amount: 0,
        subtotal_amount: Number(subtotal.toFixed(2)),
        discount_amount: Number(discount.toFixed(2)),
        total_amount: Number(total.toFixed(2)),
        coupon_code: appliedCoupon || null,
        coupon_snapshot: buildCouponSnapshot(discount)
    };

    const scopedOrderDraftKey = getUserScopedStorageKey(orderDraftKey, currentUser.id);
    let draftId = scopedOrderDraftKey ? window.localStorage.getItem(scopedOrderDraftKey) || '' : '';

    if (draftId) {
        const { data: updatedOrder, error: updateError } = await supabase
            .from('orders')
            .update(orderPayload)
            .eq('id', draftId)
            .eq('user_id', currentUser.id)
            .select('id')
            .maybeSingle();

        if (updateError && !isMissingSchemaError(updateError)) {
            return { ok: false, message: updateError.message };
        }

        if (!updatedOrder?.id) {
            draftId = '';
        }
    }

    if (!draftId) {
        const { data: insertedOrder, error: insertError } = await supabase
            .from('orders')
            .insert(orderPayload)
            .select('id')
            .single();

        if (insertError) {
            return {
                ok: false,
                message: isMissingSchemaError(insertError)
                    ? 'Execute o SQL supabase/003_orders_coupons.sql antes de iniciar o checkout.'
                    : insertError.message
            };
        }

        draftId = insertedOrder.id;
    }

    const { error: deleteItemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', draftId)
        .eq('user_id', currentUser.id);

    if (deleteItemsError && !isMissingSchemaError(deleteItemsError)) {
        return { ok: false, message: deleteItemsError.message };
    }

    const itemsPayload = cart.map(item => ({
        order_id: draftId,
        user_id: currentUser.id,
        product_id: Number(item.id),
        product_name: item.nome,
        product_image: item.imagem,
        category: item.tamanho ? `${item.categoria || 'Colecao Aranha'} | Tam ${item.tamanho}` : item.categoria || null,
        color: item.cor || null,
        unit_price: Number(item.preco.toFixed(2)),
        quantity: Number(item.quantity),
        line_total: Number((item.preco * item.quantity).toFixed(2))
    }));

    const { error: insertItemsError } = await supabase
        .from('order_items')
        .insert(itemsPayload);

    if (insertItemsError) {
        return {
            ok: false,
            message: isMissingSchemaError(insertItemsError)
                ? 'A tabela de itens do pedido ainda nao foi criada no Supabase.'
                : insertItemsError.message
        };
    }

    if (scopedOrderDraftKey) {
        window.localStorage.setItem(scopedOrderDraftKey, draftId);
    }

    return {
        ok: true,
        draftId,
        total: formatPrice(total)
    };
}

async function createMercadoPagoPreference(orderId) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session?.refresh_token) {
        return { ok: false, message: 'Sua sessao expirou. Entre novamente para iniciar o pagamento.' };
    }

    const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: sessionData.session.refresh_token
    });

    const accessToken = refreshedSession.session?.access_token || sessionData.session.access_token || '';

    if (refreshError || !accessToken) {
        return { ok: false, message: 'Nao foi possivel renovar sua sessao. Entre novamente para iniciar o pagamento.' };
    }

    const { data, error } = await supabase.functions.invoke('create-mercadopago-preference', {
        headers: {
            Authorization: `Bearer ${accessToken}`
        },
        body: {
            orderId,
            accessToken
        }
    });

    if (error) {
        return { ok: false, message: error.message || 'Nao foi possivel iniciar o checkout.' };
    }

    if (!data?.checkoutUrl) {
        return { ok: false, message: 'A funcao de checkout nao retornou uma URL valida.' };
    }

    return {
        ok: true,
        checkoutUrl: data.checkoutUrl,
        sandboxCheckoutUrl: data.sandboxCheckoutUrl || '',
        preferenceId: data.preferenceId || ''
    };
}

function renderSummary(cart) {
    const subtotal = cart.reduce((total, item) => total + item.preco * item.quantity, 0);
    const discount = getDiscount(subtotal);
    const total = subtotal - discount;

    summarySubtotal.textContent = formatPrice(subtotal);
    summaryDiscount.textContent = `- ${formatPrice(discount)}`;
    summaryShipping.textContent = shippingZip && shippingZip.value.length === 9 ? 'Calculo em breve' : 'Informe o CEP';
    summaryTotal.textContent = formatPrice(total);
}

function renderCart() {
    appendDebugLine('renderCart: iniciando');
    const isLoggedIn = window.storefront.isLoggedIn();
    const cart = window.storefront.getCart();
    appendDebugLine(`renderCart: isLoggedIn=${String(isLoggedIn)}; itens=${cart.length}`);

    cartItemsContainer.innerHTML = '';
    cartLoginRequired.hidden = isLoggedIn;
    cartEmpty.hidden = !isLoggedIn || cart.length > 0;
    checkoutButton.disabled = !isLoggedIn || cart.length === 0;
    syncCouponStateMessage();

    if (!isLoggedIn || !cart.length) {
        renderSummary([]);
        void updateDebugPanel();
        return;
    }

    cart.forEach(item => {
        const article = document.createElement('article');
        article.className = 'cart-item';
        article.innerHTML = `
            <div class="cart-item-image">
                <img src="${item.imagem}" alt="${item.nome}">
            </div>
            <div class="cart-item-content">
                <div class="cart-item-header">
                    <div>
                        <h3 class="cart-item-title">${item.nome}</h3>
                        <p class="cart-item-meta">Categoria: ${item.categoria || 'Colecao Aranha'}${item.tamanho ? ` | Tamanho: ${item.tamanho}` : ''}</p>
                    </div>
                    <strong class="cart-item-price">${formatPrice(item.preco)}</strong>
                </div>
                <div class="cart-item-actions">
                    <div class="quantity-control">
                        <button type="button" data-action="decrease" data-key="${item.cartItemKey}" aria-label="Diminuir quantidade">-</button>
                        <span>${item.quantity}</span>
                        <button type="button" data-action="increase" data-key="${item.cartItemKey}" aria-label="Aumentar quantidade">+</button>
                    </div>
                    <button type="button" class="remove-button" data-action="remove" data-key="${item.cartItemKey}">Remover</button>
                </div>
            </div>
        `;

        cartItemsContainer.appendChild(article);
    });

    renderSummary(cart);
    void updateDebugPanel();
}

cartItemsContainer.addEventListener('click', event => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
        return;
    }

    const action = target.getAttribute('data-action');
    const cartItemKey = target.getAttribute('data-key');

    if (!action || !cartItemKey) {
        return;
    }

    const cart = window.storefront.getCart();
    const item = cart.find(entry => entry.cartItemKey === cartItemKey);

    if (!item) {
        return;
    }

    if (action === 'increase') {
        window.storefront.updateCartItemQuantity(cartItemKey, item.quantity + 1);
    }

    if (action === 'decrease') {
        window.storefront.updateCartItemQuantity(cartItemKey, item.quantity - 1);
    }

    if (action === 'remove') {
        window.storefront.removeCartItem(cartItemKey);
    }

    renderCart();
});

if (shippingZip) {
    shippingZip.addEventListener('input', () => {
        shippingZip.value = formatZipCode(shippingZip.value);

        if (shippingZip.value.length === 9) {
            shippingFeedback.textContent = `CEP ${shippingZip.value} recebido. O calculo automatico de frete sera conectado na proxima etapa.`;
        } else {
            shippingFeedback.textContent = 'Frete automático será conectado em seguida.';
        }

        renderSummary(window.storefront.getCart());
    });
}

if (couponForm) {
    couponForm.addEventListener('submit', async event => {
        event.preventDefault();

        const code = String(couponCode.value || '').trim().toUpperCase();

        if (!window.storefront.ensureLoggedIn('aplicar cupom')) {
            return;
        }

        await loadCouponEligibility();

        if (!window.storefront.getCart().length) {
            couponFeedback.textContent = 'Adicione itens ao carrinho antes de aplicar um cupom.';
            return;
        }

        if (!couponEligibility.schemaReady) {
            couponFeedback.textContent = couponEligibility.reason;
            return;
        }

        if (code !== firstPurchaseCoupon) {
            couponFeedback.textContent = 'Cupom inválido. Use PRIMEIRACOMPRA para esta primeira fase.';
            return;
        }

        if (!couponEligibility.canUseFirstPurchase) {
            clearAppliedCoupon();
            couponFeedback.textContent = couponEligibility.reason;
            return;
        }

        appliedCoupon = code;
        const scopedCouponKey = getUserScopedStorageKey(couponKey);

        if (scopedCouponKey) {
            window.localStorage.setItem(scopedCouponKey, appliedCoupon);
        }

        renderCart();
    });
}

if (removeCouponButton) {
    removeCouponButton.addEventListener('click', () => {
        clearAppliedCoupon();
        renderCart();
        couponFeedback.textContent = 'Cupom removido do resumo da compra.';
    });
}

if (checkoutButton) {
    checkoutButton.addEventListener('click', async () => {
        if (!window.storefront.ensureLoggedIn('continuar a compra')) {
            return;
        }

        if (!window.storefront.getCart().length) {
            checkoutFeedback.textContent = 'Seu carrinho está vazio.';
            return;
        }

        await loadCouponEligibility();

        if (appliedCoupon === firstPurchaseCoupon && !couponEligibility.canUseFirstPurchase) {
            clearAppliedCoupon();
            couponFeedback.textContent = couponEligibility.reason;
            renderCart();
            return;
        }

        checkoutFeedback.textContent = 'Preparando pedido...';

        const result = await persistOrderDraft();

        if (!result.ok) {
            checkoutFeedback.textContent = result.message;
            return;
        }

        checkoutFeedback.textContent = 'Conectando checkout Mercado Pago...';

        const checkoutResult = await createMercadoPagoPreference(result.draftId);

        if (!checkoutResult.ok) {
            checkoutFeedback.textContent = `${result.total} preparado no pedido ${result.draftId.slice(0, 8).toUpperCase()}, mas a integracao de pagamento ainda nao respondeu. Verifique as Edge Functions e as variaveis do Mercado Pago.`;
            return;
        }

        checkoutFeedback.textContent = 'Redirecionando para o Mercado Pago...';
        window.location.href = checkoutResult.checkoutUrl;
    });
}

supabase.auth.onAuthStateChange(async (eventType, session) => {
    appendDebugLine(`onAuthStateChange: evento=${eventType}; user=${String(session?.user?.id || '').trim() || '(vazio)'}`);
    if (session?.user) {
        currentUser = session.user;
        window.storefront.setAuth({
            userId: session.user.id,
            email: session.user.email || ''
        });
        loadAppliedCoupon();
    } else {
        currentUser = null;

        if (eventType === 'SIGNED_OUT' || eventType === 'USER_DELETED') {
            appliedCoupon = '';

            if (couponCode) {
                couponCode.value = '';
            }

            couponEligibility = {
                checked: true,
                schemaReady: true,
                canUseFirstPurchase: false,
                reason: 'Faça login para validar cupons da conta.'
            };

            window.storefront.clearAuth();
        } else {
            loadAppliedCoupon();
        }
    }

    syncCouponStateMessage();
    renderCart();
    await updateDebugPanel();

    if (session?.user) {
        loadCouponEligibility().then(() => {
            syncCouponStateMessage();
            renderCart();
            void updateDebugPanel();
        });
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    appendDebugLine('DOMContentLoaded: inicio');
    await syncAuthState();
    appendDebugLine('DOMContentLoaded: apos syncAuthState');
    loadAppliedCoupon();
    appendDebugLine(`DOMContentLoaded: apos loadAppliedCoupon; appliedCoupon=${appliedCoupon || '(vazio)'}`);
    renderCart();
    appendDebugLine('DOMContentLoaded: apos renderCart');
    await updateDebugPanel();

    loadCouponEligibility().then(() => {
        appendDebugLine('DOMContentLoaded: apos loadCouponEligibility');

        if (couponFeedback) {
            syncCouponStateMessage();
            appendDebugLine('DOMContentLoaded: apos syncCouponStateMessage');
        }

        renderCart();
        void updateDebugPanel();
    });

    appendDebugLine('DOMContentLoaded: fim');
});