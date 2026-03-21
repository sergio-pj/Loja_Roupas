import { supabase } from '../../json/supabase-browser.js';

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

    if (sidebar.style.width === '250px') {
        sidebar.style.width = '0';
        overlay.style.display = 'none';
    } else {
        sidebar.style.width = '250px';
        overlay.style.display = 'block';
    }
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