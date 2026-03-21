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

function filtrar(criterio) {
    const params = new URLSearchParams();

    if (criterio && criterio !== 'todos') {
        params.set('filtro', criterio);
    }

    const destino = `pages/catalogo/index.html${params.toString() ? `?${params.toString()}` : ''}`;
    window.location.href = destino;
}

async function carregarProdutos() {
    const container = document.getElementById('lista-produtos');

    if (!container) {
        return;
    }

    const response = await fetch('produtos.json');
    const produtos = await response.json();

    container.innerHTML = produtos.map(prod => `
        <div class="product-card">
            <img src="${prod.imagem}" alt="${prod.nome}">
            <h4>${prod.nome}</h4>
            <p>R$ ${prod.preco.toFixed(2)}</p>
            <button onclick="adicionarAoCarrinho(${prod.id})">Adicionar</button>
        </div>
    `).join('');
}

carregarProdutos();