/**
 * Site Data Synchronization Service
 * Menghubungkan website publik ke database Firestore CMS secara asinkron.
 * Mengambil data terkini (Provider, Hero, Harga, Jam, Fasilitas, Aktivitas, Galeri)
 * dan mengupdate DOM publik secara seamless dengan fallback data statis & localStorage cache.
 */

import { db } from '../config/firebase.js';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

const CACHE_KEY = 'citumang_cms_cache_v1';

/**
 * Terapkan data ke elemen DOM publik
 * @param {Object} data - Objek data dari Firestore / cache
 */
function applyDataToDOM(data) {
  if (!data) return;

  try {
    // 1. PROVIDER IDENTITAS
    if (data.provider) {
      const p = data.provider;
      // Update Provider Name
      const nameEls = document.querySelectorAll('[data-bind="provider-name"]');
      nameEls.forEach(el => { if (p.name) el.textContent = p.name; });

      // Update Provider Role / Tagline
      const roleEls = document.querySelectorAll('[data-bind="provider-role"]');
      roleEls.forEach(el => { if (p.role) el.textContent = p.role; });

      // Update Provider Description
      const descEls = document.querySelectorAll('[data-bind="provider-desc"]');
      descEls.forEach(el => { if (p.description) el.textContent = p.description; });

      // Update Provider Photo (PNG / WebP)
      if (p.image) {
        const providerImgs = document.querySelectorAll('#provider img');
        providerImgs.forEach(img => {
          img.src = p.image;
        });
        const providerSources = document.querySelectorAll('#provider picture source');
        providerSources.forEach(source => {
          source.srcset = p.imageWebp || p.image;
        });
      }
    }

    // 2. HERO SECTION (FOTO & TEKS)
    if (data.hero) {
      const h = data.hero;
      if (h.headline) {
        const headlineEl = document.querySelector('#beranda h1');
        if (headlineEl) headlineEl.innerHTML = h.headline;
      }
      if (h.subtitle) {
        const subEl = document.querySelector('#beranda p.font-body-lg');
        if (subEl) subEl.textContent = h.subtitle;
      }

      // Update Hero Responsive Picture
      const heroPicture = document.querySelector('#beranda picture');
      if (heroPicture) {
        if (h.desktopImage) {
          const deskSources = heroPicture.querySelectorAll('source[media*="768px"]');
          deskSources.forEach(s => { s.srcset = h.desktopImage; });
          const mainImg = heroPicture.querySelector('img');
          if (mainImg) mainImg.src = h.desktopImage;
        }
        if (h.mobileImage) {
          const mobSources = heroPicture.querySelectorAll('source[media*="767px"]');
          mobSources.forEach(s => { s.srcset = h.mobileImage; });
        }
      }
    }

    // 3. HARGA & PAKET
    if (data.pricing) {
      const pr = data.pricing;
      if (pr.startingPrice) {
        // Update seluruh kemunculan harga mulai
        const priceEls = document.querySelectorAll('[data-bind="starting-price"]');
        priceEls.forEach(el => { el.textContent = pr.startingPrice; });
      }
    }

    // 4. JAM OPERASIONAL
    if (data.hours) {
      const ho = data.hours;
      const hoursText = `${ho.open || '07:00'} – ${ho.close || '16:30'} WIB`;
      const hoursEls = document.querySelectorAll('[data-bind="operating-hours"]');
      hoursEls.forEach(el => { el.textContent = hoursText; });
    }

    // 5. KONTAK & WHATSAPP
    if (data.info && data.info.whatsapp) {
      const cleanWa = data.info.whatsapp.replace(/[^0-9]/g, '');
      const waLinks = document.querySelectorAll('a[href*="wa.me"]');
      waLinks.forEach(link => {
        const url = new URL(link.href);
        const textParam = url.searchParams.get('text') || '';
        link.href = `https://wa.me/${cleanWa}${textParam ? `?text=${encodeURIComponent(textParam)}` : ''}`;
      });
    }
  } catch (err) {
    console.warn('[SiteDataService] Gagal menerapkan data ke DOM:', err);
  }
}

/**
 * Sinkronisasi data publik dari Firestore dengan cache lokal
 */
export async function syncPublicSiteData() {
  // 1. Terapkan cache lokal lebih dulu agar instan (Zero Layout Shift)
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      applyDataToDOM(parsed);
    }
  } catch {
    // Abaikan error cache
  }

  // 2. Jika database Firestore tidak tersedia, pertahankan tampilan statis
  if (!db) return;

  // 3. Ambil data terbaru dari Firestore di background
  try {
    const freshData = {};

    // Ambil Info Provider
    const provSnap = await getDoc(doc(db, 'siteConfig', 'provider')).catch(() => null);
    if (provSnap && provSnap.exists()) {
      freshData.provider = provSnap.data();
    }

    // Ambil Hero Config
    const heroSnap = await getDoc(doc(db, 'siteConfig', 'hero')).catch(() => null);
    if (heroSnap && heroSnap.exists()) {
      freshData.hero = heroSnap.data();
    }

    // Ambil Pricing Config
    const pricingSnap = await getDoc(doc(db, 'siteConfig', 'pricing')).catch(() => null);
    if (pricingSnap && pricingSnap.exists()) {
      freshData.pricing = pricingSnap.data();
    }

    // Ambil Hours Config
    const hoursSnap = await getDoc(doc(db, 'siteConfig', 'hours')).catch(() => null);
    if (hoursSnap && hoursSnap.exists()) {
      freshData.hours = hoursSnap.data();
    }

    // Ambil Info Kontak
    const infoSnap = await getDoc(doc(db, 'siteConfig', 'info')).catch(() => null);
    if (infoSnap && infoSnap.exists()) {
      freshData.info = infoSnap.data();
    }

    // Jika ada data baru yang berhasil diambil, update DOM dan simpan ke cache
    if (Object.keys(freshData).length > 0) {
      applyDataToDOM(freshData);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(freshData));
      } catch {
        // Kuota storage penuh atau private browsing
      }
    }
  } catch (err) {
    // Mode offline atau Firebase Rules belum siap — fallback ke data statis
    console.info('[SiteDataService] Beroperasi menggunakan fallback statis resmi.');
  }
}
