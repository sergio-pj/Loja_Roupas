let produtosDados = [];

function aplicarFiltroInicial() {
    const params = new URLSearchParams(window.location.search);
    const filtro = params.get('filtro');

    if (filtro) {
        filtrar(filtro);
    }
}

// Busca os dados do JSON
async function carregarProdutos() {
    try {
        const response = await fetch('catalogo.json');
        produtosDados = await response.json();
        exibirProdutos(produtosDados);
        aplicarFiltroInicial();
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
                <div class="product-image">
                    <img src="${produto.imagem}" alt="${produto.nome}">
                </div>
                <div class="product-info">
                    <h4>${produto.nome}</h4>
                    <p class="price">R$ ${produto.preco.toFixed(2).replace('.', ',')}</p>
                    <button class="btn-detalhes btn-add-cart" data-id="${produto.id}">
                        Adicionar ao carrinho
                    </button>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

function adicionarAoCarrinho(id) {
    const produto = produtosDados.find(item => Number(item.id) === Number(id));

    if (!produto || !window.storefront) {
        return;
    }

    const added = window.storefront.addToCart(produto);

    if (!added) {
        return;
    }

    const button = document.querySelector(`.btn-add-cart[data-id="${id}"]`);

    if (button) {
        const previousText = button.textContent;
        button.textContent = 'Adicionado';
        button.disabled = true;

        window.setTimeout(() => {
            button.textContent = previousText;
            button.disabled = false;
        }, 1200);
    }
}

// Funções de Filtro (Categorias e Cores)
function filtrar(criterio) {
    if (criterio === 'todos') {
        exibirProdutos(produtosDados);
    } else {
        const filtrados = produtosDados.filter(p => 
            p.categoria === criterio || p.cor === criterio
        );
        exibirProdutos(filtrados);
    }
}

// Inicia o carregamento
carregarProdutos(); 

// Seleciona o campo de busca no cabeçalho
const campoBusca = document.querySelector('.search-bar input');

// Adiciona o evento de digitação (input)
if (campoBusca) {
    campoBusca.addEventListener('input', () => {
        const termoBusca = campoBusca.value.toLowerCase(); // Texto digitado em minúsculo

        // Filtra o array original de produtos
        const produtosFiltrados = produtosDados.filter(produto => {
            const nomeParaFiltrar = produto.nome.toLowerCase();
            const categoriaParaFiltrar = produto.categoria.toLowerCase();
        
            // Retorna verdadeiro se o termo estiver no nome ou na categoria
            return nomeParaFiltrar.includes(termoBusca) || categoriaParaFiltrar.includes(termoBusca);
        });

        // Renderiza apenas os produtos encontrados
        exibirProdutos(produtosFiltrados);
    });
}

document.addEventListener('click', event => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
        return;
    }

    const button = target.closest('.btn-add-cart');

    if (!button) {
        return;
    }

    adicionarAoCarrinho(button.getAttribute('data-id'));
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