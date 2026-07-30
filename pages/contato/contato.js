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

// Inicializar funções do shared.js
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initComingSoonNotice);
} else {
    window.initComingSoonNotice();
}