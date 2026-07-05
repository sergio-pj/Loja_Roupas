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

    document.querySelectorAll('#sidebar .sidebar-categories-list a').forEach((link) => {
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
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComingSoonNotice);
} else {
    initComingSoonNotice();
}

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

    if (!container) {
        return;
    }

    let staticData = [];
    try {
        const response = await fetch(CATALOG_DATA_URL);
        staticData = await response.json();
    } catch (error) {
        console.warn('Nao foi possivel carregar catalogo.json na home.', error);
    }

    let dbData = [];
    if (window.supabase) {
        try {
            const { data, error } = await window.supabase
                .from('produtos')
                .select('*')
                .order('id', { ascending: false });

            if (!error && Array.isArray(data)) {
                dbData = data.map(item => ({
                    ...item,
                    galeria: item.galeria || [],
                    imagem: item.imagem || item.imagem_url || ''
                }));
            }
        } catch (error) {
            console.warn('Nao foi possivel carregar produtos do Supabase na home.', error);
        }
    }

    const merged = dbData.slice();
    const dbIds = new Set(dbData.map(item => Number(item.id)));

    staticData.forEach(item => {
        const itemId = Number(item.id);
        if (!dbIds.has(itemId)) {
            merged.push({
                ...item,
                galeria: item.galeria || [],
                imagem: item.imagem || item.imagem_url || ''
            });
        }
    });

    const destaques = merged.slice(0, 3);

    container.innerHTML = destaques.map(prod => `
        <article class="product-card">
            <a class="product-card-link" href="pages/produto/index.html?id=${prod.id}">
                ${buildMediaCarouselMarkup(resolveProductImages(prod), prod.nome, 'home-product-carousel')}
                <h3>${prod.nome}</h3>
                <p class="price">R$ ${prod.preco.toFixed(2).replace('.', ',')}</p>
            </a>
        </article>
    `).join('');

    initializeHomeMediaCarousels(container);
}

carregarProdutos();
setupHomeCarousel();

// Gerencia exibição do bloco de autenticação no sidebar:
// - se `localStorage.aranhaUser` existir mostra `Olá, <nome>` e esconde os links;
// - caso contrário exibe os links `Entrar / Cadastrar`.
(function sidebarAuthToggle(){
    const KEY = 'aranhaUser';

    function getContainer(){
        return document.querySelector('.sidebar-user-quick .user-quick-text');
    }

    function update() {
        const raw = localStorage.getItem(KEY);
        const container = getContainer();
        if (!container) return;

        const authBlock = container.querySelector('.auth-links');
        const greeting = container.querySelector('.greeting');

        if (raw) {
            try {
                const user = JSON.parse(raw);
                const name = user && (user.nome || user.name || user.username) ? (user.nome || user.name || user.username) : 'cliente';
                if (greeting) greeting.textContent = `Olá, ${name}`;
                if (authBlock) authBlock.style.display = 'none';
            } catch (e) {
                // se JSON inválido, remove a chave por segurança
                try { localStorage.removeItem(KEY); } catch(_){}
                if (greeting) greeting.textContent = 'Olá, visitante';
                if (authBlock) authBlock.style.display = '';
            }
        } else {
            if (greeting) greeting.textContent = 'Olá, visitante';
            if (authBlock) authBlock.style.display = '';
        }
    }

    // Atualiza imediatamente e ao mudar storage (sincroniza entre abas)
    try { update(); } catch (e) {}
    window.addEventListener('storage', e => { if (e.key === KEY) update(); });
    // Também atualiza depois do carregamento completo caso scripts inline tenham modificado o DOM
    window.addEventListener('load', update);
})();