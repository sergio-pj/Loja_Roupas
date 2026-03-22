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

const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profilePhone = document.getElementById('profile-phone');
const logoutButton = document.getElementById('logout-button');
const accountFeedback = document.getElementById('account-feedback');
const addressEmpty = document.getElementById('address-empty');
const addressCard = document.getElementById('address-card');
const addressLabel = document.getElementById('address-label');
const addressRecipient = document.getElementById('address-recipient');
const addressLines = document.getElementById('address-lines');
const addressForm = document.getElementById('address-form');
const addressFeedback = document.getElementById('address-feedback');
const editAddressButton = document.getElementById('edit-address-button');
const addressCardActions = document.getElementById('address-card-actions');
const ordersEmpty = document.getElementById('orders-empty');
const ordersList = document.getElementById('orders-list');
const ordersFeedback = document.getElementById('orders-feedback');

let currentUser = null;
let currentAddressId = null;
let isAddressEditing = false;

function setAddressFormVisibility(visible) {
    if (!addressForm) {
        return;
    }

    addressForm.hidden = !visible;

    if (addressCardActions) {
        addressCardActions.hidden = visible || !currentAddressId;
    }
}

function formatCurrency(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
    if (!value) {
        return 'Data nao informada';
    }

    return new Date(value).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getOrderStatusLabel(status, paymentStatus) {
    if (status === 'approved') {
        return 'Pagamento aprovado';
    }

    if (status === 'paid') {
        return 'Pago';
    }

    if (status === 'awaiting_payment') {
        return 'Aguardando pagamento';
    }

    if (status === 'checkout_started' && paymentStatus === 'pending') {
        return 'Checkout iniciado';
    }

    if (status === 'cancelled') {
        return 'Cancelado';
    }

    if (status === 'refunded') {
        return 'Reembolsado';
    }

    return 'Em processamento';
}

function getOrderStatusClass(status, paymentStatus) {
    if (status === 'approved' || status === 'paid') {
        return 'is-approved';
    }

    if (status === 'checkout_started' || status === 'awaiting_payment' || paymentStatus === 'pending') {
        return 'is-pending';
    }

    if (status === 'cancelled' || status === 'refunded') {
        return 'is-cancelled';
    }

    return 'is-processing';
}

function renderOrders(orders) {
    if (!ordersList || !ordersEmpty) {
        return;
    }

    ordersList.innerHTML = '';

    if (!orders.length) {
        ordersEmpty.hidden = false;
        ordersList.hidden = true;
        return;
    }

    ordersEmpty.hidden = true;
    ordersList.hidden = false;

    orders.forEach(order => {
        const article = document.createElement('article');
        article.className = 'order-item';

        const productSummary = Array.isArray(order.order_items) && order.order_items.length
            ? order.order_items.map(item => `${item.product_name} x${item.quantity}`).join(' • ')
            : 'Itens do pedido serao exibidos aqui.';

        const couponLine = order.coupon_code
            ? `<p class="order-meta-line">Cupom aplicado: <strong>${order.coupon_code}</strong></p>`
            : '';

        article.innerHTML = `
            <div class="order-head">
                <div>
                    <p class="order-label">Pedido ${String(order.id).slice(0, 8).toUpperCase()}</p>
                    <h3>${getOrderStatusLabel(order.status, order.payment_status)}</h3>
                </div>
                <span class="order-badge ${getOrderStatusClass(order.status, order.payment_status)}">${getOrderStatusLabel(order.status, order.payment_status)}</span>
            </div>
            <div class="order-body">
                <p class="order-meta-line">Criado em ${formatDate(order.created_at)}</p>
                <p class="order-meta-line">Total: <strong>${formatCurrency(order.total_amount)}</strong></p>
                <p class="order-meta-line">Itens: ${productSummary}</p>
                <p class="order-meta-line">CEP: ${order.shipping_zip_code || 'Nao informado'}</p>
                ${couponLine}
            </div>
        `;

        ordersList.appendChild(article);
    });
}

async function loadOrders(userId) {
    if (!ordersFeedback) {
        return;
    }

    ordersFeedback.textContent = 'Carregando pedidos...';

    const { data, error } = await supabase
        .from('orders')
        .select('id, status, payment_status, total_amount, shipping_zip_code, coupon_code, created_at, order_items(product_name, quantity)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        const message = String(error.message || '').toLowerCase();

        if (message.includes('does not exist') || message.includes('relation')) {
            ordersFeedback.textContent = 'Execute os SQLs 003 e 004 no Supabase para carregar pedidos e pagamento.';
            renderOrders([]);
            return;
        }

        ordersFeedback.textContent = error.message;
        renderOrders([]);
        return;
    }

    ordersFeedback.textContent = data.length ? '' : 'Nenhum pedido encontrado para esta conta.';
    renderOrders(data || []);
}

function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.length <= 2) {
        return digits ? `(${digits}` : '';
    }

    if (digits.length <= 7) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }

    if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatZipCode(value) {
    const digits = value.replace(/\D/g, '').slice(0, 8);

    if (digits.length <= 5) {
        return digits;
    }

    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function bindAddressMasks() {
    if (!addressForm) {
        return;
    }

    const phoneField = addressForm.querySelector('input[name="phone"]');
    const zipField = addressForm.querySelector('input[name="zip_code"]');

    if (phoneField) {
        phoneField.addEventListener('input', () => {
            phoneField.value = formatPhone(phoneField.value);
        });
    }

    if (zipField) {
        zipField.addEventListener('input', () => {
            zipField.value = formatZipCode(zipField.value);
        });
    }
}

function fillAddressForm(address, fallbackName, fallbackPhone) {
    if (!addressForm) {
        return;
    }

    addressForm.elements.label.value = address?.label || 'Principal';
    addressForm.elements.recipient_name.value = address?.recipient_name || fallbackName || '';
    addressForm.elements.phone.value = address?.phone || fallbackPhone || '';
    addressForm.elements.zip_code.value = address?.zip_code || '';
    addressForm.elements.street.value = address?.street || '';
    addressForm.elements.number.value = address?.number || '';
    addressForm.elements.complement.value = address?.complement || '';
    addressForm.elements.neighborhood.value = address?.neighborhood || '';
    addressForm.elements.city.value = address?.city || '';
    addressForm.elements.state.value = address?.state || '';
    addressForm.elements.is_default.checked = address ? Boolean(address.is_default) : true;
}

function renderAddress(address, fallbackName) {
    if (!addressCard || !addressEmpty || !addressLabel || !addressRecipient || !addressLines) {
        return;
    }

    if (!address) {
        addressEmpty.hidden = false;
        addressCard.hidden = true;
        setAddressFormVisibility(true);
        return;
    }

    addressEmpty.hidden = true;
    addressCard.hidden = false;
    addressLabel.textContent = address.label || 'Principal';
    addressRecipient.textContent = address.recipient_name || fallbackName || 'Destinatario nao informado';

    const lines = [
        [address.street, address.number].filter(Boolean).join(', '),
        [address.complement, address.neighborhood].filter(Boolean).join(' - '),
        [address.city, address.state].filter(Boolean).join(' / '),
        address.zip_code || ''
    ].filter(Boolean);

    addressLines.textContent = lines.join(' | ');

    if (!isAddressEditing) {
        setAddressFormVisibility(false);
    }
}

async function loadAccount() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        if (window.storefront) {
            window.storefront.clearAuth();
        }
        window.location.href = '../login/index.html';
        return;
    }

    const user = data.user;
    currentUser = user;
    if (window.storefront) {
        window.storefront.setAuth({
            userId: user.id,
            email: user.email || ''
        });
    }
    const metadata = user.user_metadata || {};

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', user.id)
        .maybeSingle();

    if (profileError && !profileError.message.toLowerCase().includes('relation "profiles" does not exist')) {
        accountFeedback.textContent = profileError.message;
    }

    if (profileError && profileError.message.toLowerCase().includes('relation "profiles" does not exist')) {
        accountFeedback.textContent = 'A tabela profiles ainda nao foi criada no Supabase. Execute o SQL em supabase/001_profiles.sql.';
    }

    profileName.textContent = profile?.full_name || metadata.full_name || 'Nao informado';
    profileEmail.textContent = profile?.email || user.email || 'Nao informado';
    profilePhone.textContent = profile?.phone || metadata.phone || 'Nao informado';

    const { data: addresses, error: addressesError } = await supabase
        .from('addresses')
        .select('id, label, recipient_name, phone, street, number, complement, neighborhood, city, state, zip_code, is_default')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

    if (addressesError && !addressesError.message.toLowerCase().includes('relation "addresses" does not exist')) {
        accountFeedback.textContent = addressesError.message;
    }

    if (addressesError && addressesError.message.toLowerCase().includes('relation "addresses" does not exist')) {
        accountFeedback.textContent = 'A tabela addresses ainda nao foi criada no Supabase. Execute o SQL em supabase/002_addresses.sql.';
    }

    const primaryAddress = addresses && addresses.length ? addresses[0] : null;
    currentAddressId = primaryAddress?.id || null;
    isAddressEditing = !primaryAddress;

    renderAddress(primaryAddress, profile?.full_name || metadata.full_name || '');
    fillAddressForm(primaryAddress, profile?.full_name || metadata.full_name || '', profile?.phone || metadata.phone || '');
    setAddressFormVisibility(!primaryAddress);
    await loadOrders(user.id);
}

if (addressForm) {
    bindAddressMasks();

    addressForm.addEventListener('submit', async event => {
        event.preventDefault();

        if (!currentUser) {
            addressFeedback.textContent = 'Faça login novamente para salvar o endereço.';
            return;
        }

        addressFeedback.textContent = 'Salvando endereco...';

        const formData = new FormData(addressForm);
        const payload = {
            user_id: currentUser.id,
            label: String(formData.get('label') || '').trim() || 'Principal',
            recipient_name: String(formData.get('recipient_name') || '').trim(),
            phone: String(formData.get('phone') || '').trim(),
            zip_code: String(formData.get('zip_code') || '').trim(),
            street: String(formData.get('street') || '').trim(),
            number: String(formData.get('number') || '').trim(),
            complement: String(formData.get('complement') || '').trim(),
            neighborhood: String(formData.get('neighborhood') || '').trim(),
            city: String(formData.get('city') || '').trim(),
            state: String(formData.get('state') || '').trim().toUpperCase(),
            is_default: Boolean(formData.get('is_default'))
        };

        if (currentAddressId) {
            payload.id = currentAddressId;
        }

        const { data, error } = await supabase
            .from('addresses')
            .upsert(payload, { onConflict: 'id' })
            .select('id, label, recipient_name, phone, street, number, complement, neighborhood, city, state, zip_code, is_default')
            .single();

        if (error) {
            addressFeedback.textContent = error.message;
            return;
        }

        currentAddressId = data.id;
        isAddressEditing = false;
        renderAddress(data, payload.recipient_name);
        fillAddressForm(data, payload.recipient_name, payload.phone);
        addressFeedback.textContent = 'Endereco salvo com sucesso.';
    });
}

if (editAddressButton) {
    editAddressButton.addEventListener('click', () => {
        isAddressEditing = true;
        setAddressFormVisibility(true);
        addressFeedback.textContent = 'Atualize os dados e salve novamente.';
    });
}

if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        accountFeedback.textContent = 'Saindo...';
        await supabase.auth.signOut();
        if (window.storefront) {
            window.storefront.clearAuth();
        }
        window.location.href = '../login/index.html';
    });
}

loadAccount();