function toggleMenu() {
	const sidebar = document.getElementById('sidebar');
	const overlay = document.getElementById('overlay');

	if (!sidebar || !overlay) {
		return;
	}

	const isOpen = sidebar.classList.contains('open');
	if (isOpen) {
		sidebar.classList.remove('open');
		overlay.style.display = 'none';
		document.body.classList.remove('no-scroll');
		document.documentElement.classList.remove('no-scroll');
	} else {
		sidebar.classList.add('open');
		overlay.style.display = 'block';
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

const contactForm = document.getElementById('contact-form');
const feedback = document.getElementById('form-feedback');
const phoneInput = contactForm ? contactForm.querySelector('input[name="telefone"]') : null;

function applyPresetContactData() {
	if (!contactForm) {
		return;
	}

	const params = new URLSearchParams(window.location.search);
	const assunto = String(params.get('assunto') || '').trim();
	const mensagem = String(params.get('mensagem') || '').trim();

	if (assunto) {
		contactForm.elements.assunto.value = assunto;
	}

	if (mensagem) {
		contactForm.elements.mensagem.value = mensagem;
	}
}

function formatPhone(value) {
	const digits = value.replace(/\D/g, '').slice(0, 11);

	if (digits.length <= 2) {
		return digits ? `(${digits}` : '';
	}

	if (digits.length <= 7) {
		return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
	}

	if (digits.length <= 10) {
		return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
	}

	return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

if (phoneInput) {
	phoneInput.addEventListener('input', () => {
		phoneInput.value = formatPhone(phoneInput.value);
	});
}

if (contactForm) {
	applyPresetContactData();

	contactForm.addEventListener('submit', event => {
		event.preventDefault();

		const formData = new FormData(contactForm);
		const nome = String(formData.get('nome') || '').trim();
		const email = String(formData.get('email') || '').trim();
		const telefone = String(formData.get('telefone') || '').trim();
		const assunto = String(formData.get('assunto') || '').trim();
		const mensagem = String(formData.get('mensagem') || '').trim();

		const body = [
			`Nome: ${nome}`,
			`E-mail: ${email}`,
			`Celular: ${telefone || 'Nao informado'}`,
			'',
			'Mensagem:',
			mensagem
		].join('\n');

		const mailto = `mailto:mateusyuriaranha@gmail.com?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(body)}`;
		window.location.href = mailto;

		if (feedback) {
			feedback.textContent = 'Seu aplicativo de e-mail foi acionado com a mensagem preenchida.';
		}
	});
}
