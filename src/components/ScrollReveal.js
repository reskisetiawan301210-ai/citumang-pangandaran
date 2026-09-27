/**
 * ScrollReveal.js
 * Animasi scroll halus berbasis IntersectionObserver ringan
 * Menghormati prefers-reduced-motion
 */

export function initScrollReveal() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    document.querySelectorAll('.reveal-on-scroll').forEach(el => {
      el.classList.add('is-visible');
    });
    return;
  }

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.12
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal-on-scroll').forEach(el => {
    observer.observe(el);
  });
}
