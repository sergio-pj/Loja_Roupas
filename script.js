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

async function carregarProdutos() {
    const response = await fetch('produtos.json');
    const produtos = await response.json();
    const container = document.getElementById('lista-produtos');

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