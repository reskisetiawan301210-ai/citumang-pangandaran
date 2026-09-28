/**
 * PageLoader.js
 * Animasi opening website Citumang Pangandaran
 * Durasi: ~1.1 detik, smooth, natural, elegan, cinematic
 * Dilengkapi proteksi safety timeout dan prefers-reduced-motion.
 */

export function initPageLoader() {
  const loaderEl = document.getElementById('page-loader');
  if (!loaderEl) return;

  function dismiss() {
    if (loaderEl.dataset.dismissed === 'true') return;
    loaderEl.dataset.dismissed = 'true';
    loaderEl.classList.add('opacity-0', 'pointer-events-none');
    document.body.classList.remove('overflow-hidden');
    setTimeout(() => {
      if (loaderEl) loaderEl.style.display = 'none';
    }, 600);
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    dismiss();
    return;
  }

  // Kunci scroll saat opening animation berjalan
  document.body.classList.add('overflow-hidden');

  // Dismiss smooth setelah 1.1s
  setTimeout(dismiss, 1100);

  // Fallback cadangan: maksimal 1.8 detik jika ada keterlambatan asset
  setTimeout(dismiss, 1800);
}
