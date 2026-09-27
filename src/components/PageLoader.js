/**
 * PageLoader.js
 * Animasi opening website Citumang Pangandaran
 * Durasi: ~1.2 detik, smooth, natural, elegan, cinematic
 * Menghormati prefers-reduced-motion untuk aksesibilitas.
 */

import { siteConfig } from '../config/siteConfig.js';

export function initPageLoader() {
  const loaderEl = document.getElementById('page-loader');
  if (!loaderEl) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    loaderEl.style.display = 'none';
    document.body.classList.remove('overflow-hidden');
    return;
  }

  // Kunci scroll saat opening animation berjalan
  document.body.classList.add('overflow-hidden');

  // Stage 1: Muncul smooth selama 1.1s
  // Stage 2: Fade out halus
  setTimeout(() => {
    loaderEl.classList.add('opacity-0', 'pointer-events-none');
    document.body.classList.remove('overflow-hidden');

    // Hapus dari DOM setelah transisi selesai
    setTimeout(() => {
      loaderEl.style.display = 'none';
    }, 600);
  }, 1100);
}
