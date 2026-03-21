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
