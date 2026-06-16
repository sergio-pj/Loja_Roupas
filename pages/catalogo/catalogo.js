let produtosDados = [];
let filtroAtual = 'todos';
let termoBuscaAtual = '';
let paginaAtual = 1;
const itensPorPagina = 6;
const CATALOG_DATA_URL = new URL('catalogo.json', window.location.href).href;
let catalogMediaCarouselCleanups = [];

// Repair helper: try to fix common duplicated-extension mistakes before falling back
if (!window._repairImageSrc) {
    window._repairImageSrc = function(img) {
        try {
            if (!img || !img.src) return;
            const src = String(img.src);
            // Try collapse duplicated extensions like .png.png or .svg.svg
            const dupFixed = src.replace(/(\.(png|jpg|jpeg|svg))(\.(png|jpg|jpeg|svg))+$/i, '$1');
            if (dupFixed !== src) {
                img.onerror = null;
                img.src = dupFixed;
                return;
            }
            // If still failing, final fallback
            img.onerror = null;
            img.src = '../../assets/Fundo_Cabeçalho.png';
        } catch (err) {
            try { img.onerror = null; img.src = '../../assets/Fundo_Cabeçalho.png'; } catch(e){}
        }
    };
}

function resolveProductImages(produto) {
    const sources = Array.isArray(produto.galeria) && produto.galeria.length ? produto.galeria : [produto.imagem];

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

    // Do not stop autoplay on mouse hover — keep rotation consistent across cards.
    // Keep focus handlers for keyboard accessibility.
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);

    showSlide(0);
    startAutoplay();

    // Expose setter for external synchronization without re-emitting
    carousel.__setSlide = idx => showSlide(idx, false);

    return () => {
        stopAutoplay();
        // cleanup any attached setter
        try { delete carousel.__setSlide; } catch {}
    };
}

function initializeCatalogMediaCarousels(root) {
    catalogMediaCarouselCleanups.forEach(cleanup => cleanup());
    catalogMediaCarouselCleanups = [];

    const carousels = Array.from(root.querySelectorAll('[data-media-carousel]'));
    carousels.forEach((carousel, idx) => {
        carousel.dataset.carouselId = `catalog-carousel-${idx}`;
        const cleanup = setupMediaCarousel(carousel);
        catalogMediaCarouselCleanups.push(cleanup);
    });

    // Register a single global sync listener (guard against multiple registrations)
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

function getProdutosFiltrados() {
    return produtosDados.filter(produto => {
        const nome = produto.nome.toLowerCase();
        const categoria = produto.categoria.toLowerCase();
        const cor = produto.cor.toLowerCase();

        const passaBusca = !termoBuscaAtual || nome.includes(termoBuscaAtual) || categoria.includes(termoBuscaAtual);
        const passaFiltro = filtroAtual === 'todos' || produto.categoria === filtroAtual || produto.cor === filtroAtual;

        return passaBusca && passaFiltro;
    });
}

function renderizarPaginacao(totalItems) {
    const pagination = document.getElementById('catalog-pagination');

    if (!pagination) {
        return;
    }

    const totalPaginas = Math.ceil(totalItems / itensPorPagina);

    if (totalPaginas <= 1) {
        pagination.hidden = true;
        pagination.innerHTML = '';
        return;
    }

    pagination.hidden = false;
    pagination.innerHTML = Array.from({ length: totalPaginas }, (_, index) => {
        const page = index + 1;
        const activeClass = page === paginaAtual ? ' is-active' : '';
        return `<button type="button" class="pagination-button${activeClass}" data-page="${page}">${page}</button>`;
    }).join('');
}

function atualizarCatalogo() {
    const produtosFiltrados = getProdutosFiltrados();
    const totalPaginas = Math.max(1, Math.ceil(produtosFiltrados.length / itensPorPagina));

    if (paginaAtual > totalPaginas) {
        paginaAtual = totalPaginas;
    }

    const startIndex = (paginaAtual - 1) * itensPorPagina;
    const produtosPagina = produtosFiltrados.slice(startIndex, startIndex + itensPorPagina);

    exibirProdutos(produtosPagina);
    renderizarPaginacao(produtosFiltrados.length);
}

function aplicarFiltroInicial() {
    const params = new URLSearchParams(window.location.search);
    const filtro = params.get('filtro');

    if (filtro) {
        filtroAtual = filtro;
    }
}

// Busca os dados do JSON
async function carregarProdutos() {
    try {
        const response = await fetch(CATALOG_DATA_URL);
        produtosDados = await response.json();
        aplicarFiltroInicial();
        atualizarCatalogo();
    } catch (error) {
        console.error("Erro ao carregar o catálogo:", error);
    }
}

// Renderiza os produtos no grid
function exibirProdutos(lista) {
    const container = document.getElementById('lista-produtos');
    container.innerHTML = ""; 

    lista.forEach(produto => {
        const card = `
            <div class="product-card">
                <a class="product-image" href="../produto/index.html?id=${produto.id}" aria-label="Abrir produto ${produto.nome}">
                    ${buildMediaCarouselMarkup(resolveProductImages(produto), produto.nome, 'catalog-product-carousel')}
                </a>
                <button type="button" class="product-floating-cart" data-product-id="${produto.id}" aria-label="Adicionar ${produto.nome} ao carrinho">
                    <i class="fas fa-cart-shopping"></i>
                </button>
                <div class="product-info">
                    <a class="product-title-link" href="../produto/index.html?id=${produto.id}">
                        <h4>${produto.nome}</h4>
                    </a>
                    <p class="price">R$ ${produto.preco.toFixed(2).replace('.', ',')}</p>
                    <a class="btn-detalhes" href="../produto/index.html?id=${produto.id}">
                        <i class="fas fa-cart-shopping"></i>
                        <span>COMPRAR AGORA</span>
                    </a>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });

    initializeCatalogMediaCarousels(container);
}

// Funções de Filtro (Categorias e Cores)
function filtrar(criterio) {
    filtroAtual = criterio;
    paginaAtual = 1;
    atualizarCatalogo();
}

// Inicia o carregamento
carregarProdutos(); 

// Seleciona o campo de busca no cabeçalho
const campoBusca = document.querySelector('.search-bar input');

// Adiciona o evento de digitação (input)
if (campoBusca) {
    campoBusca.addEventListener('input', () => {
        termoBuscaAtual = campoBusca.value.toLowerCase();
        paginaAtual = 1;
        atualizarCatalogo();
    });
}

document.addEventListener('click', event => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
        return;
    }

    const pageButton = target.closest('.pagination-button');
    const cartButton = target.closest('.product-floating-cart');

    if (pageButton) {
        paginaAtual = Number(pageButton.getAttribute('data-page')) || 1;
        atualizarCatalogo();
        return;
    }

    if (cartButton) {
        const productId = Number(cartButton.getAttribute('data-product-id'));
        const produto = produtosDados.find(item => Number(item.id) === productId);

        if (!produto || !window.storefront) {
            return;
        }

        const added = window.storefront.addToCart(produto, { tamanho: 'M' });

        if (!added) {
            return;
        }

        cartButton.classList.add('is-added');
        cartButton.innerHTML = '<i class="fas fa-check"></i>';

        window.setTimeout(() => {
            cartButton.classList.remove('is-added');
            cartButton.innerHTML = '<i class="fas fa-cart-shopping"></i>';
        }, 1200);
        return;
    }
});

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

const filtrosToggle = document.getElementById('filtros-toggle');
const filtrosBody = document.getElementById('filtros-body');

if (filtrosToggle && filtrosBody) {
    filtrosToggle.addEventListener('click', () => {
        const isOpen = filtrosBody.classList.toggle('is-open');
        filtrosToggle.setAttribute('aria-expanded', String(isOpen));
    });

    if (window.matchMedia('(max-width: 768px)').matches) {
        filtrosBody.classList.remove('is-open');
        filtrosToggle.setAttribute('aria-expanded', 'false');
    } else {
        filtrosBody.classList.add('is-open');
    }
}