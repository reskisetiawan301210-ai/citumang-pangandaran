/**
 * main.js
 * Titik masuk utama website Citumang Pangandaran
 * Menginisialisasi komponen: PageLoader, Navigation, Gallery, Accordion, ReservationModal, ScrollReveal, serta sinkronisasi data dinamis dari Firestore.
 */

import { siteConfig } from './config/siteConfig.js';
import { initPageLoader } from './components/PageLoader.js';
import { initNavigation } from './components/Navigation.js';
import { initGallery } from './components/GalleryModal.js';
import { initAccordion } from './components/Accordion.js';
import { initReservationModal } from './components/ReservationModal.js';
import { initScrollReveal } from './components/ScrollReveal.js';
import { syncPublicSiteData } from './services/siteDataService.js';

document.addEventListener('DOMContentLoaded', () => {
  // Inisialisasi Opening Loader Animation
  initPageLoader();

  // Inisialisasi Sticky Navigation & Mobile Menu
  initNavigation();

  // Inisialisasi Galeri & Lightbox
  initGallery();

  // Inisialisasi FAQ & Panduan Accordion
  initAccordion();

  // Inisialisasi Modal Form Reservasi WhatsApp
  initReservationModal();

  // Inisialisasi Scroll Reveal
  initScrollReveal();

  // Sinkronisasi data CMS dari Firestore di background
  syncPublicSiteData();

  console.log(`[${siteConfig.name}] Website berhasil dimuat. WhatsApp Hotline: ${siteConfig.contact.whatsappDisplay}`);
});
