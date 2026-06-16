const params = new URLSearchParams(window.location.search);
const productId = Number(params.get('id'));
const CATALOG_DATA_URL = new URL('../catalogo/catalogo.json', window.location.href).href;

const stateElement = document.getElementById('product-state');
const layoutElement = document.getElementById('product-layout');
const detailsElement = document.getElementById('product-details');
const measuresElement = document.getElementById('product-measures');
const relatedSectionElement = document.getElementById('related-products-section');

const productGalleryMedia = document.getElementById('product-gallery-media');
const productGalleryThumbs = document.getElementById('product-gallery-thumbs');
const productEyebrow = document.getElementById('product-eyebrow');
const productName = document.getElementById('product-name');
const productSubtitle = document.getElementById('product-subtitle');
const productPrice = document.getElementById('product-price');
const productDescription = document.getElementById('product-description');
const productHighlight = document.getElementById('product-highlight');
const productComposition = document.getElementById('product-composition');
const productCareList = document.getElementById('product-care-list');
const sizeOptions = document.getElementById('size-options');
const selectedSizeLabel = document.getElementById('selected-size-label');
const shippingInput = document.getElementById('product-cep');
const shippingCheckButton = document.getElementById('shipping-check-button');
const shippingResult = document.getElementById('shipping-result');
const addCartButton = document.getElementById('add-cart-button');
const buyNowButton = document.getElementById('buy-now-button');
const productFeedback = document.getElementById('product-feedback');
const relatedProductsContainer = document.getElementById('related-products');

let currentProduct = null;
let allProducts = [];
let selectedSize = '';
let productRelatedStartIndex = 0;
let productMediaCarouselCleanups = [];

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
        <div class="${carouselClassName}" data-media-carousel data-interval="2500">
            <div class="media-carousel-frame">
                <div class="media-carousel-slides">${slides}</div>
                ${dots}
            </div>
        </div>
    `;
}

function buildProductGalleryMarkup(images, altText) {
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
        <div class="media-carousel product-detail-carousel" data-media-carousel data-interval="2500">
            <div class="media-carousel-frame">
                <div class="product-gallery-surface">
                    <div class="media-carousel-slides">${slides}</div>
                </div>
                ${dots}
            </div>
        </div>
    `;
}

function buildProductGalleryThumbsMarkup(images, altText) {
    if (images.length <= 1) {
        return '';
    }

    return images.map((source, index) => `
        <button type="button" class="product-gallery-thumb${index === 0 ? ' is-active' : ''}" data-slide-index="${index}" aria-label="Selecionar visual ${index + 1}">
            <img src="${source}" alt="${altText} miniatura ${index + 1}" loading="lazy">
        </button>
    `).join('');
}

function setupMediaCarousel(carousel) {
    const slides = Array.from(carousel.querySelectorAll('.media-carousel-slide'));
    const dots = Array.from(carousel.querySelectorAll('.media-carousel-dot'));
    const thumbs = carousel.classList.contains('product-detail-carousel')
        ? Array.from(document.querySelectorAll('.product-gallery-thumb'))
        : Array.from(carousel.querySelectorAll('.product-gallery-thumb'));

    if (slides.length <= 1) {
        return () => {};
    }

    let activeIndex = 0;
    let intervalId = null;
    const intervalMs = Number(carousel.getAttribute('data-interval')) || 2500;

    const showSlide = nextIndex => {
        activeIndex = nextIndex;
        slides.forEach((slide, index) => {
            slide.classList.toggle('is-active', index === activeIndex);
        });
        dots.forEach((dot, index) => {
            dot.classList.toggle('is-active', index === activeIndex);
            dot.setAttribute('aria-pressed', String(index === activeIndex));
        });
        thumbs.forEach((thumb, index) => {
            thumb.classList.toggle('is-active', index === activeIndex);
            thumb.setAttribute('aria-pressed', String(index === activeIndex));
        });
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

    thumbs.forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
            showSlide(index);
            startAutoplay();
        });
    });

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);

    showSlide(0);
    startAutoplay();

    return () => {
        stopAutoplay();
    };
}

function initializeProductMediaCarousels() {
    productMediaCarouselCleanups.forEach(cleanup => cleanup());
    productMediaCarouselCleanups = Array.from(document.querySelectorAll('[data-media-carousel]')).map(setupMediaCarousel);
}

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    if (!sidebar || !overlay) {
        return;
    }

    if (sidebar.style.width === '250px') {
        sidebar.style.width = '0';
        overlay.style.display = 'none';
    } else {
        sidebar.style.width = '250px';
        overlay.style.display = 'block';
    }
}

window.toggleMenu = toggleMenu;

function formatPrice(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCep(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);

    if (digits.length <= 5) {
        return digits;
    }

    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function setState(message, isError = false) {
    stateElement.hidden = false;
    stateElement.textContent = message;
    stateElement.style.color = isError ? '#7d1d1d' : '#5e5851';
}

function requireSize() {
    if (selectedSize) {
        return true;
    }

    productFeedback.textContent = 'Selecione um tamanho antes de continuar.';
    return false;
}

function renderSizes(product) {
    const sizes = Array.isArray(product.tamanhos) && product.tamanhos.length ? product.tamanhos : ['P', 'M', 'G', 'GG'];

    sizeOptions.innerHTML = sizes.map(size => `
        <button type="button" class="size-option${size === selectedSize ? ' is-selected' : ''}" data-size="${size}">${size}</button>
    `).join('');

    selectedSizeLabel.textContent = selectedSize ? `Tamanho selecionado: ${selectedSize}` : 'Selecione um tamanho';
}

function renderRelated(product) {
    const related = allProducts
        .filter(item => item.id !== product.id)
        .sort((left, right) => {
            const sameCategoryScore = Number(right.categoria === product.categoria) - Number(left.categoria === product.categoria);

            if (sameCategoryScore !== 0) {
                return sameCategoryScore;
            }

            return Number(right.cor === product.cor) - Number(left.cor === product.cor);
        });

    const orderedRelated = related.map((_, index) => {
        const nextIndex = (productRelatedStartIndex + index) % related.length;
        return related[nextIndex];
    });

    relatedProductsContainer.innerHTML = orderedRelated.map(item => `
        <a class="related-card" href="./index.html?id=${item.id}">
            <div class="related-card-media">
                ${buildMediaCarouselMarkup(resolveProductImages(item), item.nome, 'related-product-carousel')}
            </div>
            <p>${item.subtitulo || (item.categoria === 'oversized' ? 'Oversized Aranha' : 'Camiseta Aranha')}</p>
            <strong>${item.nome}</strong>
            <span>${formatPrice(item.preco)}</span>
        </a>
    `).join('');

    relatedSectionElement.hidden = related.length === 0;
    initializeProductMediaCarousels();
}

function renderProduct(product) {
    document.title = `${product.nome} | Aranha`;
    currentProduct = product;
    selectedSize = product.tamanhos?.includes('M') ? 'M' : (product.tamanhos?.[0] || '');
    productRelatedStartIndex = 0;

    stateElement.hidden = true;
    layoutElement.hidden = false;
    detailsElement.hidden = false;
    measuresElement.hidden = false;

    const productImages = resolveProductImages(product);

    productGalleryMedia.innerHTML = buildProductGalleryMarkup(productImages, product.nome);
    productGalleryThumbs.innerHTML = buildProductGalleryThumbsMarkup(productImages, product.nome);
    productEyebrow.textContent = `${product.categoria === 'oversized' ? 'Oversized' : 'Camiseta'} | ${product.cor === 'escura' ? 'Peça escura' : 'Peça clara'}`;
    productName.textContent = product.nome;
    productSubtitle.textContent = product.subtitulo || '';
    productPrice.textContent = formatPrice(Number(product.preco || 0));
    productDescription.textContent = product.descricao || '';
    productHighlight.textContent = product.destaque || '';
    productComposition.textContent = product.composicao || '';
    productFeedback.textContent = '';

    productCareList.innerHTML = (product.cuidados || []).map(item => `<li>${item}</li>`).join('');

    renderSizes(product);
    renderRelated(product);
    initializeProductMediaCarousels();
}

function addCurrentProductToCart(redirectToCart) {
    if (!currentProduct || !window.storefront) {
        return;
    }

    if (!requireSize()) {
        return;
    }

    const added = window.storefront.addToCart(currentProduct, { tamanho: selectedSize });

    if (!added) {
        return;
    }

    productFeedback.textContent = `Produto adicionado com tamanho ${selectedSize}.`;

    if (redirectToCart) {
        window.location.href = '../carrinho/index.html';
    }
}

async function loadProduct() {
    if (!productId) {
        setState('Produto não encontrado. Volte ao catálogo e selecione uma peça válida.', true);
        return;
    }

    try {
        const response = await fetch(CATALOG_DATA_URL);
        allProducts = await response.json();
        const product = allProducts.find(item => Number(item.id) === productId);

        if (!product) {
            setState('Produto não encontrado. Volte ao catálogo e selecione outra peça.', true);
            return;
        }

        renderProduct(product);
    } catch (error) {
        console.error('Erro ao carregar produto:', error);
        setState('Não foi possível carregar o produto agora.', true);
    }
}

sizeOptions.addEventListener('click', event => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
        return;
    }

    const button = target.closest('.size-option');

    if (!button) {
        return;
    }

    selectedSize = button.getAttribute('data-size') || '';
    renderSizes(currentProduct);
    productFeedback.textContent = '';
});

if (shippingInput) {
    shippingInput.addEventListener('input', () => {
        shippingInput.value = formatCep(shippingInput.value);
    });
}

if (shippingCheckButton) {
    shippingCheckButton.addEventListener('click', () => {
        const cep = formatCep(shippingInput.value);
        shippingInput.value = cep;

        if (cep.length !== 9) {
            shippingResult.textContent = 'Digite um CEP válido com 8 números.';
            return;
        }

        shippingResult.textContent = `Prévia para ${cep}: entrega estimada entre 3 e 7 dias úteis.`;
    });
}

if (addCartButton) {
    addCartButton.addEventListener('click', () => addCurrentProductToCart(false));
}

if (buyNowButton) {
    buyNowButton.addEventListener('click', () => addCurrentProductToCart(true));
}

const productFeedbackNextButton = document.getElementById('product-feedback-next');

if (productFeedbackNextButton) {
    productFeedbackNextButton.addEventListener('click', () => {
        if (!currentProduct) {
            return;
        }

        const related = allProducts.filter(item => item.id !== currentProduct.id);

        if (!related.length) {
            return;
        }

        productRelatedStartIndex = (productRelatedStartIndex + 1) % related.length;
        renderRelated(currentProduct);
    });
}

loadProduct();