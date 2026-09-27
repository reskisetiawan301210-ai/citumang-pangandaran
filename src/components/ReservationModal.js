/**
 * ReservationModal.js
 * Logika dan interaktivitas Sistem Reservasi Citumang Pangandaran
 * Menggunakan nomor WhatsApp resmi yang sudah terkonfigurasi di siteConfig.js (0812-2132-5957).
 */

import { siteConfig } from '../config/siteConfig.js';

export function initReservationModal() {
  const modal = document.getElementById('reservation-modal');
  const form = document.getElementById('reservation-form');
  const closeBtn = document.getElementById('close-reservation-btn');
  const packageSelect = document.getElementById('res-package');

  if (!modal || !form) return;

  // Isi dropdown paket dari siteConfig jika kosong
  if (packageSelect && packageSelect.children.length === 0) {
    siteConfig.packages.forEach(pkg => {
      const opt = document.createElement('option');
      opt.value = pkg;
      opt.textContent = pkg;
      packageSelect.appendChild(opt);
    });
  }

  // Fungsi Buka Modal
  window.openReservationModal = function (presetPackage = '') {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');

    if (presetPackage && packageSelect) {
      // Cari option yang sesuai
      const found = Array.from(packageSelect.options).find(opt => 
        opt.value.toLowerCase().includes(presetPackage.toLowerCase())
      );
      if (found) {
        packageSelect.value = found.value;
      }
    }

    // Set tanggal minimal adalah hari ini
    const dateInput = document.getElementById('res-date');
    if (dateInput && !dateInput.value) {
      dateInput.min = new Date().toISOString().split('T')[0];
    }

    // Focus ke input nama
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

  // Sambungkan semua elemen dengan class 'open-reservation-modal'
  document.querySelectorAll('[data-action="reservation"], a[href="#reservasi-modal"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const preset = btn.getAttribute('data-package') || '';
      window.openReservationModal(preset);
    });
  });

  // Validasi & Submit Form
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const nameVal = document.getElementById('res-name').value.trim();
    const phoneVal = document.getElementById('res-phone').value.trim();
    const dateVal = document.getElementById('res-date').value;
    const peopleVal = document.getElementById('res-people').value;
    const packageVal = packageSelect ? packageSelect.value : siteConfig.packages[0];
    const notesVal = document.getElementById('res-notes').value.trim();

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

    if (!dateVal) {
      showError('res-date-error', 'Pilih tanggal rencana kunjungan');
      hasError = true;
    }

    if (!peopleVal || parseInt(peopleVal) < 1) {
      showError('res-people-error', 'Minimal jumlah peserta adalah 1 orang');
      hasError = true;
    }

    if (hasError) return;

    // Format tanggal Indonesia
    let formattedDate = dateVal;
    try {
      const d = new Date(dateVal);
      formattedDate = d.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      // fallback
    }

    // Susun pesan WhatsApp otomatis
    const message = `Halo Citumang Pangandaran, saya ingin melakukan reservasi.

*Detail Reservasi:*
• Nama: ${nameVal}
• No. WhatsApp: ${phoneVal}
• Tanggal Kunjungan: ${formattedDate}
• Jumlah Orang: ${peopleVal} Orang
• Paket/Aktivitas: ${packageVal}
${notesVal ? `• Catatan Khusus: ${notesVal}` : '• Catatan Khusus: -'}

Mohon informasi ketersediaan slot pemandu dan rincian pembayarannya.
Terima kasih!`;

    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${siteConfig.contact.whatsappNumber}?text=${encodedMessage}`;

    // Buka WhatsApp di tab baru
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // Tutup modal
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
    ['res-name-error', 'res-phone-error', 'res-date-error', 'res-people-error'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = '';
        el.classList.add('hidden');
      }
    });
  }
}
