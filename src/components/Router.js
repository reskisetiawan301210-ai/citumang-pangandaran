/**
 * Router.js
 * Client-Side Router (PJAX) untuk Navigasi Cepat Tanpa Full Reload
 * Mempertahankan <header> dan <footer> agar tidak di-remount,
 * Mengganti konten <main>, mengupdate metadata SEO (<title>, meta, canonical, JSON-LD),
 * Mengelola status aktif menu, scroll position, dan menginisialisasi ulang komponen.
 */

import { initGallery } from './GalleryModal.js';
import { initAccordion } from './Accordion.js';
import { initScrollReveal } from './ScrollReveal.js';
import { initReservationModal } from './ReservationModal.js';
import { syncPublicSiteData } from '../services/siteDataService.js';
import { closeMobileMenu, updateActiveNav } from './Navigation.js';

// Cache dokumen HTML di memori agar perpindahan halaman instan (0ms latency)
const pageCache = new Map();

// Progress bar element untuk indikasi transisi yang elegan
let progressBarEl = null;

function getProgressBar() {
  if (!progressBarEl) {
    progressBarEl = document.createElement('div');
    progressBarEl.id = 'spa-progress-bar';
    progressBarEl.className = 'fixed top-0 left-0 h-[2.5px] bg-secondary z-[9999] transition-all duration-300 pointer-events-none opacity-0';
    progressBarEl.style.width = '0%';
    document.body.appendChild(progressBarEl);
  }
  return progressBarEl;
}

function startProgress() {
  const bar = getProgressBar();
  bar.style.transition = 'width 250ms ease-out, opacity 100ms ease';
  bar.style.opacity = '1';
  bar.style.width = '45%';
}

function completeProgress() {
  const bar = getProgressBar();
  bar.style.transition = 'width 150ms ease-out, opacity 250ms ease';
  bar.style.width = '100%';
  setTimeout(() => {
    bar.style.opacity = '0';
    setTimeout(() => {
      bar.style.width = '0%';
    }, 250);
  }, 150);
}

/**
 * Update metadata dokumen (<title>, description, canonical, OG, JSON-LD)
 */
function updateDocumentMeta(newDoc, targetUrl) {
  // 1. Update Title
  const newTitle = newDoc.querySelector('title')?.textContent;
  if (newTitle) {
    document.title = newTitle;
  }

  // 2. Update Meta Description
  const newDesc = newDoc.querySelector('meta[name="description"]')?.getAttribute('content');
  let currentDesc = document.querySelector('meta[name="description"]');
  if (newDesc) {
    if (!currentDesc) {
      currentDesc = document.createElement('meta');
      currentDesc.name = 'description';
      document.head.appendChild(currentDesc);
    }
    currentDesc.setAttribute('content', newDesc);
  }

  // 3. Update Canonical
  const newCanonical = newDoc.querySelector('link[rel="canonical"]')?.getAttribute('href');
  let currentCanonical = document.querySelector('link[rel="canonical"]');
  if (newCanonical) {
    if (!currentCanonical) {
      currentCanonical = document.createElement('link');
      currentCanonical.rel = 'canonical';
      document.head.appendChild(currentCanonical);
    }
    currentCanonical.setAttribute('href', newCanonical);
  }

  // 4. Update Open Graph Meta
  const ogTags = ['og:title', 'og:description', 'og:url', 'og:image'];
  ogTags.forEach(prop => {
    const newVal = newDoc.querySelector(`meta[property="${prop}"]`)?.getAttribute('content');
    if (newVal) {
      let cur = document.querySelector(`meta[property="${prop}"]`);
      if (!cur) {
        cur = document.createElement('meta');
        cur.setAttribute('property', prop);
        document.head.appendChild(cur);
      }
      cur.setAttribute('content', newVal);
    }
  });

  // 5. Update Schema.org JSON-LD scripts
  document.querySelectorAll('script[type="application/ld+json"]').forEach(s => s.remove());
  newDoc.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
    const clone = document.createElement('script');
    clone.type = 'application/ld+json';
    clone.textContent = s.textContent;
    document.head.appendChild(clone);
  });
}

/**
 * Eksekusi navigasi client-side ke URL tujuan
 */
export async function navigateTo(targetUrl, pushState = true) {
  const currentPath = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
  
  // Parse target URL
  const parsed = new URL(targetUrl, window.location.origin);
  const targetPath = parsed.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
  const targetHash = parsed.hash;

  // Tutup mobile drawer jika terbuka
  closeMobileMenu();

  // Jika tujuan adalah halaman yang sama dan hanya hash
  if (targetPath === currentPath) {
    if (targetHash) {
      scrollToHash(targetHash);
      if (pushState) history.pushState({ path: targetUrl }, '', targetUrl);
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      if (pushState && parsed.search !== window.location.search) {
        history.pushState({ path: targetUrl }, '', targetUrl);
      }
    }
    updateActiveNav(currentPath);
    return;
  }

  startProgress();

  try {
    let html = pageCache.get(targetPath);
    if (!html) {
      // Fetch dokumen tujuan
      const fetchUrl = targetPath === '/' ? '/index.html' : `${targetPath}/index.html`;
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        // Fallback coba fetch URL langsung jika index.html gagal
        const fallbackRes = await fetch(parsed.pathname);
        if (!fallbackRes.ok) throw new Error(`HTTP ${fallbackRes.status}`);
        html = await fallbackRes.text();
      } else {
        html = await res.text();
      }
      pageCache.set(targetPath, html);
    }

    const parser = new DOMParser();
    const newDoc = parser.parseFromString(html, 'text/html');

    const newMain = newDoc.querySelector('main');
    const currentMain = document.querySelector('main');

    if (!newMain || !currentMain) {
      // Fallback reload konvensional jika format DOM tidak cocok
      window.location.href = targetUrl;
      return;
    }

    // 1. Ganti konten <main> dengan transisi halus
    currentMain.replaceWith(newMain);

    // 2. Update metadata SEO (<title>, meta description, canonical, JSON-LD)
    updateDocumentMeta(newDoc, targetUrl);

    // 3. Update Browser History
    if (pushState) {
      history.pushState({ path: targetUrl }, document.title, targetUrl);
    }

    // 4. Update status aktif menu navigasi
    updateActiveNav(targetPath);

    // 5. Scroll behavior
    if (targetHash) {
      setTimeout(() => scrollToHash(targetHash), 50);
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }

    // 6. Inisialisasi ulang komponen interaktif pada konten baru
    initGallery();
    initAccordion();
    initScrollReveal();
    initReservationModal();
    syncPublicSiteData();

    completeProgress();
  } catch (err) {
    console.warn('[Router] Gagal navigasi client-side, fallback ke navigasi native:', err);
    completeProgress();
    window.location.href = targetUrl;
  }
}

/**
 * Scroll ke elemen anchor dengan kompensasi tinggi sticky navbar (80px)
 */
function scrollToHash(hash) {
  if (!hash || hash === '#') return;
  const target = document.querySelector(hash);
  if (target) {
    const navbarHeight = 84;
    const elementPos = target.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({
      top: elementPos - navbarHeight,
      behavior: 'smooth'
    });
  }
}

/**
 * Inisialisasi router: intercept link clicks dan popstate
 */
export function initRouter() {
  // 1. Delegasi klik pada semua link <a> internal
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // Abaikan link eksternal, tel, mailto, wa, target _blank, atau download
    if (
      anchor.target === '_blank' ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:') ||
      href.includes('wa.me') ||
      anchor.hasAttribute('download')
    ) {
      return;
    }

    // Link eksternal domain
    if (anchor.origin && anchor.origin !== window.location.origin) {
      return;
    }

    // Jangan intercept admin panel (biarkan navigasi mandiri admin)
    if (href.startsWith('/admin')) {
      return;
    }

    // Hash link lokal di halaman yang sama (misal: href="#fasilitas" atau href="#reservasi-modal")
    if (href.startsWith('#')) {
      if (href === '#reservasi-modal' || anchor.dataset.action === 'reservation') {
        // Ditangani oleh ReservationModal
        return;
      }
      e.preventDefault();
      closeMobileMenu();
      scrollToHash(href);
      return;
    }

    // Internal navigation route (misal: '/', '/harga', '/lokasi', '/galeri', '/faq', dll)
    e.preventDefault();
    navigateTo(href, true);
  });

  // 2. Tangani tombol Back / Forward pada browser
  window.addEventListener('popstate', (e) => {
    navigateTo(window.location.pathname + window.location.search + window.location.hash, false);
  });

  // 3. Cache halaman saat ini agar saat kembali langsung instan
  const initialPath = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
  const initialMain = document.querySelector('main');
  if (initialMain) {
    pageCache.set(initialPath, document.documentElement.outerHTML);
  }
}

