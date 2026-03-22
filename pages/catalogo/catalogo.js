let produtosDados = [];
let filtroAtual = 'todos';
let termoBuscaAtual = '';
let paginaAtual = 1;
const itensPorPagina = 6;

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
        const response = await fetch('catalogo.json');
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
                    <img src="${produto.imagem}" alt="${produto.nome}">
                    <div class="product-image-badges">
                        <img src="../../assets/AranhaPrinc_Logo.png" alt="Logo Aranha" class="product-logo-badge">
                        <span class="product-cart-badge"><i class="fas fa-cart-shopping"></i></span>
                    </div>
                </a>
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

    if (pageButton) {
        paginaAtual = Number(pageButton.getAttribute('data-page')) || 1;
        atualizarCatalogo();
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