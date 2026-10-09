/**
 * PageLoader.js
 * Animasi opening website Citumang Pangandaran
 * Tampil maksimal 1 kali per sesi kunjungan (sessionStorage).
 * Dilengkapi proteksi safety timeout dan prefers-reduced-motion.
 */

export function initPageLoader() {
  const loaderEl = document.getElementById('page-loader');
  if (!loaderEl) return;

  // Cek apakah sudah pernah tampil di sesi saat ini
  try {
    if (sessionStorage.getItem('citumang_splash_seen') === 'true') {
      loaderEl.style.display = 'none';
      loaderEl.dataset.dismissed = 'true';
      document.body.classList.remove('overflow-hidden');
      return;
    }
  } catch (e) {
    // Abaikan error sessionStorage pada private browsing ketat
  }

  function dismiss() {
    if (loaderEl.dataset.dismissed === 'true') return;
    loaderEl.dataset.dismissed = 'true';
    try {
      sessionStorage.setItem('citumang_splash_seen', 'true');
    } catch (e) {}
    loaderEl.classList.add('opacity-0', 'pointer-events-none');
    document.body.classList.remove('overflow-hidden');
    setTimeout(() => {
      if (loaderEl) loaderEl.style.display = 'none';
    }, 500);
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    dismiss();
    return;
  }

  // Kunci scroll saat opening animation berjalan
  document.body.classList.add('overflow-hidden');

  // Dismiss smooth setelah 1.0s
  setTimeout(dismiss, 1000);

  // Fallback cadangan: maksimal 1.5 detik
  setTimeout(dismiss, 1500);
}
