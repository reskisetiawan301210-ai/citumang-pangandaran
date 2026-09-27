/**
 * Navigation.js
 * Mengontrol sticky navbar, mobile menu hamburger, smooth scrolling, dan scroll spy
 */

export function initNavigation() {
  const header = document.querySelector('header');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileMenuIcon = document.getElementById('mobile-menu-icon');
  const navLinks = document.querySelectorAll('header nav a, #mobile-menu a');

  // Sticky navbar shadow saat scrolling
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header?.classList.add('shadow-[0_4px_20px_rgba(11,59,44,0.08)]', 'bg-surface/95');
      header?.classList.remove('bg-surface/85');
    } else {
      header?.classList.remove('shadow-[0_4px_20px_rgba(11,59,44,0.08)]', 'bg-surface/95');
      header?.classList.add('bg-surface/85');
    }

    updateActiveNav();
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

  function openMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('hidden');
    if (mobileMenuIcon) mobileMenuIcon.textContent = 'close';
    mobileMenuToggle?.setAttribute('aria-expanded', 'true');
  }

  function closeMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.add('hidden');
    if (mobileMenuIcon) mobileMenuIcon.textContent = 'menu';
    mobileMenuToggle?.setAttribute('aria-expanded', 'false');
  }

  // Klik link navigasi: smooth scroll & tutup menu mobile jika terbuka
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          closeMobileMenu();
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // ScrollSpy untuk link navigasi aktif
  const sections = Array.from(document.querySelectorAll('section[id], div[id]')).filter(el => el.id);

  function updateActiveNav() {
    const scrollPos = window.scrollY + 120;
    let currentId = 'beranda';

    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];
      if (section.offsetTop <= scrollPos) {
        currentId = section.id;
        break;
      }
    }

    document.querySelectorAll('header nav a[data-path]').forEach(link => {
      const path = link.getAttribute('data-path');
      if (path === currentId) {
        link.className = 'px-space-sm py-space-xs font-label-md uppercase tracking-wider transition-all duration-200 bg-primary-container text-on-primary-container rounded-lg font-semibold';
      } else {
        link.className = 'px-space-sm py-space-xs font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all duration-200';
      }
    });
  }

  // Tutup menu saat resize ke desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1280) {
      closeMobileMenu();
    }
  });
}
