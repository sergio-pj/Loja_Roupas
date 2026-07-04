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
