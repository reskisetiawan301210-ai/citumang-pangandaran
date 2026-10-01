import React, { useState } from 'react';
import { siteConfig } from '../config/siteConfig';

export default function ReservationModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });

  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Nama lengkap wajib diisi';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Nomor WhatsApp wajib diisi';
    } else if (!/^[0-9+-\s]{8,20}$/.test(formData.phone)) {
      newErrors.phone = 'Nomor WhatsApp tidak valid';
    }
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Susun pesan WhatsApp otomatis
    const message = `Halo Citumang Pangandaran, saya ingin melakukan reservasi.

*Data Pengunjung:*
• Nama: ${formData.name.trim()}
• No. WhatsApp: ${formData.phone.trim()}

Mohon informasi ketersediaan dan rincian paket yang tersedia.
Terima kasih!`;

    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${siteConfig.contact.whatsappNumber}?text=${encodedMessage}`;

    // Buka WhatsApp
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/80 backdrop-blur-md transition-all duration-300 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/30 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="bg-primary px-6 py-5 text-on-primary flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary-fixed">
              <span className="material-symbols-outlined text-2xl">confirmation_number</span>
            </div>
            <div>
              <h2 id="modal-title" className="font-headline-sm text-lg md:text-xl font-semibold leading-tight">
                Reservasi Citumang
              </h2>
              <p className="text-surface-container-high text-xs mt-0.5">
                Konfirmasi cepat langsung terhubung ke WhatsApp Admin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-surface-container-high hover:text-on-primary p-1.5 rounded-lg hover:bg-surface-container-lowest/10 transition-colors focus:outline-none"
            aria-label="Tutup Formulir"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Nama */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface mb-1.5">
              Nama Lengkap <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Contoh: Budi Santoso"
                className={`w-full px-4 py-2.5 rounded-lg bg-surface-container-low border ${
                  errors.name ? 'border-error ring-1 ring-error' : 'border-outline-variant'
                } text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all`}
              />
            </div>
            {errors.name && <p className="text-error text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Nomor WhatsApp */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface mb-1.5">
              No. WhatsApp <span className="text-error">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0812xxxxxxxx"
              className={`w-full px-4 py-2.5 rounded-lg bg-surface-container-low border ${
                errors.phone ? 'border-error ring-1 ring-error' : 'border-outline-variant'
              } text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all`}
            />
            {errors.phone && <p className="text-error text-xs mt-1">{errors.phone}</p>}
          </div>

          {/* Info Hotline Note */}
          <div className="bg-surface-container-low p-3 rounded-lg flex items-start gap-2.5 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-secondary text-base mt-0.5">verified</span>
            <span>
              Reservasi akan langsung dikirim ke WhatsApp resmi Citumang (<strong>{siteConfig.contact.whatsappDisplay}</strong>). Tim kami akan merespon untuk konfirmasi ketersediaan & jadwal pemandu.
            </span>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-secondary text-on-secondary py-3.5 px-6 rounded-lg font-label-md text-label-md uppercase tracking-wider hover:bg-on-secondary-container transition-all duration-300 shadow-[0_8px_20px_-4px_rgba(0,106,97,0.35)] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-secondary/50"
            >
              <span>Kirim Reservasi ke WhatsApp</span>
              <span className="material-symbols-outlined text-lg">send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
