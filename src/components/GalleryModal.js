/**
 * GalleryModal.js
 * Merender foto galeri asli dan mengelola interaktivitas Lightbox
 * Termasuk dukungan keyboard navigation (ArrowLeft, ArrowRight, Escape) & touch swipe di mobile.
 */

import { galleryData } from '../data/gallery.js';

let currentIdx = 0;

export function initGallery() {
  const container = document.getElementById('gallery-grid');
  const modal = document.getElementById('lightbox-modal');
  const modalImg = document.getElementById('lightbox-image');
  const modalTitle = document.getElementById('lightbox-title');
  const modalCaption = document.getElementById('lightbox-caption');
  const modalCounter = document.getElementById('lightbox-counter');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  const closeBtn = document.getElementById('lightbox-close');

  if (!container) return;

  // Render foto-foto ke dalam gallery-grid
  container.innerHTML = galleryData.map((item, index) => `
    <div 
      class="${item.span} group relative rounded-2xl overflow-hidden cursor-pointer shadow-md transform transition-all duration-300 hover:shadow-xl"
      data-gallery-index="${index}"
      tabindex="0"
      role="button"
      aria-label="Lihat foto: ${item.title}"
    >
      <picture class="w-full h-full block">
        <source srcset="${item.webp}" type="image/webp"/>
        <img
          src="${item.image}"
          alt="${item.alt}"
          loading="lazy"
          decoding="async"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
      </picture>
      <div class="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-60 group-hover:opacity-85 transition-opacity"></div>
      <div class="absolute bottom-6 left-6 right-6 flex items-center justify-between text-on-primary">
        <div>
          <p class="font-label-sm text-label-sm uppercase tracking-widest text-secondary-fixed font-semibold">${item.category}</p>
          <h3 class="font-headline-sm text-headline-sm leading-tight mt-0.5">${item.title}</h3>
        </div>
        <span class="w-10 h-10 rounded-full bg-surface-container-lowest/20 backdrop-blur-md flex items-center justify-center group-hover:bg-secondary-fixed group-hover:text-primary transition-colors flex-shrink-0 ml-2">
          <span class="material-symbols-outlined text-[20px]">fullscreen</span>
        </span>
      </div>
    </div>
  `).join('');

  // Event listener klik pada kartu galeri
  container.querySelectorAll('[data-gallery-index]').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.getAttribute('data-gallery-index'), 10);
      openLightbox(idx);
    });
    // Keyboard Enter / Space
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const idx = parseInt(card.getAttribute('data-gallery-index'), 10);
        openLightbox(idx);
      }
    });
  });

  function openLightbox(index) {
    if (!modal) return;
    currentIdx = index;
    updateLightbox();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
  }

  function closeLightbox() {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
  }

  function nextPhoto() {
    currentIdx = (currentIdx + 1) % galleryData.length;
    updateLightbox();
  }

  function prevPhoto() {
    currentIdx = (currentIdx - 1 + galleryData.length) % galleryData.length;
    updateLightbox();
  }

  function updateLightbox() {
    const item = galleryData[currentIdx];
    if (!item) return;

    if (modalImg) {
      modalImg.src = item.image;
      modalImg.alt = item.alt;
    }
    if (modalTitle) {
      modalTitle.textContent = item.title;
    }
    if (modalCaption) {
      modalCaption.textContent = item.description;
    }
    if (modalCounter) {
      modalCounter.textContent = `Foto ${currentIdx + 1} dari ${galleryData.length}`;
    }
  }

  if (prevBtn) prevBtn.addEventListener('click', prevPhoto);
  if (nextBtn) nextBtn.addEventListener('click', nextPhoto);
  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);

  // Close jika backdrop diklik
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeLightbox();
      }
    });
  }

  // Keyboard Navigation
  document.addEventListener('keydown', (e) => {
    if (modal && !modal.classList.contains('hidden')) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
    }
  });

  // Touch Swipe Support di Mobile
  let touchStartX = 0;
  let touchEndX = 0;

  if (modal) {
    modal.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    modal.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleGesture();
    }, { passive: true });
  }

  function handleGesture() {
    const delta = touchEndX - touchStartX;
    if (Math.abs(delta) > 50) {
      if (delta < 0) {
        // swipe left -> next
        nextPhoto();
      } else {
        // swipe right -> prev
        prevPhoto();
      }
    }
  }
}
