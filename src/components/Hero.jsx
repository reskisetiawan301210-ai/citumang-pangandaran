import React from 'react';
import { siteConfig } from '../config/siteConfig';

export default function Hero({ onOpenReservation }) {
  const scrollToActivities = (e) => {
    e.preventDefault();
    const el = document.getElementById('aktivitas');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative -mt-20 w-full min-h-[95vh] lg:min-h-screen flex items-center justify-center overflow-hidden" id="beranda">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <picture>
          <source media="(max-width: 767px)" srcSet="/images/citumang/hero-mobile.webp" type="image/webp" />
          <source media="(max-width: 767px)" srcSet="/images/citumang/hero-mobile.jpg" />
          <source media="(min-width: 768px)" srcSet="/images/citumang/hero.webp" type="image/webp" />
          <img
            src={siteConfig.heroImage}
            alt="Citumang Body Rafting Pangandaran"
            className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out"
            loading="eager"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/60 to-primary/40 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-radial from-transparent via-transparent to-primary/70"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop pt-32 pb-24 md:pt-40 md:pb-28 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-lowest/15 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] mb-6 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
          <span className="font-label-sm text-label-sm uppercase tracking-[0.2em] text-on-primary">
            DESTINASI WISATA ALAM • PANGANDARAN
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-display text-display-mobile md:text-display text-on-primary max-w-4xl tracking-tight leading-[1.1] mb-6">
          Temukan Keindahan <span className="italic font-normal text-secondary-fixed">Citumang</span>
        </h1>

        {/* Subtitle */}
        <p className="font-body-lg text-body-md md:text-body-lg text-surface-container-high max-w-2xl font-light mb-10 leading-relaxed">
          Rasakan kejernihan air pirus alami, keteduhan hutan hujan karst, dan pengalaman petualangan body rafting yang tak terlupakan di suaka lembah sungai Pangandaran.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <a
            href="#aktivitas"
            onClick={scrollToActivities}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-secondary text-on-secondary px-8 py-3.5 rounded-lg font-label-lg text-label-lg uppercase tracking-wider hover:bg-on-secondary-container transition-all duration-300 shadow-[0_12px_28px_-6px_rgba(0,106,97,0.4)] hover:-translate-y-0.5"
          >
            <span>Jelajahi Citumang</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </a>
          <button
            type="button"
            onClick={() => onOpenReservation()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-surface-container-lowest/15 backdrop-blur-md text-on-primary px-8 py-3.5 rounded-lg font-label-lg text-label-lg uppercase tracking-wider hover:bg-surface-container-lowest/30 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"
          >
            <span>Reservasi Sekarang</span>
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-14 pt-8 w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4 text-surface-container-high">
          <div className="flex items-center justify-center gap-2.5 px-3 py-2 bg-primary-container/40 backdrop-blur-sm rounded-lg border border-primary-container/30">
            <span className="material-symbols-outlined text-secondary-fixed text-[20px]">water_drop</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-left">Air Jernih Alami</span>
          </div>
          <div className="flex items-center justify-center gap-2.5 px-3 py-2 bg-primary-container/40 backdrop-blur-sm rounded-lg border border-primary-container/30">
            <span className="material-symbols-outlined text-secondary-fixed text-[20px]">forest</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-left">Alam Hutan Asri</span>
          </div>
          <div className="flex items-center justify-center gap-2.5 px-3 py-2 bg-primary-container/40 backdrop-blur-sm rounded-lg border border-primary-container/30">
            <span className="material-symbols-outlined text-secondary-fixed text-[20px]">kayaking</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-left">River Tubing</span>
          </div>
          <div className="flex items-center justify-center gap-2.5 px-3 py-2 bg-primary-container/40 backdrop-blur-sm rounded-lg border border-primary-container/30">
            <span className="material-symbols-outlined text-secondary-fixed text-[20px]">health_and_safety</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-left">Ramah Keluarga</span>
          </div>
        </div>
      </div>
    </section>
  );
}
