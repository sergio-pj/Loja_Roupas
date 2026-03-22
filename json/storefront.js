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

    function getCart() {
        const rawCart = safeParse(window.localStorage.getItem(CART_KEY), []);
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

        if (hasLegacyItem) {
            window.localStorage.setItem(CART_KEY, JSON.stringify(normalizedCart));
        }

        return normalizedCart;
    }

    function saveCart(cart) {
        window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
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