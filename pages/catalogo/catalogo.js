let produtosDados = [];

// Busca os dados do JSON
async function carregarProdutos() {
    try {
        const response = await fetch('catalogo.json');
        produtosDados = await response.json();
        exibirProdutos(produtosDados);
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
                    <button class="btn-detalhes" onclick="adicionarAoCarrinho(${produto.id})">
                        Comprar
                    </button>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
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

function toggleMenu() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar.style.width === "250px") {
        sidebar.style.width = "0";
    } else {
        sidebar.style.width = "250px";
    }
}

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