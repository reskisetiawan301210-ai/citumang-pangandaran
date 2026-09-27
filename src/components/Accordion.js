/**
 * Accordion.js
 * Mengelola interaktivitas informasi penting dan FAQ wisatawan
 */

import { faqData } from '../data/information.js';

export function initAccordion() {
  const container = document.getElementById('accordionContainer');
  if (!container) return;

  // Render accordion items secara dinamis
  container.innerHTML = faqData.map((item, idx) => `
    <div class="rounded-xl bg-surface-container-low overflow-hidden border border-outline-variant/20 transition-all duration-200 hover:border-outline-variant/50">
      <button
        class="accordion-header w-full p-5 text-left flex items-center justify-between font-headline-sm text-headline-sm text-primary text-[18px] focus:outline-none focus:bg-surface-container transition-colors"
        data-accordion-id="${item.id}"
        aria-expanded="${idx === 0 ? 'true' : 'false'}"
        aria-controls="content-${item.id}"
      >
        <span>${item.question}</span>
        <span
          class="material-symbols-outlined text-secondary transition-transform duration-300 text-2xl"
          id="icon-${item.id}"
          style="transform: ${idx === 0 ? 'rotate(180deg)' : 'rotate(0deg)'};"
        >
          expand_more
        </span>
      </button>
      <div
        class="accordion-content px-5 pb-5 font-body-md text-body-md text-on-surface-variant leading-relaxed ${idx === 0 ? '' : 'hidden'}"
        id="content-${item.id}"
      >
        ${item.answer}
      </div>
    </div>
  `).join('');

  // Event listener accordion
  const headers = container.querySelectorAll('.accordion-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const id = header.getAttribute('data-accordion-id');
      const content = document.getElementById(`content-${id}`);
      const icon = document.getElementById(`icon-${id}`);
      const isExpanded = header.getAttribute('aria-expanded') === 'true';

      // Tutup semua terlebih dahulu (single expand style)
      headers.forEach(h => {
        const hid = h.getAttribute('data-accordion-id');
        const c = document.getElementById(`content-${hid}`);
        const ic = document.getElementById(`icon-${hid}`);
        h.setAttribute('aria-expanded', 'false');
        if (c) c.classList.add('hidden');
        if (ic) ic.style.transform = 'rotate(0deg)';
      });

      // Jika sebelumnya tertutup, sekarang buka
      if (!isExpanded) {
        header.setAttribute('aria-expanded', 'true');
        if (content) content.classList.remove('hidden');
        if (icon) icon.style.transform = 'rotate(180deg)';
      }
    });
  });
}
