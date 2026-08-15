import { supabase } from '../../json/supabase-browser.js';

// Credenciais locais de administrador (login simples para o dono inserir camisetas)
const ADMIN_EMAIL = 'aranha.admin@gmail.com'
const ADMIN_PASSWORD = 'aranha123'

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginFeedback = document.getElementById('login-feedback');
const registerFeedback = document.getElementById('register-feedback');

function clearAuthInputs() {
    const selectors = [
        '#login-form input[name="email"]',
        '#login-form input[name="password"]',
        '#register-form input[name="fullName"]',
        '#register-form input[name="phone"]',
        '#register-form input[name="email"]',
        '#register-form input[name="password"]'
    ];

    selectors.forEach((selector) => {
        const input = document.querySelector(selector);
        if (input) {
            input.value = '';
        }
    });
}

function enforceBlankAuthForms() {
    if (loginForm) {
        loginForm.reset();
    }
    if (registerForm) {
        registerForm.reset();
    }

    clearAuthInputs();

    requestAnimationFrame(() => {
        clearAuthInputs();
        setTimeout(clearAuthInputs, 80);
    });
}

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

    if (normalized.includes('failed to fetch') || normalized.includes('network') || normalized.includes('fetch failed')) {
        return 'Servico de autenticacao temporariamente indisponivel. Se o banco estiver em restauracao, aguarde alguns minutos e tente novamente.';
    }

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

function getFriendlyError(error) {
    const rawMessage = String(error?.message || error || '');
    return toFriendlyAuthMessage(rawMessage || 'Nao foi possivel concluir a autenticacao agora.');
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

// Inicializar funções do shared.js
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.initComingSoonNotice();
        enforceBlankAuthForms();
    });
} else {
    window.initComingSoonNotice();
    enforceBlankAuthForms();
}

window.addEventListener('pageshow', () => {
    enforceBlankAuthForms();
});

const phoneInput = registerForm ? registerForm.querySelector('input[name="phone"]') : null;

if (phoneInput) {
    phoneInput.addEventListener('input', () => {
        phoneInput.value = window.formatPhone(phoneInput.value);
    });
}

async function redirectIfLoggedIn() {
    let data;

    try {
        const sessionResult = await supabase.auth.getSession();
        data = sessionResult.data;
    } catch (_) {
        return;
    }

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

        // Login local para o administrador (dono do site) inserir camisetas
        if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
            try {
                const { data: adminData, error: adminErr } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
                if (!adminErr && adminData && adminData.user) {
                    if (window.storefront) {
                        window.storefront.setAuth({ userId: adminData.user.id, email: adminData.user.email || '' });
                    }
                    loginFeedback.textContent = 'Login de administrador realizado. Redirecionando...';
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
            loginFeedback.textContent = 'Login de administrador (local) realizado.';
            window.location.href = getRedirectTarget();
            return;
        }

        let data;
        let error;

        try {
            const loginResult = await supabase.auth.signInWithPassword({ email, password });
            data = loginResult.data;
            error = loginResult.error;
        } catch (unexpectedError) {
            loginFeedback.textContent = getFriendlyError(unexpectedError);
            return;
        }

        if (error) {
            loginFeedback.textContent = getFriendlyError(error);
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

        let data;
        let error;

        try {
            const signUpResult = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        phone
                    }
                }
            });

            data = signUpResult.data;
            error = signUpResult.error;
        } catch (unexpectedError) {
            registerFeedback.textContent = getFriendlyError(unexpectedError);
            return;
        }

        if (error) {
            registerFeedback.textContent = getFriendlyError(error);
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