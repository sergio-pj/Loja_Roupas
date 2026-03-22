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

    const response = await fetch('pages/catalogo/catalogo.json');
    const produtos = await response.json();
    const destaques = produtos.slice(0, 3);

    container.innerHTML = destaques.map(prod => `
        <article class="product-card">
            <a class="product-card-link" href="pages/produto/index.html?id=${prod.id}">
                <img src="${prod.imagem}" alt="${prod.nome}">
                <h3>${prod.nome}</h3>
                <p class="price">R$ ${prod.preco.toFixed(2).replace('.', ',')}</p>
            </a>
        </article>
    `).join('');
}

carregarProdutos();
setupHomeCarousel();