/**
 * Funções compartilhadas entre todas as páginas
 * Sidebar, modal "Em breve" e utilitários
 * 
 * ATENÇÃO: Este arquivo NÃO usa export/import porque é carregado como
 * <script src> comum. As funções são expostas via window.
 */

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    if (!sidebar || !overlay) {
        return;
    }

    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
        sidebar.classList.remove('open');
        overlay.style.display = 'none';
        document.body.classList.remove('no-scroll');
        document.documentElement.classList.remove('no-scroll');
    } else {
        sidebar.classList.add('open');
        overlay.style.display = 'block';
        document.body.classList.add('no-scroll');
        document.documentElement.classList.add('no-scroll');
    }
}

function normalizeSidebarCategories() {
    const categoriesList = document.querySelector('#sidebar .sidebar-categories-list');
    if (!categoriesList || categoriesList.dataset.normalized === 'true') return;

    const catalogHref = window.location.pathname.toLowerCase().includes('/pages/')
        ? '../catalogo/index.html'
        : 'pages/catalogo/index.html';

    categoriesList.innerHTML = `
        <a href="${catalogHref}">MOLETOM</a>
        <a href="${catalogHref}">CAMISETAS</a>
        <a href="${catalogHref}">POLOS</a>
    `;
    categoriesList.dataset.normalized = 'true';
}

function resolveLoginPath() {
    return window.location.pathname.toLowerCase().includes('/pages/')
        ? '../login/index.html'
        : 'pages/login/index.html';
}

function resolveDisplayName(user) {
    const metadata = user?.user_metadata || {};
    const candidates = [
        metadata.full_name,
        metadata.name,
        metadata.nome,
        metadata.first_name
    ];

    for (const candidate of candidates) {
        if (candidate && String(candidate).trim()) {
            return String(candidate).trim();
        }
    }

    if (user?.email && String(user.email).includes('@')) {
        return String(user.email).split('@')[0];
    }

    return 'cliente';
}

function safeParseJson(rawValue, fallback = null) {
    try {
        return rawValue ? JSON.parse(rawValue) : fallback;
    } catch {
        return fallback;
    }
}

function readSupabaseUserFromStorage() {
    try {
        const storageKeys = Object.keys(window.localStorage || {});
        const authTokenKey = storageKeys.find((key) => /^sb-[a-z0-9]+-auth-token$/i.test(key));

        if (!authTokenKey) {
            return null;
        }

        const rawSession = safeParseJson(window.localStorage.getItem(authTokenKey), null);
        const session = rawSession?.currentSession
            || rawSession?.session
            || rawSession?.data?.session
            || rawSession
            || null;
        const user = session?.user || rawSession?.user || null;
        const expiresAt = Number(session?.expires_at || 0);

        if (!user?.id) {
            return null;
        }

        if (expiresAt && Date.now() >= expiresAt * 1000) {
            return null;
        }

        return user;
    } catch {
        return null;
    }
}

function readStorefrontAuthFromStorage() {
    try {
        if (window.storefront?.getAuth) {
            const auth = window.storefront.getAuth();
            if (auth?.userId) {
                return auth;
            }
        }

        const fallbackAuth = safeParseJson(window.localStorage.getItem('aranha-auth'), null);
        if (fallbackAuth?.userId) {
            return fallbackAuth;
        }

        return null;
    } catch {
        return null;
    }
}

function readUserFromFallbacks() {
    const supabaseStorageUser = readSupabaseUserFromStorage();
    if (supabaseStorageUser) {
        return {
            name: resolveDisplayName(supabaseStorageUser),
            source: 'supabase-storage'
        };
    }

    const auth = readStorefrontAuthFromStorage();
    if (!auth?.userId) {
        return null;
    }

    const candidateName = auth.full_name || auth.fullName || auth.name || auth.nome;
    if (candidateName && String(candidateName).trim()) {
        return {
            name: String(candidateName).trim(),
            source: 'storefront-auth'
        };
    }

    if (auth.email && String(auth.email).includes('@')) {
        return {
            name: String(auth.email).split('@')[0],
            source: 'storefront-auth'
        };
    }

    return {
        name: 'cliente',
        source: 'storefront-auth'
    };
}

function updateSidebarLoginShortcut(isLoggedIn) {
    const accountList = document.querySelector('#sidebar .sidebar-account-list');
    if (!accountList) return;

    const dynamicShortcut = accountList.querySelector('.login-shortcut-dynamic');
    if (dynamicShortcut) {
        dynamicShortcut.remove();
    }

    if (!isLoggedIn) {
        return;
    }

    const loginHref = resolveLoginPath();
    const loginShortcut = document.createElement('a');
    loginShortcut.href = loginHref;
    loginShortcut.className = 'account-link login-shortcut-dynamic';
    loginShortcut.innerHTML = '<i class="fas fa-user-circle"></i> Meu login';

    const inicioLink = accountList.querySelector('.inicio-link');
    if (inicioLink) {
        accountList.insertBefore(loginShortcut, inicioLink);
        return;
    }

    accountList.appendChild(loginShortcut);
}

function setSidebarGuestState(container) {
    const greeting = container.querySelector('.greeting');
    const authLinks = container.querySelector('.auth-links');
    const loginHref = resolveLoginPath();

    if (!greeting || !authLinks) {
        container.innerHTML = `
            <strong class="greeting">Olá, visitante</strong>
            <span class="auth-links">
                <a href="${loginHref}">Entrar</a>
                <span class="sep">ou</span>
                <a href="${loginHref}">Cadastrar</a>
            </span>
        `;
        updateSidebarLoginShortcut(false);
        return;
    }

    if (greeting) {
        greeting.textContent = 'Olá, visitante';
    }

    if (authLinks) {
        const links = authLinks.querySelectorAll('a');
        if (links[0]) links[0].setAttribute('href', loginHref);
        if (links[1]) links[1].setAttribute('href', loginHref);
        authLinks.style.display = '';
    }

    updateSidebarLoginShortcut(false);
}

function setSidebarLoggedState(container, name) {
    const greeting = container.querySelector('.greeting');
    const authLinks = container.querySelector('.auth-links');

    if (greeting) {
        greeting.textContent = `Seja bem-vindo, ${name}`;
    }

    if (authLinks) {
        authLinks.style.display = 'none';
    }

    updateSidebarLoginShortcut(true);
}

async function waitForSupabaseClient(maxAttempts = 120) {
    for (let index = 0; index < maxAttempts; index += 1) {
        if (window.supabase?.auth?.getSession) {
            return window.supabase;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return null;
}

async function updateSidebarAuthState() {
    const container = document.querySelector('.sidebar-user-quick .user-quick-text');
    if (!container) return;

    const fallbackUser = readUserFromFallbacks();
    if (fallbackUser?.name) {
        setSidebarLoggedState(container, fallbackUser.name);
    }

    const supabaseClient = await waitForSupabaseClient();
    if (!supabaseClient) {
        const resolvedFallbackUser = readUserFromFallbacks();
        if (resolvedFallbackUser?.name) {
            setSidebarLoggedState(container, resolvedFallbackUser.name);
            return;
        }

        setSidebarGuestState(container);
        return;
    }

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (session?.user) {
            const name = resolveDisplayName(session.user);
            setSidebarLoggedState(container, name);
            return;
        }

        const resolvedFallbackUser = readUserFromFallbacks();
        if (resolvedFallbackUser?.name) {
            setSidebarLoggedState(container, resolvedFallbackUser.name);
            return;
        }

        setSidebarGuestState(container);
    } catch (error) {
        console.error('Error updating sidebar auth state', error);
        const resolvedFallbackUser = readUserFromFallbacks();
        if (resolvedFallbackUser?.name) {
            setSidebarLoggedState(container, resolvedFallbackUser.name);
            return;
        }

        setSidebarGuestState(container);
    }
}

function initSidebarAuthState() {
    if (window.__sidebarAuthInitialized) {
        return;
    }

    window.__sidebarAuthInitialized = true;
    updateSidebarAuthState();

    window.addEventListener('load', () => {
        updateSidebarAuthState();
    });

    window.addEventListener('storage', (event) => {
        if (!event?.key) return;
        if (event.key === 'aranha-auth' || /^sb-[a-z0-9]+-auth-token$/i.test(event.key)) {
            updateSidebarAuthState();
        }
    });

    waitForSupabaseClient().then((supabaseClient) => {
        if (!supabaseClient?.auth?.onAuthStateChange) return;
        supabaseClient.auth.onAuthStateChange(() => {
            updateSidebarAuthState();
        });
    });
}

function ensureComingSoonModal() {
    let modal = document.getElementById('coming-soon-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'coming-soon-modal';
    modal.className = 'coming-soon-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'coming-soon-title');
    modal.innerHTML = `
        <div class="coming-soon-card">
            <button type="button" class="coming-soon-close" aria-label="Fechar aviso">×</button>
            <p class="coming-soon-eyebrow">Em breve</p>
            <h3 id="coming-soon-title">Ainda estamos trabalhando nisso</h3>
            <p>Essa categoria ainda nao esta disponivel no momento. Em breve teremos novidades para voce.</p>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function initComingSoonNotice() {
    normalizeSidebarCategories();
    const modal = ensureComingSoonModal();
    const closeButton = modal?.querySelector('.coming-soon-close');
    const sidebar = document.getElementById('sidebar');

    if (!modal || !closeButton) return;

    const closeModal = () => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('no-scroll');
        document.documentElement.classList.remove('no-scroll');
    };

    const openModal = () => {
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('no-scroll');
        document.documentElement.classList.add('no-scroll');
    };

    if (!closeButton.dataset.bound) {
        closeButton.addEventListener('click', closeModal);
        closeButton.dataset.bound = 'true';
    }

    if (!modal.dataset.bound) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
        modal.dataset.bound = 'true';
    }

    const blockedCategories = new Set([
        'moletom',
        'moletons',
        'polo',
        'polos',
        'shorts e bermudas',
        'shorts',
        'bermudas',
        'kits',
        'kit'
    ]);

    document.querySelectorAll('#sidebar .sidebar-categories-list a').forEach((link) => {
        if (link.dataset.comingSoonBound === 'true') return;
        link.addEventListener('click', (event) => {
            const label = link.textContent
                .trim()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[’'´`]/g, '')
                .replace(/\s+/g, ' ');

            if (blockedCategories.has(label)) {
                event.preventDefault();
                if (sidebar?.classList.contains('open')) {
                    toggleMenu();
                }
                openModal();
            }
        });
        link.dataset.comingSoonBound = 'true';
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarAuthState);
} else {
    initSidebarAuthState();
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
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);

    if (digits.length <= 5) {
        return digits;
    }

    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatPrice(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Expor funções globalmente para serem usadas nos scripts das páginas
window.toggleMenu = toggleMenu;
window.initComingSoonNotice = initComingSoonNotice;
window.normalizeSidebarCategories = normalizeSidebarCategories;
window.formatPhone = formatPhone;
window.formatZipCode = formatZipCode;
window.formatPrice = formatPrice;
window.updateSidebarAuthState = updateSidebarAuthState;