let produtosDados = [];
let filtroAtual = 'todos';
let termoBuscaAtual = '';
let paginaAtual = 1;
const itensPorPagina = 6;
const CATALOG_DATA_URL = new URL('catalogo.json', window.location.href).href;
let catalogMediaCarouselCleanups = [];
let catalogMediaCarouselSyncIntervalId = null;
let catalogMediaCarouselSyncIndex = 0;
const catalogMediaCarouselPauseSet = new Set();

function initComingSoonNotice() {
    const modal = document.getElementById('coming-soon-modal');
    const closeButton = modal?.querySelector('.coming-soon-close');
    const sidebar = document.getElementById('sidebar');

    if (!modal || !closeButton) return;

    const closeModal = () => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('no-scroll');
    };

    const openModal = () => {
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('no-scroll');
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
            if (['moletom', 'moletons', 'polo', 'shorts e bermudas', 'kits'].includes(label)) {
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

function resolveProductImages(produto) {
    const sources = Array.isArray(produto.galeria) && produto.galeria.length ? produto.galeria : [produto.imagem];

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
            catalogMediaCarouselSyncIndex = index;
            synchronizeCatalogMediaCarousels();
            restartCatalogMediaCarouselSync();
        });
    });

    const pause = () => {
        catalogMediaCarouselPauseSet.add(carousel);
        stopCatalogMediaCarouselSync();
    };

    const resume = () => {
        catalogMediaCarouselPauseSet.delete(carousel);

        if (catalogMediaCarouselPauseSet.size === 0) {
            startCatalogMediaCarouselSync();
        }
    };

    carousel.addEventListener('mouseenter', pause);
    carousel.addEventListener('mouseleave', resume);
    carousel.addEventListener('focusin', pause);
    carousel.addEventListener('focusout', resume);

    showSlide(catalogMediaCarouselSyncIndex);

    return () => {
        catalogMediaCarouselPauseSet.delete(carousel);
        carousel.removeEventListener('mouseenter', pause);
        carousel.removeEventListener('mouseleave', resume);
        carousel.removeEventListener('focusin', pause);
        carousel.removeEventListener('focusout', resume);
    };
}

function stopCatalogMediaCarouselSync() {
    if (catalogMediaCarouselSyncIntervalId) {
        window.clearInterval(catalogMediaCarouselSyncIntervalId);
        catalogMediaCarouselSyncIntervalId = null;
    }
}

function synchronizeCatalogMediaCarousels() {
    Array.from(document.querySelectorAll('[data-media-carousel]')).forEach(carousel => {
        const slides = Array.from(carousel.querySelectorAll('.media-carousel-slide'));
        const dots = Array.from(carousel.querySelectorAll('.media-carousel-dot'));

        if (slides.length <= 1) {
            return;
        }

        const normalizedIndex = catalogMediaCarouselSyncIndex % slides.length;

        slides.forEach((slide, index) => {
            slide.classList.toggle('is-active', index === normalizedIndex);
        });

        dots.forEach((dot, index) => {
            dot.classList.toggle('is-active', index === normalizedIndex);
            dot.setAttribute('aria-pressed', String(index === normalizedIndex));
        });
    });
}

function startCatalogMediaCarouselSync() {
    if (catalogMediaCarouselSyncIntervalId || catalogMediaCarouselPauseSet.size > 0) {
        return;
    }

    catalogMediaCarouselSyncIntervalId = window.setInterval(() => {
        catalogMediaCarouselSyncIndex += 1;
        synchronizeCatalogMediaCarousels();
    }, 2400);
}

function restartCatalogMediaCarouselSync() {
    stopCatalogMediaCarouselSync();

    if (catalogMediaCarouselPauseSet.size === 0) {
        startCatalogMediaCarouselSync();
    }
}

function initializeCatalogMediaCarousels(root) {
    catalogMediaCarouselCleanups.forEach(cleanup => cleanup());
    stopCatalogMediaCarouselSync();
    catalogMediaCarouselPauseSet.clear();

    catalogMediaCarouselCleanups = Array.from(root.querySelectorAll('[data-media-carousel]'))
        .map(createMediaCarouselController)
        .filter(Boolean);

    catalogMediaCarouselSyncIndex = 0;
    synchronizeCatalogMediaCarousels();
    startCatalogMediaCarouselSync();
}

function getProdutosFiltrados() {
    return produtosDados.filter(produto => {
        if (!produto || typeof produto !== 'object') return false;

        const nome = String(produto.nome || '').toLowerCase();
        const categoria = String(produto.categoria || '').toLowerCase();
        const cor = String(produto.cor || '').toLowerCase();

        const passaBusca = !termoBuscaAtual || nome.includes(termoBuscaAtual) || categoria.includes(termoBuscaAtual) || cor.includes(termoBuscaAtual);
        const passaFiltro = filtroAtual === 'todos' || categoria === String(filtroAtual).toLowerCase() || cor === String(filtroAtual).toLowerCase();

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
    // tenta buscar do Supabase se disponível, senão usa o JSON estático
    try {
        // busca tanto do Supabase quanto do catálogo estático e mescla (supabase tem prioridade)
        let staticData = [];
        try {
            const resp = await fetch(CATALOG_DATA_URL);
            staticData = await resp.json();
        } catch (e) {
            console.warn('não foi possível carregar catalogo.json', e);
        }

        let dbData = [];
        if (window.supabase) {
            const { data, error } = await window.supabase.from('produtos').select('*').order('id', { ascending: false });
            if (!error && Array.isArray(data)) dbData = data.map(p => ({ ...p, galeria: p.galeria || [], imagem: p.imagem || '' }));
        }

        // mesclar: manter todos do DB e adicionar do static os que não existem por id
        const merged = dbData.slice();
        const dbIds = new Set(dbData.map(d => Number(d.id)));
        staticData.forEach(s => {
            const sid = Number(s.id);
            if (!dbIds.has(sid)) merged.push({ ...s, galeria: s.galeria || [], imagem: s.imagem || s.imagem_url || '' });
        });

        produtosDados = merged;
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
                <button type="button" class="product-floating-cart" data-product-id="${produto.id}" aria-label="Escolher tamanho de ${produto.nome}" title="Escolher tamanho antes de adicionar">
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
        if (!productId) {
            return;
        }

        window.location.href = `../produto/index.html?id=${productId}`;
        return;
    }
});

function toggleMenu() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    
    if (!sidebar || !overlay) {
        return;
    }

    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
        sidebar.classList.remove('open');
        overlay.style.display = "none";
        document.body.classList.remove('no-scroll');
        document.documentElement.classList.remove('no-scroll');
    } else {
        sidebar.classList.add('open');
        overlay.style.display = "block";
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

// botão de recarregar catálogo (útil em desenvolvimento)
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('reload-catalog');
    if (btn) {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.textContent = 'Recarregando...';
            await carregarProdutos();
            btn.disabled = false;
            btn.textContent = 'Recarregar catálogo';
        });
    }
});