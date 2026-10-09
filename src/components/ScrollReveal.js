/**
 * ScrollReveal.js
 * Animasi scroll halus berbasis IntersectionObserver ringan
 * Menghormati prefers-reduced-motion, dilengkapi failsafe viewport check dan fallback timer
 * agar konten tidak pernah tertahan tidak terlihat (zero blank space).
 */

let activeObserver = null;

export function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal-on-scroll');
  if (!elements || elements.length === 0) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    elements.forEach(el => el.classList.add('is-visible'));
    return;
  }

  // Bersihkan observer sebelumnya jika ada
  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }

  // 1. Cek langsung elemen yang sudah ada di viewport saat ini (Zero delay visual)
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  elements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top <= windowHeight + 50) {
      el.classList.add('is-visible');
    }
  });

  // 2. Observer untuk elemen yang berada di bawah lipatan
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px 60px 0px',
    threshold: 0.02
  };

  activeObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, observerOptions);

  elements.forEach(el => {
    if (!el.classList.contains('is-visible')) {
      activeObserver.observe(el);
    }
  });

  // 3. Failsafe fallback timer: pastikan tidak ada konten yang terjebak di opacity: 0
  setTimeout(() => {
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= windowHeight + 200) {
        el.classList.add('is-visible');
      }
    });
  }, 600);

  // Safety net maksimal 1.8s: semua konten wajib terlihat
  setTimeout(() => {
    document.querySelectorAll('.reveal-on-scroll:not(.is-visible)').forEach(el => {
      el.classList.add('is-visible');
    });
  }, 1800);
}
