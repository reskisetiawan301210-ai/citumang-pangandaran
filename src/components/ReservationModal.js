/**
 * ReservationModal.js
 * Logika dan interaktivitas Sistem Reservasi Citumang Pangandaran
 * Menggunakan nomor WhatsApp resmi yang sudah terkonfigurasi di siteConfig.js (0812-2132-5957).
 */

import { siteConfig } from '../config/siteConfig.js';

let isInitialized = false;

export function initReservationModal() {
  const modal = document.getElementById('reservation-modal');
  const form = document.getElementById('reservation-form');
  const closeBtn = document.getElementById('close-reservation-btn');

  if (!modal || !form) return;

  // Fungsi Buka Modal
  window.openReservationModal = function () {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');

    const nameInput = document.getElementById('res-name');
    if (nameInput) setTimeout(() => nameInput.focus(), 100);
  };

  // Fungsi Tutup Modal
  window.closeReservationModal = function () {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
    clearErrors();
  };

  if (isInitialized) return;
  isInitialized = true;

  if (closeBtn) {
    closeBtn.addEventListener('click', window.closeReservationModal);
  }

  // Tutup jika klik backdrop
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      window.closeReservationModal();
    }
  });

  // Tombol Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      window.closeReservationModal();
    }
  });

  // Delegasi klik global untuk semua tombol reservasi di seluruh halaman
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="reservation"], a[href="#reservasi-modal"]');
    if (btn) {
      e.preventDefault();
      window.openReservationModal();
    }
  });

  // Validasi & Submit Form
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const nameVal = document.getElementById('res-name').value.trim();
    const phoneVal = document.getElementById('res-phone').value.trim();

    let hasError = false;

    if (!nameVal) {
      showError('res-name-error', 'Nama lengkap wajib diisi');
      hasError = true;
    }

    if (!phoneVal) {
      showError('res-phone-error', 'Nomor WhatsApp wajib diisi');
      hasError = true;
    } else if (!/^[0-9+-\s]{8,20}$/.test(phoneVal)) {
      showError('res-phone-error', 'Nomor WhatsApp tidak valid (contoh: 08123456789)');
      hasError = true;
    }

    if (hasError) return;

    // Susun pesan WhatsApp otomatis
    const message = `Halo Citumang Pangandaran, saya ingin melakukan reservasi.

*Data Pengunjung:*
• Nama: ${nameVal}
• No. WhatsApp: ${phoneVal}

Mohon informasi ketersediaan dan rincian paket yang tersedia.
Terima kasih!`;

    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${siteConfig.contact.whatsappNumber}?text=${encodedMessage}`;

    // Buka WhatsApp di tab baru
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // Tutup modal & bersihkan form
    form.reset();
    window.closeReservationModal();
  });

  function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }

  function clearErrors() {
    ['res-name-error', 'res-phone-error'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = '';
        el.classList.add('hidden');
      }
    });
  }
}
