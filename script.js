// === MENÚ HAMBURGUESA ===
const hamburger = document.getElementById('hamburgerBtn');
const navMenu = document.getElementById('navMenu');

function toggleMenu() {
    const expanded = navMenu.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', expanded);
}

if (hamburger) {
    hamburger.addEventListener('click', toggleMenu);
}

const navLinks = document.querySelectorAll('.nav-menu a');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (navMenu && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    });
});

// ELIMINADO: el código del formulario de contacto (contactForm) ya no es necesario.
// Los botones de correo y WhatsApp ahora son enlaces directos en el HTML.

// Ajuste del menú al redimensionar
window.addEventListener('resize', function() {
    if (window.innerWidth > 768 && navMenu) {
        navMenu.classList.remove('active');
        if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    }
});

