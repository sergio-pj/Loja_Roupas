function toggleMenu() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    
    if (sidebar.style.width === "250px") {
        sidebar.style.width = "0";
        overlay.style.display = "none";
    } else {
        sidebar.style.width = "250px";
        overlay.style.display = "block";
    }
}

const CATALOG_DATA_URL = new URL('pages/catalogo/catalogo.json', window.location.href).href;
let homeMediaCarouselCleanups = [];
let homeMediaCarouselSyncIntervalId = null;
let homeMediaCarouselSyncIndex = 0;
const homeMediaCarouselPauseSet = new Set();

function resolveProductImages(product) {
    const sources = Array.isArray(product.galeria) && product.galeria.length ? product.galeria : [product.imagem];

    return sources
        .filter(Boolean)
        .map(source => new URL(source, CATALOG_DATA_URL).href);
}

function buildMediaCarouselMarkup(images, altText, className = '') {
    const carouselClassName = ['media-carousel', className].filter(Boolean).join(' ');
    const slides = images.map((source, index) => `
        <img class="media-carousel-slide${index === 0 ? ' is-active' : ''}" src="${source}" alt="${altText} - visual ${index + 1}" loading="${index === 0 ? 'eager' : 'lazy'}">
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

function createMediaCarouselController(carousel) {
    const slides = Array.from(carousel.querySelectorAll('.media-carousel-slide'));
    const dots = Array.from(carousel.querySelectorAll('.media-carousel-dot'));

    if (slides.length <= 1) {
        return null;
    }

    const showSlide = nextIndex => {
        const normalizedIndex = nextIndex % slides.length;

        slides.forEach((slide, index) => {
            slide.classList.toggle('is-active', index === normalizedIndex);
        });
        dots.forEach((dot, index) => {
            dot.classList.toggle('is-active', index === normalizedIndex);
            dot.setAttribute('aria-pressed', String(index === normalizedIndex));
        });
    };

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            homeMediaCarouselSyncIndex = index;
            synchronizeHomeMediaCarousels();
            restartHomeMediaCarouselSync();
        });
    });

    const pause = () => {
        homeMediaCarouselPauseSet.add(carousel);
        stopHomeMediaCarouselSync();
    };

    const resume = () => {
        homeMediaCarouselPauseSet.delete(carousel);

        if (homeMediaCarouselPauseSet.size === 0) {
            startHomeMediaCarouselSync();
        }
    };

    carousel.addEventListener('mouseenter', pause);
    carousel.addEventListener('mouseleave', resume);
    carousel.addEventListener('focusin', pause);
    carousel.addEventListener('focusout', resume);

    showSlide(homeMediaCarouselSyncIndex);

    return () => {
        homeMediaCarouselPauseSet.delete(carousel);
        carousel.removeEventListener('mouseenter', pause);
        carousel.removeEventListener('mouseleave', resume);
        carousel.removeEventListener('focusin', pause);
        carousel.removeEventListener('focusout', resume);
    };
}

function stopHomeMediaCarouselSync() {
    if (homeMediaCarouselSyncIntervalId) {
        window.clearInterval(homeMediaCarouselSyncIntervalId);
        homeMediaCarouselSyncIntervalId = null;
    }
}

function synchronizeHomeMediaCarousels() {
    Array.from(document.querySelectorAll('[data-media-carousel]')).forEach(carousel => {
        const slides = Array.from(carousel.querySelectorAll('.media-carousel-slide'));
        const dots = Array.from(carousel.querySelectorAll('.media-carousel-dot'));

        if (slides.length <= 1) {
            return;
        }

        const normalizedIndex = homeMediaCarouselSyncIndex % slides.length;

        slides.forEach((slide, index) => {
            slide.classList.toggle('is-active', index === normalizedIndex);
        });

        dots.forEach((dot, index) => {
            dot.classList.toggle('is-active', index === normalizedIndex);
            dot.setAttribute('aria-pressed', String(index === normalizedIndex));
        });
    });
}

function startHomeMediaCarouselSync() {
    if (homeMediaCarouselSyncIntervalId || homeMediaCarouselPauseSet.size > 0) {
        return;
    }

    homeMediaCarouselSyncIntervalId = window.setInterval(() => {
        homeMediaCarouselSyncIndex += 1;
        synchronizeHomeMediaCarousels();
    }, 2400);
}

function restartHomeMediaCarouselSync() {
    stopHomeMediaCarouselSync();

    if (homeMediaCarouselPauseSet.size === 0) {
        startHomeMediaCarouselSync();
    }
}

function initializeHomeMediaCarousels(root) {
    homeMediaCarouselCleanups.forEach(cleanup => cleanup());
    stopHomeMediaCarouselSync();
    homeMediaCarouselPauseSet.clear();

    homeMediaCarouselCleanups = Array.from(root.querySelectorAll('[data-media-carousel]'))
        .map(createMediaCarouselController)
        .filter(Boolean);

    homeMediaCarouselSyncIndex = 0;
    synchronizeHomeMediaCarousels();
    startHomeMediaCarouselSync();
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

    const response = await fetch(CATALOG_DATA_URL);
    const produtos = await response.json();
    const destaques = produtos.slice(0, 3);

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