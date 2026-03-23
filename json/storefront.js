(function () {
    const CART_KEY = 'aranha-cart';
    const AUTH_KEY = 'aranha-auth';

    function safeParse(value, fallback) {
        try {
            return value ? JSON.parse(value) : fallback;
        } catch {
            return fallback;
        }
    }

    function getAuth() {
        return safeParse(window.localStorage.getItem(AUTH_KEY), null);
    }

    function getCurrentUserId() {
        return String(getAuth()?.userId || '').trim();
    }

    function getScopedStorageKey(baseKey, userId = getCurrentUserId()) {
        const normalizedUserId = String(userId || '').trim();
        return normalizedUserId ? `${baseKey}:${normalizedUserId}` : baseKey;
    }

    function setAuth(authData) {
        window.localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
        syncAuthLinks();
        updateCartCount();
    }

    function clearAuth() {
        window.localStorage.removeItem(AUTH_KEY);
        syncAuthLinks();
        updateCartCount();
    }

    function isLoggedIn() {
        const authData = getAuth();
        return Boolean(authData && authData.userId);
    }

    function normalizeCartItems(rawCart) {
        let hasLegacyItem = false;

        const normalizedCart = rawCart.map(item => {
            if (item && item.cartItemKey) {
                return item;
            }

            hasLegacyItem = true;

            return {
                ...normalizeProduct(item, { tamanho: item?.tamanho || '' }),
                quantity: Number(item?.quantity || 1)
            };
        });

        return { normalizedCart, hasLegacyItem };
    }

    function migrateLegacyCart(userId) {
        const normalizedUserId = String(userId || '').trim();

        if (!normalizedUserId) {
            return;
        }

        const scopedKey = getScopedStorageKey(CART_KEY, normalizedUserId);

        if (window.localStorage.getItem(scopedKey)) {
            return;
        }

        const legacyRawCart = safeParse(window.localStorage.getItem(CART_KEY), []);

        if (!Array.isArray(legacyRawCart) || !legacyRawCart.length) {
            return;
        }

        const { normalizedCart } = normalizeCartItems(legacyRawCart);
        window.localStorage.setItem(scopedKey, JSON.stringify(normalizedCart));
        window.localStorage.removeItem(CART_KEY);
    }

    function getCart() {
        const userId = getCurrentUserId();

        if (!userId) {
            return [];
        }

        migrateLegacyCart(userId);

        const scopedKey = getScopedStorageKey(CART_KEY, userId);
        const rawCart = safeParse(window.localStorage.getItem(scopedKey), []);
        const { normalizedCart, hasLegacyItem } = normalizeCartItems(rawCart);

        if (hasLegacyItem) {
            window.localStorage.setItem(scopedKey, JSON.stringify(normalizedCart));
        }

        return normalizedCart;
    }

    function saveCart(cart) {
        const userId = getCurrentUserId();

        if (!userId) {
            updateCartCount();
            return;
        }

        window.localStorage.setItem(getScopedStorageKey(CART_KEY, userId), JSON.stringify(cart));
        updateCartCount();
    }

    function buildCartItemKey(productId, tamanho) {
        return `${Number(productId)}:${String(tamanho || 'unico').toUpperCase()}`;
    }

    function normalizeProduct(product, options = {}) {
        const tamanhoSelecionado = String(options.tamanho || product.tamanho || '').trim().toUpperCase();

        return {
            id: Number(product.id),
            cartItemKey: buildCartItemKey(product.id, tamanhoSelecionado),
            nome: product.nome,
            preco: Number(product.preco),
            imagem: product.imagem,
            categoria: product.categoria || '',
            cor: product.cor || '',
            tamanho: tamanhoSelecionado
        };
    }

    function getCartCount() {
        if (!isLoggedIn()) {
            return 0;
        }

        return getCart().reduce((total, item) => total + Number(item.quantity || 0), 0);
    }

    function updateCartCount() {
        const count = getCartCount();

        document.querySelectorAll('[data-cart-count]').forEach(element => {
            element.textContent = String(count);
            element.hidden = count === 0;
        });
    }

    function syncAuthLinks() {
        const href = isLoggedIn() ? '/pages/minha-conta/index.html' : '/pages/login/index.html';

        document.querySelectorAll('[data-auth-link]').forEach(link => {
            link.setAttribute('href', href);
        });
    }

    function redirectToLogin() {
        const redirect = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/pages/login/index.html?redirect=${encodeURIComponent(redirect)}`;
    }

    function ensureLoggedIn(actionLabel) {
        if (isLoggedIn()) {
            return true;
        }

        window.alert(`Faça login para ${actionLabel}.`);
        redirectToLogin();
        return false;
    }

    function addToCart(product, options = {}) {
        if (!ensureLoggedIn('adicionar itens ao carrinho')) {
            return false;
        }

        const normalizedProduct = normalizeProduct(product, options);
        const cart = getCart();
        const existingItem = cart.find(item => item.cartItemKey === normalizedProduct.cartItemKey);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ ...normalizedProduct, quantity: 1 });
        }

        saveCart(cart);
        return true;
    }

    function updateCartItemQuantity(cartItemKey, quantity) {
        const cart = getCart();
        const nextQuantity = Number(quantity);
        const item = cart.find(entry => entry.cartItemKey === cartItemKey);

        if (!item) {
            return;
        }

        if (nextQuantity <= 0) {
            removeCartItem(cartItemKey);
            return;
        }

        item.quantity = nextQuantity;
        saveCart(cart);
    }

    function removeCartItem(cartItemKey) {
        const cart = getCart().filter(item => item.cartItemKey !== cartItemKey);
        saveCart(cart);
    }

    document.addEventListener('DOMContentLoaded', () => {
        updateCartCount();
        syncAuthLinks();
    });

    window.storefront = {
        getAuth,
        getCurrentUserId,
        getScopedStorageKey,
        setAuth,
        clearAuth,
        isLoggedIn,
        getCart,
        saveCart,
        getCartCount,
        updateCartCount,
        addToCart,
        updateCartItemQuantity,
        removeCartItem,
        ensureLoggedIn,
        redirectToLogin
    };
})();