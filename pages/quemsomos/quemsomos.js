// Inicializar funções do shared.js
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initComingSoonNotice);
} else {
    window.initComingSoonNotice();
}