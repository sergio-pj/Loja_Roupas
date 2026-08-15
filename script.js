function toggleMenu() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    // Toggle visual state using CSS class; width handled by CSS per breakpoint
    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
        sidebar.classList.remove('open');
        overlay.style.display = "none";
        document.body.classList.remove('no-scroll');
        document.documentElement.classList.remove('no-scroll');
    } else {
        sidebar.classList.add('open');
        overlay.style.display = "block";
        // Prevent background from scrolling when sidebar is open
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

function syncHeroBannerByViewport() {
    const heroBanner = document.querySelector('.hero-banner');
    if (!heroBanner) return;

    const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
    const mobileImage = "url('assets/banner-mobile.jpeg?v=20260814')";
    const desktopImage = "url('assets/bannerp.svg')";

    heroBanner.style.backgroundImage = isMobileViewport ? mobileImage : desktopImage;
    heroBanner.style.backgroundPosition = isMobileViewport ? 'center top' : 'center 18%';
    heroBanner.style.backgroundSize = isMobileViewport ? 'contain' : 'cover';
    heroBanner.style.backgroundRepeat = 'no-repeat';
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

    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

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
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComingSoonNotice);
} else {
    initComingSoonNotice();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncHeroBannerByViewport);
} else {
    syncHeroBannerByViewport();
}

window.addEventListener('resize', syncHeroBannerByViewport);

const CATALOG_DATA_URL = new URL('pages/catalogo/catalogo.json', window.location.href).href;
let homeMediaCarouselCleanups = [];
    
// Repair helper: try to fix common duplicated-extension mistakes before falling back
if (!window._repairImageSrc) {
    window._repairImageSrc = function(img) {
        try {
            if (!img || !img.src) return;
            const src = String(img.src);
            const dupFixed = src.replace(/(\.(png|jpg|jpeg|svg))(\.(png|jpg|jpeg|svg))+$/i, '$1');
            if (dupFixed !== src) {
                img.onerror = null;
                img.src = dupFixed;
                return;
            }
            img.onerror = null;
            img.src = '../../assets/Fundo_Cabeçalho.png';
        } catch (err) {
            try { img.onerror = null; img.src = '../../assets/Fundo_Cabeçalho.png'; } catch(e){}
        }
    };
}

function resolveProductImages(product) {
    const sources = Array.isArray(product.galeria) && product.galeria.length ? product.galeria : [product.imagem];

    return sources
        .filter(Boolean)
        .map(source => new URL(source, CATALOG_DATA_URL).href);
}

function buildMediaCarouselMarkup(images, altText, className = '') {
    const carouselClassName = ['media-carousel', className].filter(Boolean).join(' ');
    const slides = images.map((source, index) => `
        <img class="media-carousel-slide${index === 0 ? ' is-active' : ''}" src="${source}" alt="${altText} - visual ${index + 1}" loading="${index === 0 ? 'eager' : 'lazy'}" onerror="window._repairImageSrc && window._repairImageSrc(this)">
    `).join('');

    const dots = images.length > 1
        ? `
            <div class="media-carousel-dots" aria-label="Navegação da galeria">
                ${images.map((_, index) => `
                    <button type="button" class="media-carousel-dot${index === 0 ? ' is-active' : ''}" data-slide-index="${index}" aria-label="Ver imagem ${index + 1}"></button>
                `).join('')}
            </div>
        `
        : '';

    return `
        <div class="${carouselClassName}" data-media-carousel data-interval="2400">
            <div class="media-carousel-frame">
                <div class="media-carousel-slides">${slides}</div>
                ${dots}
            </div>
        </div>
    `;
}

function setupMediaCarousel(carousel) {
    const slides = Array.from(carousel.querySelectorAll('.media-carousel-slide'));
    const dots = Array.from(carousel.querySelectorAll('.media-carousel-dot'));

    if (slides.length <= 1) {
        return () => {};
    }

    let activeIndex = 0;
    let intervalId = null;
    const intervalMs = Number(carousel.getAttribute('data-interval')) || 2400;

    const showSlide = (nextIndex, emit = true) => {
        activeIndex = Math.max(0, Math.min(nextIndex, slides.length - 1));
        slides.forEach((slide, index) => {
            slide.classList.toggle('is-active', index === activeIndex);
        });
        dots.forEach((dot, index) => {
            dot.classList.toggle('is-active', index === activeIndex);
            dot.setAttribute('aria-pressed', String(index === activeIndex));
        });

        if (emit) {
            const event = new CustomEvent('catalog-carousel-sync', {
                detail: { index: activeIndex, source: carousel.dataset.carouselId, sourceLength: slides.length }
            });
            document.dispatchEvent(event);
        }
    };

    const stopAutoplay = () => {
        if (intervalId) {
            window.clearInterval(intervalId);
            intervalId = null;
        }
    };

    const startAutoplay = () => {
        stopAutoplay();
        intervalId = window.setInterval(() => {
            showSlide((activeIndex + 1) % slides.length);
        }, intervalMs);
    };

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showSlide(index);
            startAutoplay();
        });
    });

    // Do not stop autoplay on mouse hover to avoid freezes; keep focus handlers for accessibility.
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);

    showSlide(0);
    startAutoplay();

    // Expose setter to receive synchronized updates without re-emitting
    carousel.__setSlide = idx => showSlide(idx, false);

    return () => {
        stopAutoplay();
        try { delete carousel.__setSlide; } catch {}
    };
}

function initializeHomeMediaCarousels(root) {
    homeMediaCarouselCleanups.forEach(cleanup => cleanup());
    homeMediaCarouselCleanups = [];

    const carousels = Array.from(root.querySelectorAll('[data-media-carousel]'));
    carousels.forEach((carousel, idx) => {
        carousel.dataset.carouselId = `home-carousel-${idx}`;
        const cleanup = setupMediaCarousel(carousel);
        homeMediaCarouselCleanups.push(cleanup);
    });

    // Register global sync listener if not already registered by catalog page
    if (!document._catalogCarouselSyncRegistered) {
        document._catalogCarouselSyncRegistered = true;
        document.addEventListener('catalog-carousel-sync', e => {
            const { index, source, sourceLength } = e.detail || {};
            const carouselsNow = Array.from(document.querySelectorAll('[data-media-carousel]'));
            carouselsNow.forEach(carousel => {
                if (carousel.dataset.carouselId === source) return;
                const targetSlides = Array.from(carousel.querySelectorAll('.media-carousel-slide'));
                const targetLength = targetSlides.length || 1;

                let mappedIndex = typeof index === 'number' ? index : 0;
                if (typeof sourceLength === 'number' && sourceLength > 0) {
                    mappedIndex = Math.round(index * (targetLength / sourceLength));
                }

                mappedIndex = Math.max(0, Math.min(mappedIndex, targetLength - 1));

                if (typeof carousel.__setSlide === 'function') {
                    carousel.__setSlide(mappedIndex);
                }
            });
        });
    }
}

const homeCarouselItems = [
    {
        nome: 'Marina S.',
        cidade: 'São Paulo, SP',
        assunto: 'O que ela mais gostou',
        titulo: 'Caimento e toque do tecido',
        nota: 5,
        depoimento: 'A camiseta chegou com um caimento muito melhor do que eu esperava. O tecido é leve, mas passa estrutura e qualidade.'
    },
    {
        nome: 'Rafael M.',
        cidade: 'Curitiba, PR',
        assunto: 'O que ele mais gostou',
        titulo: 'Experiência e numeração correta',
        nota: 5,
        depoimento: 'Comprei pela primeira vez e gostei muito da experiência. O acabamento é bonito e o tamanho vestiu exatamente como eu queria.'
    },
    {
        nome: 'Camila T.',
        cidade: 'Belo Horizonte, MG',
        assunto: 'O que ela mais gostou',
        titulo: 'Visual elegante no corpo',
        nota: 5,
        depoimento: 'A peça ficou elegante no corpo e combinou com tudo. Dá para sentir que não é uma camiseta comum de loja genérica.'
    },
    {
        nome: 'João P.',
        cidade: 'Recife, PE',
        assunto: 'O que ele mais gostou',
        titulo: 'Identidade da marca e entrega',
        nota: 5,
        depoimento: 'Gostei do visual limpo da marca e da entrega. Comprei uma peça para testar e já quero pegar outra cor na próxima compra.'
    }
];

let homeCarouselStartIndex = 0;
let homeCarouselIntervalId = null;
let homeCarouselTransitioning = false;

function renderHomeCarousel() {
    const track = document.getElementById('home-carousel-track');

    if (!track) {
        return;
    }

    const orderedItems = homeCarouselItems.map((_, index) => {
        const nextIndex = (homeCarouselStartIndex + index) % homeCarouselItems.length;
        return homeCarouselItems[nextIndex];
    });

    track.innerHTML = orderedItems.map((item, index) => `
        <article class="home-carousel-card" style="--card-delay: ${index * 70}ms;">
            <div class="home-carousel-feedback">
                <div class="home-feedback-bubble">
                    <div class="home-feedback-stars">${'<i class="fas fa-star"></i>'.repeat(5)}</div>
                    <p class="home-feedback-quote">“${item.depoimento}”</p>
                </div>
                <div class="home-feedback-meta">
                    <div class="home-feedback-topic">
                        <span class="home-feedback-label">${item.assunto}</span>
                        <strong class="home-feedback-title">${item.titulo}</strong>
                    </div>
                    <div class="home-feedback-author">
                        <strong>${item.nome}</strong>
                        <span>${item.cidade}</span>
                    </div>
                </div>
            </div>
        </article>
    `).join('');
}

function advanceHomeCarousel() {
    const track = document.getElementById('home-carousel-track');

    if (!track || homeCarouselTransitioning) {
        return;
    }

    homeCarouselTransitioning = true;
    track.classList.add('is-transitioning');

    window.setTimeout(() => {
        homeCarouselStartIndex = (homeCarouselStartIndex + 1) % homeCarouselItems.length;
        renderHomeCarousel();

        window.requestAnimationFrame(() => {
            track.classList.remove('is-transitioning');
        });

        window.setTimeout(() => {
            homeCarouselTransitioning = false;
        }, 360);
    }, 180);
}

function startHomeCarouselAutoplay() {
    stopHomeCarouselAutoplay();
    homeCarouselIntervalId = window.setInterval(() => {
        advanceHomeCarousel();
    }, 3000);
}

function stopHomeCarouselAutoplay() {
    if (homeCarouselIntervalId) {
        window.clearInterval(homeCarouselIntervalId);
        homeCarouselIntervalId = null;
    }
}

function setupHomeCarousel() {
    const section = document.querySelector('.home-carousel-section');
    const track = document.getElementById('home-carousel-track');

    if (!section || !track) {
        return;
    }

    renderHomeCarousel();
    startHomeCarouselAutoplay();

    section.addEventListener('mouseenter', () => {
        stopHomeCarouselAutoplay();
    });

    section.addEventListener('mouseleave', () => {
        startHomeCarouselAutoplay();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopHomeCarouselAutoplay();
            return;
        }

        startHomeCarouselAutoplay();
    });
}

function filtrar(criterio) {
    const params = new URLSearchParams();

    if (criterio && criterio !== 'todos') {
        params.set('filtro', criterio);
    }

    const destino = `pages/catalogo/index.html${params.toString() ? `?${params.toString()}` : ''}`;
    window.location.href = destino;
}

async function carregarProdutos() {
    const container = document.getElementById('home-highlights-grid');
    if (!container) return;

    let products = [];
    try {
        const response = await fetch(CATALOG_DATA_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        products = await response.json();
    } catch (error) {
        console.warn('Nao foi possivel carregar catalogo.json na home.', error);
        container.innerHTML = '<p>Não foi possível carregar os destaques. Tente novamente mais tarde.</p>';
        return;
    }

    // Seleciona os produtos desejados pelo ID
    const idsDestaque = [8, 3, 7]; // 8: Branca, 3: Bege, 7: Preta
    const destaques = idsDestaque
        .map(id => products.find(p => p.id === id))
        .filter(Boolean); // Garante que apenas produtos encontrados sejam usados

    if (destaques.length < 3) {
        console.warn('Não foi possível encontrar todos os produtos de destaque (IDs: 8, 3, 7).');
    }

    container.innerHTML = destaques.map(prod => `
        <article class="product-card">
            <a class="product-card-link" href="pages/produto/index.html?id=${prod.id}">
                ${buildMediaCarouselMarkup(resolveProductImages(prod), prod.nome, 'home-product-carousel')}
                <h3>${prod.nome}</h3>
                <p class="price">R$ ${Number(prod.preco).toFixed(2).replace('.', ',')}</p>
            </a>
        </article>
    `).join('');

    initializeHomeMediaCarousels(container);
}

carregarProdutos();
setupHomeCarousel();

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

    const supabaseClient = await waitForSupabaseClient();
    if (!supabaseClient) {
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

        setSidebarGuestState(container);
    } catch (error) {
        console.error('Error updating sidebar auth state', error);
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

    waitForSupabaseClient().then((supabaseClient) => {
        if (!supabaseClient?.auth?.onAuthStateChange) return;
        supabaseClient.auth.onAuthStateChange(() => {
            updateSidebarAuthState();
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarAuthState);
} else {
    initSidebarAuthState();
}