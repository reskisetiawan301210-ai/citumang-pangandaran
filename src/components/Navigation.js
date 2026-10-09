/**
 * Navigation.js
 * Mengontrol sticky navbar, mobile drawer hamburger, dan status aktif navigasi multi-halaman
 */

let mobileMenuToggle = null;
let mobileMenu = null;
let mobileMenuIcon = null;

export function openMobileMenu() {
  if (!mobileMenu) return;
  mobileMenu.classList.remove('hidden');
  if (mobileMenuIcon) mobileMenuIcon.textContent = 'close';
  mobileMenuToggle?.setAttribute('aria-expanded', 'true');
}

export function closeMobileMenu() {
  if (!mobileMenu) return;
  mobileMenu.classList.add('hidden');
  if (mobileMenuIcon) mobileMenuIcon.textContent = 'menu';
  mobileMenuToggle?.setAttribute('aria-expanded', 'false');
}

/**
 * Update status menu aktif secara presisi (Hanya 1 item aktif, Beranda hanya aktif di '/')
 */
export function updateActiveNav(targetPathname) {
  const currentPath = (targetPathname || window.location.pathname)
    .replace(/\/index\.html$/, '')
    .replace(/\/$/, '') || '/';

  const allNavLinks = document.querySelectorAll('header nav a, #mobile-menu a');

  allNavLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http')) return;

    const linkPath = href.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
    const isActive = linkPath === currentPath;

    if (isActive) {
      link.setAttribute('aria-current', 'page');
      if (link.closest('header nav')) {
        link.className = 'px-space-sm py-space-xs font-label-md uppercase tracking-wider transition-all duration-200 bg-primary-container text-on-primary-container rounded-lg font-semibold';
      }
      if (link.closest('#mobile-menu')) {
        link.className = 'block px-4 py-2.5 rounded-lg font-label-md uppercase tracking-wider text-sm text-primary font-semibold bg-surface-container-low';
      }
    } else {
      link.removeAttribute('aria-current');
      if (link.closest('header nav')) {
        link.className = 'px-space-sm py-space-xs font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all duration-200';
      }
      if (link.closest('#mobile-menu')) {
        link.className = 'block px-4 py-2.5 rounded-lg font-label-md uppercase tracking-wider text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface';
      }
    }
  });
}

export function initNavigation() {
  const header = document.querySelector('header');
  mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  mobileMenu = document.getElementById('mobile-menu');
  mobileMenuIcon = document.getElementById('mobile-menu-icon');

  // Sticky navbar shadow saat scrolling
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header?.classList.add('shadow-[0_4px_20px_rgba(11,59,44,0.08)]', 'bg-surface/95');
      header?.classList.remove('bg-surface/85');
    } else {
      header?.classList.remove('shadow-[0_4px_20px_rgba(11,59,44,0.08)]', 'bg-surface/95');
      header?.classList.add('bg-surface/85');
    }
  }, { passive: true });

  // Toggle mobile hamburger menu
  if (mobileMenuToggle && mobileMenu) {
    mobileMenuToggle.addEventListener('click', () => {
      const isOpen = !mobileMenu.classList.contains('hidden');
      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });
  }

  // Set initial active state berdasarkan URL saat ini
  updateActiveNav();
}
