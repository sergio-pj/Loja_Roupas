import { supabase } from '../../json/supabase-browser.js';

// Credenciais locais de administrador (login simples sem depender de SMTP)
const ADMIN_EMAIL = 'aranha.admin@gmail.com'
const ADMIN_PASSWORD = 'aranha123'

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginFeedback = document.getElementById('login-feedback');
const registerFeedback = document.getElementById('register-feedback');

function getRedirectTarget() {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');

    if (!redirect || !redirect.startsWith('/')) {
        return '../minha-conta/index.html';
    }

    return redirect;
}

function toFriendlyAuthMessage(message) {
    const normalized = String(message || '').toLowerCase();

    if (normalized.includes('email not confirmed')) {
        return 'Seu cadastro foi criado, mas o e-mail ainda nao foi confirmado. Abra sua caixa de entrada e clique no link de confirmacao.';
    }

    if (normalized.includes('invalid login credentials')) {
        return 'E-mail ou senha invalidos. Se voce acabou de se cadastrar, confirme primeiro o e-mail enviado pelo Supabase.';
    }

    if (normalized.includes('user already registered')) {
        return 'Este e-mail ja esta cadastrado. Tente entrar com sua senha.';
    }

    return message;
}

async function syncProfile(user, profile) {
    const payload = {
        id: user.id,
        email: user.email,
        full_name: profile.fullName || user.user_metadata?.full_name || '',
        phone: profile.phone || user.user_metadata?.phone || ''
    };

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    return error;
}

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

    document.querySelectorAll('#sidebar .sidebar-categories-list a').forEach((link) => {
        if (link.dataset.comingSoonBound === 'true') return;
        link.addEventListener('click', (event) => {
            const label = link.textContent.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (['moletom', 'moletons', 'polo', 'polos'].includes(label)) {
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
    document.addEventListener('DOMContentLoaded', initComingSoonNotice);
} else {
    initComingSoonNotice();
}

window.toggleMenu = toggleMenu;

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

const phoneInput = registerForm ? registerForm.querySelector('input[name="phone"]') : null;

if (phoneInput) {
    phoneInput.addEventListener('input', () => {
        phoneInput.value = formatPhone(phoneInput.value);
    });
}

async function redirectIfLoggedIn() {
    const { data } = await supabase.auth.getSession();

    if (data.session) {
        if (window.storefront) {
            window.storefront.setAuth({
                userId: data.session.user.id,
                email: data.session.user.email || ''
            });
        }
        window.location.href = getRedirectTarget();
    }
}

if (loginForm) {
    loginForm.addEventListener('submit', async event => {
        event.preventDefault();
        loginFeedback.textContent = 'Entrando...';

        const formData = new FormData(loginForm);
        const email = String(formData.get('email') || '').trim();
        const password = String(formData.get('password') || '');

            // login local para o administrador (tenta autenticar no Supabase primeiro)
            if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
                try {
                    const { data: adminData, error: adminErr } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
                    if (!adminErr && adminData && adminData.user) {
                        if (window.storefront) {
                            window.storefront.setAuth({ userId: adminData.user.id, email: adminData.user.email || '' });
                        }
                        loginFeedback.textContent = 'Login de administrador realizado (Supabase). Redirecionando...';
                        window.location.href = getRedirectTarget();
                        return;
                    }
                } catch (e) {
                    // segue para fallback
                }

                // fallback local se nao conseguir autenticar no Supabase
                if (window.storefront) {
                    window.storefront.setAuth({ userId: 'admin-local', email: ADMIN_EMAIL });
                }
                loginFeedback.textContent = 'Login de administrador (local) realizado. Aviso: uploads/inserções podem falhar sem conta Supabase.';
                window.location.href = getRedirectTarget();
                return;
            }

            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                loginFeedback.textContent = toFriendlyAuthMessage(error.message);
                return;
            }

        if (data.user) {
            if (window.storefront) {
                window.storefront.setAuth({
                    userId: data.user.id,
                    email: data.user.email || ''
                });
            }

            const syncError = await syncProfile(data.user, {
                fullName: data.user.user_metadata?.full_name || '',
                phone: data.user.user_metadata?.phone || ''
            });

            if (syncError && !syncError.message.toLowerCase().includes('relation "profiles" does not exist')) {
                loginFeedback.textContent = syncError.message;
                return;
            }
        }

        loginFeedback.textContent = 'Login realizado. Redirecionando...';
        window.location.href = getRedirectTarget();
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', async event => {
        event.preventDefault();
        registerFeedback.textContent = 'Criando cadastro...';

        const formData = new FormData(registerForm);
        const fullName = String(formData.get('fullName') || '').trim();
        const phone = String(formData.get('phone') || '').trim();
        const email = String(formData.get('email') || '').trim();
        const password = String(formData.get('password') || '');

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    phone
                }
            }
        });

        if (error) {
            registerFeedback.textContent = toFriendlyAuthMessage(error.message);
            return;
        }

        if (data.user && data.session) {
            const syncError = await syncProfile(data.user, { fullName, phone });

            if (syncError && !syncError.message.toLowerCase().includes('relation "profiles" does not exist')) {
                registerFeedback.textContent = syncError.message;
                return;
            }
        }

        if (!data.session) {
            registerFeedback.textContent = 'Cadastro criado. Agora confirme o e-mail enviado pelo Supabase antes de fazer login.';
        } else {
            if (window.storefront) {
                window.storefront.setAuth({
                    userId: data.user.id,
                    email: data.user.email || ''
                });
            }
            registerFeedback.textContent = 'Cadastro criado com sucesso.';
        }
        registerForm.reset();
    });
}

redirectIfLoggedIn();