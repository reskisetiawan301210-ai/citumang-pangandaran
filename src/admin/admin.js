/**
 * Admin Panel — Citumang Pangandaran
 * Mengelola autentikasi admin, upload gambar Firebase Storage, dan CRUD data website via Firebase Firestore.
 * Dilengkapi proteksi sesi, timeout pencegah infinite loading, validasi hak akses admin,
 * dan penyimpanan permanen ke server cloud.
 */

import { auth, db, initError, checkFirebaseEnv, uploadImageToStorage } from '../config/firebase.js';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';

// ===== STATE =====
let currentSection = 'overview';
let authResolved = false;
let siteData = {
  provider: {},
  hero: {},
  info: {},
  pricing: {},
  hours: {},
  facilities: [],
  activities: [],
  gallery: []
};

// Status koneksi Firebase — melacak apakah data benar dari Firestore atau fallback default
let firebaseStatus = {
  envComplete: false,
  dbInitialized: false,
  firestoreConnected: false,
  storageReady: false,
  dataSource: {}, // { provider: 'firestore'|'default'|'error', ... }
  errors: [],     // Array pesan error yang terjadi saat load
  lastCheck: null
};

// ===== DOM SELECTORS (DYNAMIC & SAFE) =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== UI CONTROLLERS =====
function hideLoading() {
  const el = $('#loading-screen');
  if (el) el.style.display = 'none';
}

function showLoading(text = 'Memproses...') {
  const el = $('#loading-screen');
  if (el) {
    const textEl = $('#loading-text');
    if (textEl) textEl.textContent = text;
    el.style.display = 'flex';
  }
}

function showLogin() {
  hideLoading();
  const lp = $('#login-page');
  const dp = $('#dashboard-page');
  if (lp) lp.style.display = 'flex';
  if (dp) dp.style.display = 'none';
}

function showLoginError(msg) {
  const errorBox = $('#login-error');
  const errorText = $('#login-error-text');
  if (errorBox && errorText) {
    errorText.textContent = msg;
    errorBox.classList.add('show');
  }
}

function hideLoginError() {
  const errorBox = $('#login-error');
  if (errorBox) errorBox.classList.remove('show');
}

function showConfigAlert(message) {
  const alertBox = $('#config-alert');
  const alertText = $('#config-alert-text');
  if (alertBox && alertText) {
    alertText.innerHTML = message;
    alertBox.style.display = 'block';
  }
}

// ===== ADMIN AUTHORIZATION CHECK =====
async function verifyAdminAccess(user) {
  if (!user) {
    return { authorized: false, reason: 'Pengguna belum terautentikasi.' };
  }

  // 1. Cek VITE_ADMIN_EMAILS jika dikonfigurasi di environment variable
  const envAdminEmails = import.meta.env.VITE_ADMIN_EMAILS;
  if (envAdminEmails && typeof envAdminEmails === 'string') {
    const allowed = envAdminEmails
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (allowed.length > 0 && !allowed.includes((user.email || '').toLowerCase())) {
      return {
        authorized: false,
        reason: `Akun (${user.email}) tidak memiliki hak akses administrator.`
      };
    }
  }

  // 2. Verifikasi ke koleksi 'admins' Firestore
  if (db) {
    try {
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      if (adminDoc.exists()) {
        const data = adminDoc.data();
        if (data.role && data.role !== 'admin' && data.isAdmin === false) {
          return { authorized: false, reason: 'Peran akun Anda bukan administrator.' };
        }
      } else {
        // Jika dokumen admin belum ada, TOLAK AKSES
        return { 
          authorized: false, 
          reason: `Akses Ditolak: UID Anda (${user.uid}) belum didaftarkan di koleksi 'admins' oleh pemilik sistem.` 
        };
      }
    } catch (err) {
      return { 
        authorized: false, 
        reason: 'Gagal memverifikasi hak akses ke Firestore. (Mungkin offline atau Permission Denied)' 
      };
    }
  }

  return { authorized: true };
}

// ===== AUTH INITIALIZATION =====
function initAuth() {
  const envStatus = checkFirebaseEnv();

  // Jika environment variable belum lengkap
  if (!envStatus.isComplete || !auth) {
    authResolved = true;
    hideLoading();
    showLogin();
    showConfigAlert(
      `<strong>Konfigurasi Firebase belum lengkap:</strong><br/>` +
      `Variabel berikut belum diatur: <code>${envStatus.missing.join(', ')}</code>.<br/>` +
      `<small>Tambahkan di Settings → Environment Variables di Vercel atau file <code>.env</code> lokal, lalu deploy ulang.</small>`
    );
    const btn = $('#btn-login');
    if (btn) btn.disabled = true;
    return;
  }

  // Timeout pengaman anti-infinite loading (maks 3.5 detik)
  const authTimeout = setTimeout(() => {
    if (!authResolved) {
      console.warn('[Auth Timeout] Sesi Firebase melampaui batas waktu, menampilkan login.');
      authResolved = true;
      hideLoading();
      showLogin();
      showLoginError('Waktu tunggu koneksi Firebase habis. Silakan masukkan email dan password admin.');
    }
  }, 3500);

  // Pantau status autentikasi Firebase
  onAuthStateChanged(
    auth,
    async (user) => {
      clearTimeout(authTimeout);
      authResolved = true;

      if (user) {
        showLoading('Memverifikasi hak akses admin...');
        const authCheck = await verifyAdminAccess(user);

        if (authCheck.authorized) {
          await showDashboard(user);
        } else {
          await signOut(auth);
          showLogin();
          showLoginError(authCheck.reason);
        }
      } else {
        showLogin();
      }
    },
    (error) => {
      clearTimeout(authTimeout);
      authResolved = true;
      console.error('[Auth State Error]:', error);
      showLogin();
      showLoginError('Gagal memeriksa status login: ' + (error.message || 'Kesalahan jaringan.'));
    }
  );

  // Login Form Submit Handler
  $('#login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideLoginError();

    const email = $('#login-email')?.value.trim();
    const password = $('#login-password')?.value;
    const btn = $('#btn-login');
    const btnText = $('#login-btn-text');

    if (!email || !password) {
      showLoginError('Mohon isi email dan password.');
      return;
    }

    if (btn) btn.disabled = true;
    if (btnText) btnText.innerHTML = '<span class="spinner"></span>';

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const authCheck = await verifyAdminAccess(user);
      if (!authCheck.authorized) {
        await signOut(auth);
        showLoginError(authCheck.reason);
        return;
      }

      await showDashboard(user);
    } catch (err) {
      console.error('[Login Error]:', err);
      let msg = 'Email atau password salah.';
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          msg = 'Email atau password salah.';
          break;
        case 'auth/invalid-email':
          msg = 'Format alamat email tidak valid.';
          break;
        case 'auth/user-disabled':
          msg = 'Akun admin ini dinonaktifkan oleh administrator.';
          break;
        case 'auth/too-many-requests':
          msg = 'Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat atau reset password.';
          break;
        case 'auth/network-request-failed':
          msg = 'Gagal terhubung ke Firebase. Pastikan domain sudah terdaftar di Firebase Console → Authentication → Settings → Authorized domains.';
          break;
        case 'auth/operation-not-allowed':
          msg = 'Metode login Email/Password belum diaktifkan di Firebase Console → Authentication → Sign-in method.';
          break;
        default:
          msg = err.message || 'Terjadi kesalahan saat masuk.';
      }
      showLoginError(msg);
    } finally {
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = 'Masuk';
    }
  });

  // Logout Button
  $('#btn-logout')?.addEventListener('click', async () => {
    showLoading('Keluar dari sesi admin...');
    try {
      await signOut(auth);
    } catch (err) {
      console.error('[Logout Error]:', err);
    }
    showLogin();
  });

  // Fallback Manual Button
  $('#btn-force-login')?.addEventListener('click', () => {
    hideLoading();
    showLogin();
  });
}

// ===== DASHBOARD INITIALIZATION =====
async function showDashboard(user) {
  const lp = $('#login-page');
  const dp = $('#dashboard-page');
  if (lp) lp.style.display = 'none';
  if (dp) dp.style.display = 'block';

  // Tampilkan email admin
  const emailEl = $('#admin-user-email');
  if (emailEl && user) emailEl.textContent = user.email || 'Admin';

  // Setup sidebar navigasi
  setupSidebarNavigation();

  // Ambil seluruh data dari Firestore
  showLoading('Memuat data website...');
  await loadAllData();
  hideLoading();

  // Render halaman aktif
  renderSection(currentSection);
}

function setupSidebarNavigation() {
  $$('.sidebar-nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      $$('.sidebar-nav-item').forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
      const section = item.dataset.section;
      if (section) {
        currentSection = section;
        renderSection(section);
      }
      // Tutup mobile sidebar setelah klik
      $('#admin-sidebar')?.classList.remove('open');
    });
  });

  // Toggle mobile sidebar
  $('#sidebar-toggle')?.addEventListener('click', () => {
    $('#admin-sidebar')?.classList.toggle('open');
  });

  // Close modal saat klik overlay luar
  $('#edit-modal')?.addEventListener('click', (e) => {
    if (e.target === $('#edit-modal')) closeModal();
  });
}

// ===== DATA LOADING DENGAN FALLBACK AMAN =====
async function loadAllData() {
  firebaseStatus.lastCheck = new Date().toISOString();
  firebaseStatus.envComplete = checkFirebaseEnv().isComplete;
  firebaseStatus.dbInitialized = !!db;

  if (!db) {
    firebaseStatus.errors.push('Database tidak terinisialisasi. Variabel VITE_FIREBASE_* mungkin kosong.');
    loadDefaultData();
    return;
  }

  firebaseStatus.errors = [];

  try {
    // Cek koneksi ringan dengan memanggil 1 doc.
    // Jika offline (db belum dibuat) atau permission denied, ini akan THROW error.
    // Jika berhasil konek tapi doc tidak ada, ini tidak throw error (snapshot.exists() == false).
    await getDoc(doc(db, 'siteConfig', 'ping_check'));
    firebaseStatus.firestoreConnected = true;
  } catch (e) {
    firebaseStatus.firestoreConnected = false;
    firebaseStatus.errors.push(`Ping Error: ${e.message}`);
  }

  try {
    // 1. Provider
    try {
      const provDoc = await getDoc(doc(db, 'siteConfig', 'provider'));
      siteData.provider = provDoc.exists() ? provDoc.data() : getDefaultProvider();
      firebaseStatus.dataSource.provider = 'firestore';
    } catch (err) {
      console.warn('[Firestore] Provider default digunakan:', err.message);
      siteData.provider = getDefaultProvider();
      firebaseStatus.dataSource.provider = 'default';
      firebaseStatus.errors.push(`Provider: ${err.message}`);
    }

    // 2. Hero
    try {
      const heroDoc = await getDoc(doc(db, 'siteConfig', 'hero'));
      siteData.hero = heroDoc.exists() ? heroDoc.data() : getDefaultHero();
      firebaseStatus.dataSource.hero = 'firestore';
    } catch (err) {
      console.warn('[Firestore] Hero default digunakan:', err.message);
      siteData.hero = getDefaultHero();
      firebaseStatus.dataSource.hero = 'default';
      firebaseStatus.errors.push(`Hero: ${err.message}`);
    }

    // 3. Info
    try {
      const infoDoc = await getDoc(doc(db, 'siteConfig', 'info'));
      siteData.info = infoDoc.exists() ? infoDoc.data() : getDefaultInfo();
      firebaseStatus.dataSource.info = 'firestore';
    } catch (err) {
      console.warn('[Firestore] Info default digunakan:', err.message);
      siteData.info = getDefaultInfo();
      firebaseStatus.dataSource.info = 'default';
      firebaseStatus.errors.push(`Info: ${err.message}`);
    }

    // 4. Pricing
    try {
      const pricingDoc = await getDoc(doc(db, 'siteConfig', 'pricing'));
      siteData.pricing = pricingDoc.exists() ? pricingDoc.data() : getDefaultPricing();
      firebaseStatus.dataSource.pricing = 'firestore';
    } catch (err) {
      console.warn('[Firestore] Pricing default digunakan:', err.message);
      siteData.pricing = getDefaultPricing();
      firebaseStatus.dataSource.pricing = 'default';
      firebaseStatus.errors.push(`Pricing: ${err.message}`);
    }

    // 5. Hours
    try {
      const hoursDoc = await getDoc(doc(db, 'siteConfig', 'hours'));
      siteData.hours = hoursDoc.exists() ? hoursDoc.data() : getDefaultHours();
      firebaseStatus.dataSource.hours = 'firestore';
    } catch (err) {
      console.warn('[Firestore] Hours default digunakan:', err.message);
      siteData.hours = getDefaultHours();
      firebaseStatus.dataSource.hours = 'default';
      firebaseStatus.errors.push(`Hours: ${err.message}`);
    }

    // 6. Facilities
    try {
      const facSnap = await getDocs(collection(db, 'facilities'));
      siteData.facilities = [];
      facSnap.forEach((d) => siteData.facilities.push({ id: d.id, ...d.data() }));
      if (siteData.facilities.length === 0) siteData.facilities = getDefaultFacilities();
      firebaseStatus.dataSource.facilities = 'firestore';
    } catch (err) {
      console.warn('[Firestore] Facilities default digunakan:', err.message);
      siteData.facilities = getDefaultFacilities();
      firebaseStatus.dataSource.facilities = 'default';
      firebaseStatus.errors.push(`Facilities: ${err.message}`);
    }

    // 7. Activities
    try {
      const actSnap = await getDocs(collection(db, 'activities'));
      siteData.activities = [];
      actSnap.forEach((d) => siteData.activities.push({ id: d.id, ...d.data() }));
      if (siteData.activities.length === 0) siteData.activities = getDefaultActivities();
      firebaseStatus.dataSource.activities = 'firestore';
    } catch (err) {
      console.warn('[Firestore] Activities default digunakan:', err.message);
      siteData.activities = getDefaultActivities();
      firebaseStatus.dataSource.activities = 'default';
      firebaseStatus.errors.push(`Activities: ${err.message}`);
    }

    // 8. Gallery
    try {
      const galSnap = await getDocs(collection(db, 'gallery'));
      siteData.gallery = [];
      galSnap.forEach((d) => siteData.gallery.push({ id: d.id, ...d.data() }));
      if (siteData.gallery.length === 0) siteData.gallery = getDefaultGallery();
      firebaseStatus.dataSource.gallery = 'firestore';
    } catch (err) {
      console.warn('[Firestore] Gallery default digunakan:', err.message);
      siteData.gallery = getDefaultGallery();
      firebaseStatus.dataSource.gallery = 'default';
      firebaseStatus.errors.push(`Gallery: ${err.message}`);
    }
    
    // Jika ada error apa pun saat ambil data (fallback terjadi), berarti koneksi bermasalah
    if (firebaseStatus.errors.length > 0) {
      firebaseStatus.firestoreConnected = false;
    }

  } catch (globalErr) {
    console.error('[Firestore Load All Error]:', globalErr);
    firebaseStatus.firestoreConnected = false;
    firebaseStatus.errors.push(`Global: ${globalErr.message}`);
    loadDefaultData();
  }
}

function loadDefaultData() {
  siteData.provider = getDefaultProvider();
  siteData.hero = getDefaultHero();
  siteData.info = getDefaultInfo();
  siteData.pricing = getDefaultPricing();
  siteData.hours = getDefaultHours();
  siteData.facilities = getDefaultFacilities();
  siteData.activities = getDefaultActivities();
  siteData.gallery = getDefaultGallery();
  
  firebaseStatus.dataSource = {
    provider: 'default',
    hero: 'default',
    info: 'default',
    pricing: 'default',
    hours: 'default',
    facilities: 'default',
    activities: 'default',
    gallery: 'default'
  };
}

// ===== DATA DEFAULT RESMI CITUMANG =====
function getDefaultProvider() {
  return {
    name: 'Pengelola Resmi Citumang',
    role: 'Official Provider & Tour Coordinator',
    badge: 'Provider Resmi Terverifikasi',
    description: 'Koordinator layanan wisata dan pemesanan paket resmi Citumang Pangandaran. Siap melayani dan mendampingi kunjungan wisatawan untuk petualangan body rafting yang menyenangkan, aman, dan berkesan.',
    image: '/images/provider/provider.png',
    imageWebp: '/images/provider/provider.webp',
    whatsapp: '0812-2132-5957'
  };
}

function getDefaultHero() {
  return {
    headline: 'Temukan Keindahan <span class="italic font-normal text-secondary-fixed">Citumang</span>',
    subtitle: 'Rasakan kesegaran air jernih alami, keteduhan tebing karst, dan pengalaman petualangan body rafting rute ±1,5 KM bersama pemandu profesional di Citumang Pangandaran.',
    desktopImage: '/images/citumang/hero.jpg',
    mobileImage: '/images/citumang/hero-mobile.jpg'
  };
}

function getDefaultInfo() {
  return {
    name: 'Citumang Pangandaran',
    tagline: 'Body Rafting & Wisata Alam',
    description: 'Wisata alam dan body rafting aliran sungai jernih di Citumang Pangandaran, Jawa Barat. Paket pengarungan rute ±1,5 KM lengkap dengan pemandu profesional, perlengkapan pelampung, asuransi, dan makan nasi liwet.',
    address: 'Citumang, Desa Bojong, Kecamatan Parigi, Kabupaten Pangandaran, Jawa Barat 46393',
    whatsapp: '6281221325957',
    instagram: '@citumangpangandaran01',
    tiktok: '@citumangpangandaran01'
  };
}

function getDefaultPricing() {
  return {
    startingPrice: 'Mulai dari Rp69.000',
    packages: [
      'Paket Body Rafting Lengkap (Mulai dari Rp69.000)',
      'River Body Rafting (Full Rute ±1,5 KM)',
      'Berenang & Relaksasi Air Jernih',
      'Family Adventure (Paket Keluarga)',
      'Paket Lengkap + Makan Nasi Liwet'
    ]
  };
}

function getDefaultHours() {
  return {
    days: 'Senin - Minggu',
    open: '07:00',
    close: '16:30',
    timezone: 'WIB'
  };
}

function getDefaultFacilities() {
  return [
    { title: 'Full Body Rafting ±1,5 KM', icon: 'kayaking', description: 'Pengarungan rute aliran sungai jernih sepanjang ±1,5 KM.' },
    { title: 'Perlengkapan Body Rafting', icon: 'safety_check', description: 'Rompi pelampung (life jacket) standar keamanan resmi.' },
    { title: 'Pemandu Profesional', icon: 'badge', description: 'Didampingi pemandu profesional dan berpengalaman.' },
    { title: 'Jasa Dokumentasi', icon: 'photo_camera', description: 'Pengabadian foto & video petualangan Anda di spot terbaik.' },
    { title: 'Makan Nasi Liwet', icon: 'restaurant', description: 'Sajian khas Sunda makan nasi liwet lezat yang disajikan hangat.' },
    { title: 'Asuransi', icon: 'health_and_safety', description: 'Perlindungan asuransi keselamatan resmi bagi setiap pengunjung.' },
    { title: 'Tempat Penyimpanan Barang', icon: 'inventory_2', description: 'Penyimpanan barang bawaan yang aman selama beraktivitas.' },
    { title: 'Dry Bag', icon: 'backpack', description: 'Tas anti air untuk mengamankan gadget dan barang berharga.' },
    { title: 'Kolam Terapi Ikan', icon: 'water_drop', description: 'Sensasi relaksasi alami di kolam terapi ikan untuk menyegarkan tubuh.' }
  ];
}

function getDefaultActivities() {
  return [
    {
      id: 'local_1',
      title: 'Full Body Rafting ±1,5 KM',
      tag: 'Mulai dari Rp69.000',
      duration: 'Rute ±1,5 KM',
      image: '/images/citumang/citumang-04.jpg',
      description: 'Pengarungan rute aliran sungai dan tebing karst Citumang sepanjang ±1,5 KM mengenakan rompi pelampung standar keselamatan dipandu pemandu profesional.'
    },
    {
      id: 'local_2',
      title: 'Berenang Santai di Air Jernih',
      tag: 'Fasilitas Resmi',
      duration: 'Air Jernih',
      image: '/images/citumang/citumang-03.jpg',
      description: 'Berenang dan mengapung santai di aliran air sungai karst alami yang jernih dan segar di bawah naungan tebing batu kapur yang asri.'
    },
    {
      id: 'local_3',
      title: 'Eksplorasi Gua Karst',
      tag: 'Eksotisme Karst',
      duration: 'Tersedia Pemandu',
      image: '/images/citumang/citumang-06.jpg',
      description: 'Mengeksplorasi lorong gua karst alami tempat hulu mata air sungai pegunungan mengalir tenang dengan formasi dinding batu kapur alami.'
    },
    {
      id: 'local_4',
      title: 'Aktivitas Ramah Keluarga',
      tag: 'Lengkap + Asuransi',
      duration: 'Pendamping Pemandu',
      image: '/images/citumang/citumang-05.jpg',
      description: 'Aktivitas berenang di sungai yang aman untuk keluarga dan anak-anak dengan rompi pelampung standar resmi serta pendampingan pemandu profesional.'
    }
  ];
}

function getDefaultGallery() {
  const items = [];
  for (let i = 1; i <= 10; i++) {
    const num = i < 10 ? `0${i}` : `${i}`;
    items.push({
      id: `local_gal_${i}`,
      image: `/images/citumang/citumang-${num}.jpg`,
      title: `Dokumentasi Citumang ${i}`,
      category: 'Wisata Alam',
      alt: `Foto Dokumentasi Citumang ${i}`,
      order: i
    });
  }
  return items;
}

// ===== SECTION RENDERING =====
function renderSection(section) {
  const content = $('#admin-content');
  if (!content) return;

  switch (section) {
    case 'overview':
      renderOverview();
      break;
    case 'provider':
      renderProvider();
      break;
    case 'hero':
      renderHero();
      break;
    case 'info':
      renderInfo();
      break;
    case 'pricing':
      renderPricing();
      break;
    case 'hours':
      renderHours();
      break;
    case 'facilities':
      renderFacilities();
      break;
    case 'activities':
      renderActivities();
      break;
    case 'gallery':
      renderGallery();
      break;
    default:
      renderOverview();
  }
}

// ----- 1. OVERVIEW -----
function renderOverview() {
  const content = $('#admin-content');
  if (!content) return;

  content.innerHTML = `
    <div class="content-header">
      <h3>Dashboard Pengelolaan</h3>
      <p>Ringkasan status pengelolaan konten resmi website Citumang Pangandaran.</p>
    </div>
    <div class="overview-grid">
      <div class="overview-card">
        <div class="ov-icon"><span class="material-symbols-outlined">badge</span></div>
        <div>
          <div class="ov-label">Provider</div>
          <div class="ov-value" style="font-size:1.1rem;">${esc(siteData.provider.name || 'Terverifikasi')}</div>
        </div>
      </div>
      <div class="overview-card">
        <div class="ov-icon"><span class="material-symbols-outlined">kayaking</span></div>
        <div>
          <div class="ov-label">Aktivitas</div>
          <div class="ov-value">${siteData.activities.length}</div>
        </div>
      </div>
      <div class="overview-card">
        <div class="ov-icon"><span class="material-symbols-outlined">spa</span></div>
        <div>
          <div class="ov-label">Fasilitas</div>
          <div class="ov-value">${siteData.facilities.length}</div>
        </div>
      </div>
      <div class="overview-card">
        <div class="ov-icon"><span class="material-symbols-outlined">photo_library</span></div>
        <div>
          <div class="ov-label">Foto Galeri</div>
          <div class="ov-value">${siteData.gallery.length}</div>
        </div>
      </div>
      <div class="overview-card">
        <div class="ov-icon"><span class="material-symbols-outlined">payments</span></div>
        <div>
          <div class="ov-label">Harga Mulai</div>
          <div class="ov-value" style="font-size:1.1rem;">${esc(siteData.pricing.startingPrice || 'Rp69.000')}</div>
        </div>
      </div>
      <div class="overview-card">
        <div class="ov-icon"><span class="material-symbols-outlined">schedule</span></div>
        <div>
          <div class="ov-label">Jam Buka</div>
          <div class="ov-value" style="font-size:1.1rem;">${esc(siteData.hours.open || '07:00')} - ${esc(siteData.hours.close || '16:30')}</div>
        </div>
      </div>
    </div>

    <div class="admin-card">
      ${!firebaseStatus.envComplete ? `
        <div style="background:var(--admin-danger);color:white;padding:1rem;border-radius:8px;margin-bottom:1rem;">
          <h4 style="color:white;display:flex;align-items:center;gap:0.5rem;margin:0 0 0.5rem 0;">
            <span class="material-symbols-outlined">error</span> Variabel Lingkungan Vercel Belum Lengkap
          </h4>
          <p style="margin:0;font-size:0.875rem;">Firebase tidak dapat berjalan. Mohon periksa <strong>VITE_FIREBASE_*</strong> di Vercel Environment Variables dan lakukan Redeploy.</p>
        </div>
      ` : !firebaseStatus.firestoreConnected ? `
        <div style="background:#fff3cd;color:#856404;border:1px solid #ffeeba;padding:1rem;border-radius:8px;margin-bottom:1rem;">
          <h4 style="color:#856404;display:flex;align-items:center;gap:0.5rem;margin:0 0 0.5rem 0;">
            <span class="material-symbols-outlined">cloud_off</span> Mode Offline / Fallback Aktif
          </h4>
          <p style="margin:0 0 0.5rem 0;font-size:0.875rem;">
            Gagal memuat data dari Firestore Database. Data yang Anda lihat saat ini adalah <strong>data DEFAULT statis</strong>.
          </p>
          <div style="background:#f8d7da;color:#721c24;padding:0.5rem;border-radius:4px;font-family:monospace;font-size:0.75rem;margin-bottom:0.5rem;max-height:100px;overflow-y:auto;">
            ${firebaseStatus.errors.length > 0 ? firebaseStatus.errors.map(e => `• ${esc(e)}`).join('<br/>') : 'Unknown error'}
          </div>
          <p style="margin:0;font-size:0.75rem;">
            <strong>Diagnosis:</strong><br/>
            Jika error berisi "<strong>offline</strong>", berarti database Firestore belum dibuat di Firebase Console atau jaringan terputus.<br/>
            Jika error berisi "<strong>permission denied</strong>", berarti Security Rules Firestore menolak akses baca. Pastikan rules mengizinkan <code>read, write: if request.auth != null;</code>.
          </p>
        </div>
      ` : `
        <div style="background:#d4edda;color:#155724;border:1px solid #c3e6cb;padding:1rem;border-radius:8px;margin-bottom:1rem;">
          <h4 style="color:#155724;display:flex;align-items:center;gap:0.5rem;margin:0 0 0.5rem 0;">
            <span class="material-symbols-outlined">cloud_done</span> Database Online & Terhubung
          </h4>
          <p style="margin:0;font-size:0.875rem;">
            Koneksi ke Firestore Database dan Storage berhasil. Semua perubahan akan langsung tersimpan permanen.
          </p>
        </div>
      `}
      <div class="field-row">
        <button class="btn-primary" onclick="window._goToSection('provider')">
          <span class="material-symbols-outlined" style="font-size:18px;">badge</span> Kelola Provider
        </button>
        <button class="btn-primary" onclick="window._goToSection('hero')">
          <span class="material-symbols-outlined" style="font-size:18px;">image</span> Kelola Hero Foto
        </button>
        <button class="btn-secondary" onclick="window._goToSection('gallery')">
          <span class="material-symbols-outlined" style="font-size:18px;">photo_camera</span> Kelola Galeri
        </button>
      </div>
    </div>
  `;
}

// ----- 2. IDENTITAS PROVIDER (DENGAN UPLOAD FOTO) -----
function renderProvider() {
  const content = $('#admin-content');
  if (!content) return;

  const p = siteData.provider || getDefaultProvider();
  content.innerHTML = `
    <div class="content-header">
      <h3>Identitas Provider Resmi</h3>
      <p>Kelola nama pengelola, peranan, deskripsi, kontak, dan foto profil provider resmi yang tampil di website publik.</p>
    </div>
    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">badge</span> Data Provider &amp; Foto Profil</h4>
      <form id="form-provider">
        <div class="field-row">
          <div class="field-group">
            <label for="prov-name">Nama Provider / Pengelola</label>
            <input type="text" id="prov-name" value="${esc(p.name || '')}" placeholder="Contoh: Pengelola Resmi Citumang" required/>
          </div>
          <div class="field-group">
            <label for="prov-role">Gelar / Peran Resmi</label>
            <input type="text" id="prov-role" value="${esc(p.role || '')}" placeholder="Official Provider & Tour Coordinator"/>
          </div>
        </div>

        <div class="field-group">
          <label for="prov-desc">Deskripsi Pelayanan Provider</label>
          <textarea id="prov-desc" rows="3" placeholder="Deskripsi pelayanan resmi...">${esc(p.description || '')}</textarea>
        </div>

        <div class="field-group">
          <label>Foto Profil Provider (Format PNG Transparan / WebP direkomendasikan)</label>
          <div class="upload-zone" id="prov-upload-zone">
            <span class="material-symbols-outlined" style="font-size:36px;color:var(--admin-accent);">cloud_upload</span>
            <p style="font-weight:600;margin:0.25rem 0;font-size:0.875rem;">Klik untuk pilih foto dari perangkat</p>
            <p style="font-size:0.75rem;color:var(--admin-text-secondary);">Maksimal 10MB (PNG, JPG, WEBP). Foto akan otomatis diunggah ke Firebase Storage.</p>
            <input type="file" id="prov-file-input" accept="image/*" style="display:none;"/>
            <img src="${esc(p.image || '/images/provider/provider.png')}" id="prov-img-preview" class="upload-preview" alt="Preview Foto Provider"/>
            <div id="prov-upload-status" class="upload-status"></div>
          </div>
        </div>

        <div class="field-group">
          <label for="prov-img-url">URL / Path Foto Provider (Otomatis terisi setelah upload)</label>
          <input type="text" id="prov-img-url" value="${esc(p.image || '')}" placeholder="https://... atau /images/provider/provider.png"/>
        </div>

        <div class="btn-group">
          <button type="submit" class="btn-primary" id="btn-save-provider">
            <span class="material-symbols-outlined" style="font-size:18px;">save</span>
            Simpan Perubahan Provider
          </button>
        </div>
        <div class="status-msg" id="provider-status"></div>
      </form>
    </div>
  `;

  // Attach Image Uploader
  setupUploader({
    zoneId: 'prov-upload-zone',
    inputId: 'prov-file-input',
    urlInputId: 'prov-img-url',
    previewId: 'prov-img-preview',
    statusId: 'prov-upload-status',
    folder: 'provider'
  });

  // Submit Handler
  $('#form-provider')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#btn-save-provider');
    if (btn) btn.disabled = true;

    const updatedData = {
      name: $('#prov-name')?.value.trim() || '',
      role: $('#prov-role')?.value.trim() || '',
      description: $('#prov-desc')?.value.trim() || '',
      image: $('#prov-img-url')?.value.trim() || p.image || '/images/provider/provider.png',
      imageWebp: $('#prov-img-url')?.value.trim() || p.image || '/images/provider/provider.png',
      updatedAt: serverTimestamp()
    };

    await saveDoc('siteConfig', 'provider', updatedData, 'provider-status');
    if (btn) btn.disabled = false;
  });
}

// ----- 3. HERO & BERANDA (DENGAN UPLOAD FOTO DESKTOP & MOBILE) -----
function renderHero() {
  const content = $('#admin-content');
  if (!content) return;

  const h = siteData.hero || getDefaultHero();
  content.innerHTML = `
    <div class="content-header">
      <h3>Hero &amp; Foto Beranda Utama</h3>
      <p>Kelola judul, sub-judul, dan 2 foto responsive (Desktop Landscape &amp; Mobile Portrait) di bagian paling awal website.</p>
    </div>
    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">image</span> Konfigurasi Hero Utama</h4>
      <form id="form-hero">
        <div class="field-group">
          <label for="hero-title">Judul Utama Hero (Mendukung HTML &lt;span&gt;)</label>
          <input type="text" id="hero-title" value="${esc(h.headline || '')}" placeholder="Temukan Keindahan &lt;span...&gt;Citumang&lt;/span&gt;" required/>
        </div>

        <div class="field-group">
          <label for="hero-sub">Sub-judul Hero</label>
          <textarea id="hero-sub" rows="3" placeholder="Rasakan kesegaran air jernih alami...">${esc(h.subtitle || '')}</textarea>
        </div>

        <div class="field-row">
          <!-- Foto Desktop -->
          <div class="field-group">
            <label>1. Foto Hero Desktop (Landscape PC/Laptop)</label>
            <div class="upload-zone" id="hero-desk-zone">
              <span class="material-symbols-outlined" style="font-size:32px;color:var(--admin-accent);">desktop_windows</span>
              <p style="font-weight:600;margin:0.25rem 0;font-size:0.8125rem;">Upload Foto Landscape PC</p>
              <input type="file" id="hero-desk-file" accept="image/*" style="display:none;"/>
              <img src="${esc(h.desktopImage || '/images/citumang/hero.jpg')}" id="hero-desk-preview" class="upload-preview" alt="Preview Foto Desktop"/>
              <div id="hero-desk-status" class="upload-status"></div>
            </div>
            <input type="text" id="hero-desk-url" value="${esc(h.desktopImage || '')}" placeholder="/images/citumang/hero.jpg" style="margin-top:0.5rem;"/>
          </div>

          <!-- Foto Mobile -->
          <div class="field-group">
            <label>2. Foto Hero Mobile (Portrait HP)</label>
            <div class="upload-zone" id="hero-mob-zone">
              <span class="material-symbols-outlined" style="font-size:32px;color:var(--admin-accent);">smartphone</span>
              <p style="font-weight:600;margin:0.25rem 0;font-size:0.8125rem;">Upload Foto Portrait HP</p>
              <input type="file" id="hero-mob-file" accept="image/*" style="display:none;"/>
              <img src="${esc(h.mobileImage || '/images/citumang/hero-mobile.jpg')}" id="hero-mob-preview" class="upload-preview" alt="Preview Foto Mobile"/>
              <div id="hero-mob-status" class="upload-status"></div>
            </div>
            <input type="text" id="hero-mob-url" value="${esc(h.mobileImage || '')}" placeholder="/images/citumang/hero-mobile.jpg" style="margin-top:0.5rem;"/>
          </div>
        </div>

        <div class="btn-group">
          <button type="submit" class="btn-primary" id="btn-save-hero">
            <span class="material-symbols-outlined" style="font-size:18px;">save</span>
            Simpan Perubahan Hero
          </button>
        </div>
        <div class="status-msg" id="hero-status"></div>
      </form>
    </div>
  `;

  // Attach Desktop Uploader
  setupUploader({
    zoneId: 'hero-desk-zone',
    inputId: 'hero-desk-file',
    urlInputId: 'hero-desk-url',
    previewId: 'hero-desk-preview',
    statusId: 'hero-desk-status',
    folder: 'hero'
  });

  // Attach Mobile Uploader
  setupUploader({
    zoneId: 'hero-mob-zone',
    inputId: 'hero-mob-file',
    urlInputId: 'hero-mob-url',
    previewId: 'hero-mob-preview',
    statusId: 'hero-mob-status',
    folder: 'hero'
  });

  // Submit Handler
  $('#form-hero')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#btn-save-hero');
    if (btn) btn.disabled = true;

    const updatedData = {
      headline: $('#hero-title')?.value.trim() || '',
      subtitle: $('#hero-sub')?.value.trim() || '',
      desktopImage: $('#hero-desk-url')?.value.trim() || h.desktopImage || '/images/citumang/hero.jpg',
      mobileImage: $('#hero-mob-url')?.value.trim() || h.mobileImage || '/images/citumang/hero-mobile.jpg',
      updatedAt: serverTimestamp()
    };

    await saveDoc('siteConfig', 'hero', updatedData, 'hero-status');
    if (btn) btn.disabled = false;
  });
}

// ----- 4. INFORMASI WEBSITE -----
function renderInfo() {
  const content = $('#admin-content');
  if (!content) return;

  const d = siteData.info || getDefaultInfo();
  content.innerHTML = `
    <div class="content-header">
      <h3>Informasi Umum Website</h3>
      <p>Kelola nama, kontak resmi, alamat, dan media sosial website Citumang.</p>
    </div>
    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">info</span> Data Informasi</h4>
      <form id="form-info">
        <div class="field-row">
          <div class="field-group">
            <label for="info-name">Nama Wisata</label>
            <input type="text" id="info-name" value="${esc(d.name || '')}" placeholder="Citumang Pangandaran" required/>
          </div>
          <div class="field-group">
            <label for="info-tagline">Tagline</label>
            <input type="text" id="info-tagline" value="${esc(d.tagline || '')}" placeholder="Body Rafting & Wisata Alam"/>
          </div>
        </div>
        <div class="field-group">
          <label for="info-desc">Deskripsi Resmi</label>
          <textarea id="info-desc" rows="3" placeholder="Deskripsi resmi wisata...">${esc(d.description || '')}</textarea>
        </div>
        <div class="field-group">
          <label for="info-address">Alamat Lengkap (Acuan Resmi)</label>
          <input type="text" id="info-address" value="${esc(d.address || '')}" placeholder="Citumang, Desa Bojong, Kecamatan Parigi, Kabupaten Pangandaran, Jawa Barat"/>
        </div>
        <div class="field-row">
          <div class="field-group">
            <label for="info-wa">Nomor WhatsApp Resmi (Contoh: 6281221325957)</label>
            <input type="text" id="info-wa" value="${esc(d.whatsapp || '')}" placeholder="6281221325957"/>
          </div>
          <div class="field-group">
            <label for="info-ig">Instagram Resmi</label>
            <input type="text" id="info-ig" value="${esc(d.instagram || '')}" placeholder="@citumangpangandaran01"/>
          </div>
        </div>
        <div class="field-group">
          <label for="info-tiktok">TikTok Resmi</label>
          <input type="text" id="info-tiktok" value="${esc(d.tiktok || '')}" placeholder="@citumangpangandaran01"/>
        </div>
        <div class="btn-group">
          <button type="submit" class="btn-primary" id="btn-save-info">
            <span class="material-symbols-outlined" style="font-size:18px;">save</span>
            Simpan Perubahan
          </button>
        </div>
        <div class="status-msg" id="info-status"></div>
      </form>
    </div>
  `;

  $('#form-info')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#btn-save-info');
    if (btn) btn.disabled = true;

    await saveDoc(
      'siteConfig',
      'info',
      {
        name: $('#info-name')?.value.trim() || '',
        tagline: $('#info-tagline')?.value.trim() || '',
        description: $('#info-desc')?.value.trim() || '',
        address: $('#info-address')?.value.trim() || '',
        whatsapp: $('#info-wa')?.value.trim() || '',
        instagram: $('#info-ig')?.value.trim() || '',
        tiktok: $('#info-tiktok')?.value.trim() || '',
        updatedAt: serverTimestamp()
      },
      'info-status'
    );
    if (btn) btn.disabled = false;
  });
}

// ----- 5. HARGA & PAKET -----
function renderPricing() {
  const content = $('#admin-content');
  if (!content) return;

  const d = siteData.pricing || getDefaultPricing();
  const pkgs = d.packages || [];

  content.innerHTML = `
    <div class="content-header">
      <h3>Harga &amp; Paket Wisata</h3>
      <p>Kelola harga mulai dan daftar paket resmi body rafting Citumang.</p>
    </div>
    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">payments</span> Harga Mulai</h4>
      <form id="form-pricing">
        <div class="field-group">
          <label for="pricing-start">Teks Harga Mulai</label>
          <input type="text" id="pricing-start" value="${esc(d.startingPrice || 'Mulai dari Rp69.000')}" placeholder="Mulai dari Rp69.000" required/>
        </div>
        <div class="btn-group">
          <button type="submit" class="btn-primary" id="btn-save-pricing">
            <span class="material-symbols-outlined" style="font-size:18px;">save</span>
            Simpan Harga Mulai
          </button>
        </div>
        <div class="status-msg" id="pricing-status"></div>
      </form>
    </div>

    <div class="admin-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h4><span class="material-symbols-outlined" style="font-size:20px;">inventory</span> Daftar Paket Reservasi</h4>
        <button class="btn-primary" id="btn-add-pkg">
          <span class="material-symbols-outlined" style="font-size:18px;">add</span> Tambah Paket
        </button>
      </div>
      <div class="item-list" id="package-list">
        ${pkgs.map((pkg, i) => `
          <div class="list-item">
            <span style="font-size:0.9375rem;font-weight:500;">${esc(pkg)}</span>
            <div class="item-actions">
              <button class="btn-icon" onclick="window._editPackage(${i})" title="Edit">
                <span class="material-symbols-outlined" style="font-size:18px;">edit</span>
              </button>
              <button class="btn-icon" style="color:var(--admin-danger);" onclick="window._deletePackage(${i})" title="Hapus">
                <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  $('#form-pricing')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#btn-save-pricing');
    if (btn) btn.disabled = true;

    await saveDoc(
      'siteConfig',
      'pricing',
      {
        startingPrice: $('#pricing-start')?.value.trim() || 'Mulai dari Rp69.000',
        packages: siteData.pricing.packages || [],
        updatedAt: serverTimestamp()
      },
      'pricing-status'
    );
    if (btn) btn.disabled = false;
  });

  $('#btn-add-pkg')?.addEventListener('click', () => {
    openModal('Tambah Paket Wisata', `
      <div class="field-group">
        <label for="modal-pkg-name">Nama Paket</label>
        <input type="text" id="modal-pkg-name" placeholder="Contoh: Paket Body Rafting Lengkap (Mulai dari Rp69.000)"/>
      </div>
    `, async () => {
      const val = $('#modal-pkg-name')?.value.trim();
      if (!val) return;
      if (!siteData.pricing.packages) siteData.pricing.packages = [];
      siteData.pricing.packages.push(val);
      await saveDoc('siteConfig', 'pricing', { packages: siteData.pricing.packages });
      closeModal();
      renderPricing();
    });
  });
}

// Window helpers for inline onclick
window._editPackage = (index) => {
  const current = siteData.pricing.packages[index] || '';
  openModal('Edit Paket Wisata', `
    <div class="field-group">
      <label for="modal-pkg-name">Nama Paket</label>
      <input type="text" id="modal-pkg-name" value="${esc(current)}"/>
    </div>
  `, async () => {
    const val = $('#modal-pkg-name')?.value.trim();
    if (!val) return;
    siteData.pricing.packages[index] = val;
    await saveDoc('siteConfig', 'pricing', { packages: siteData.pricing.packages });
    closeModal();
    renderPricing();
  });
};

window._deletePackage = async (index) => {
  if (!confirm('Hapus paket ini dari daftar reservasi?')) return;
  siteData.pricing.packages.splice(index, 1);
  await saveDoc('siteConfig', 'pricing', { packages: siteData.pricing.packages });
  renderPricing();
};

// ----- 6. JAM OPERASIONAL -----
function renderHours() {
  const content = $('#admin-content');
  if (!content) return;

  const d = siteData.hours || getDefaultHours();
  content.innerHTML = `
    <div class="content-header">
      <h3>Jam Operasional</h3>
      <p>Kelola jadwal buka dan tutup resmi Citumang Pangandaran.</p>
    </div>
    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">schedule</span> Jam Operasional Resmi</h4>
      <form id="form-hours">
        <div class="field-group">
          <label for="hours-days">Hari Buka</label>
          <input type="text" id="hours-days" value="${esc(d.days || 'Senin - Minggu')}" placeholder="Senin - Minggu" required/>
        </div>
        <div class="field-row">
          <div class="field-group">
            <label for="hours-open">Jam Buka</label>
            <input type="text" id="hours-open" value="${esc(d.open || '07:00')}" placeholder="07:00" required/>
          </div>
          <div class="field-group">
            <label for="hours-close">Jam Tutup</label>
            <input type="text" id="hours-close" value="${esc(d.close || '16:30')}" placeholder="16:30" required/>
          </div>
          <div class="field-group">
            <label for="hours-tz">Zona Waktu</label>
            <input type="text" id="hours-tz" value="${esc(d.timezone || 'WIB')}" placeholder="WIB" required/>
          </div>
        </div>
        <div class="btn-group">
          <button type="submit" class="btn-primary" id="btn-save-hours">
            <span class="material-symbols-outlined" style="font-size:18px;">save</span>
            Simpan Jam Operasional
          </button>
        </div>
        <div class="status-msg" id="hours-status"></div>
      </form>
    </div>
  `;

  $('#form-hours')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#btn-save-hours');
    if (btn) btn.disabled = true;

    await saveDoc(
      'siteConfig',
      'hours',
      {
        days: $('#hours-days')?.value.trim() || 'Senin - Minggu',
        open: $('#hours-open')?.value.trim() || '07:00',
        close: $('#hours-close')?.value.trim() || '16:30',
        timezone: $('#hours-tz')?.value.trim() || 'WIB',
        updatedAt: serverTimestamp()
      },
      'hours-status'
    );
    if (btn) btn.disabled = false;
  });
}

// ----- 7. FASILITAS -----
function renderFacilities() {
  const content = $('#admin-content');
  if (!content) return;

  const facs = siteData.facilities || [];
  content.innerHTML = `
    <div class="content-header">
      <h3>Daftar Fasilitas Resmi</h3>
      <p>Kelola 9 fasilitas resmi yang didapatkan wisatawan di Citumang.</p>
    </div>
    <div class="admin-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h4><span class="material-symbols-outlined" style="font-size:20px;">spa</span> Fasilitas (${facs.length})</h4>
        <button class="btn-primary" id="btn-add-fac">
          <span class="material-symbols-outlined" style="font-size:18px;">add</span> Tambah Fasilitas
        </button>
      </div>
      <div class="item-list">
        ${facs.map((f, i) => `
          <div class="list-item">
            <div style="display:flex;align-items:center;gap:0.75rem;">
              <span class="material-symbols-outlined" style="font-size:24px;color:var(--admin-accent);">${esc(f.icon || 'check_circle')}</span>
              <div>
                <div style="font-weight:600;font-size:0.9375rem;">${esc(f.title)}</div>
                <div style="font-size:0.8125rem;color:var(--admin-text-secondary);">${esc(f.description || '')}</div>
              </div>
            </div>
            <div class="item-actions">
              <button class="btn-icon" onclick="window._editFacility(${i})" title="Edit">
                <span class="material-symbols-outlined" style="font-size:18px;">edit</span>
              </button>
              <button class="btn-icon" style="color:var(--admin-danger);" onclick="window._deleteFacility(${i})" title="Hapus">
                <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  $('#btn-add-fac')?.addEventListener('click', () => {
    openModal('Tambah Fasilitas', `
      <div class="field-group">
        <label for="modal-fac-title">Nama Fasilitas</label>
        <input type="text" id="modal-fac-title" placeholder="Contoh: Kolam Terapi Ikan"/>
      </div>
      <div class="field-group">
        <label for="modal-fac-icon">Nama Ikon Material Symbol</label>
        <input type="text" id="modal-fac-icon" placeholder="water_drop, kayaking, restaurant, badge..."/>
      </div>
      <div class="field-group">
        <label for="modal-fac-desc">Deskripsi Singkat</label>
        <textarea id="modal-fac-desc" rows="2" placeholder="Deskripsi fasilitas..."></textarea>
      </div>
    `, async () => {
      const data = {
        title: $('#modal-fac-title')?.value.trim() || '',
        icon: $('#modal-fac-icon')?.value.trim() || 'check_circle',
        description: $('#modal-fac-desc')?.value.trim() || ''
      };
      if (!data.title) return;

      if (db) {
        const docRef = await addDoc(collection(db, 'facilities'), {
          ...data,
          createdAt: serverTimestamp()
        });
        siteData.facilities.push({ id: docRef.id, ...data });
      } else {
        siteData.facilities.push({ id: 'local_' + Date.now(), ...data });
      }
      closeModal();
      renderFacilities();
    });
  });
}

window._editFacility = (index) => {
  const f = siteData.facilities[index];
  if (!f) return;
  openModal('Edit Fasilitas', `
    <div class="field-group">
      <label for="modal-fac-title">Nama Fasilitas</label>
      <input type="text" id="modal-fac-title" value="${esc(f.title)}"/>
    </div>
    <div class="field-group">
      <label for="modal-fac-icon">Nama Ikon Material Symbol</label>
      <input type="text" id="modal-fac-icon" value="${esc(f.icon || 'check_circle')}"/>
    </div>
    <div class="field-group">
      <label for="modal-fac-desc">Deskripsi Singkat</label>
      <textarea id="modal-fac-desc" rows="2">${esc(f.description || '')}</textarea>
    </div>
  `, async () => {
    const data = {
      title: $('#modal-fac-title')?.value.trim() || '',
      icon: $('#modal-fac-icon')?.value.trim() || 'check_circle',
      description: $('#modal-fac-desc')?.value.trim() || ''
    };
    if (!data.title) return;

    if (f.id && !f.id.startsWith('local_') && db) {
      await updateDoc(doc(db, 'facilities', f.id), { ...data, updatedAt: serverTimestamp() });
      siteData.facilities[index] = { ...f, ...data };
    } else {
      siteData.facilities[index] = { ...f, ...data };
    }
    closeModal();
    renderFacilities();
  });
};

window._deleteFacility = async (index) => {
  const f = siteData.facilities[index];
  if (!confirm(`Hapus fasilitas "${f.title}"?`)) return;
  if (f.id && !f.id.startsWith('local_') && db) {
    await deleteDoc(doc(db, 'facilities', f.id)).catch(() => null);
  }
  siteData.facilities.splice(index, 1);
  renderFacilities();
};

// ----- 8. AKTIVITAS (DENGAN UPLOAD FOTO) -----
function renderActivities() {
  const content = $('#admin-content');
  if (!content) return;

  const acts = siteData.activities || [];
  content.innerHTML = `
    <div class="content-header">
      <h3>Aktivitas Unggulan</h3>
      <p>Kelola kartu aktivitas wisata body rafting, gua karst, dan renang sungai.</p>
    </div>
    <div class="admin-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h4><span class="material-symbols-outlined" style="font-size:20px;">kayaking</span> Daftar Aktivitas (${acts.length})</h4>
        <button class="btn-primary" id="btn-add-act">
          <span class="material-symbols-outlined" style="font-size:18px;">add</span> Tambah Aktivitas
        </button>
      </div>
      <div class="item-list">
        ${acts.map((a, i) => `
          <div class="list-item">
            <div style="display:flex;align-items:center;gap:1rem;">
              <img src="${esc(a.image)}" alt="${esc(a.title)}" style="width:64px;height:48px;border-radius:6px;object-fit:cover;flex-shrink:0;border:1px solid var(--admin-border);" onerror="this.src='/images/citumang/hero.jpg';"/>
              <div>
                <div style="font-weight:600;font-size:0.9375rem;">${esc(a.title)} <span style="font-size:0.75rem;padding:2px 8px;border-radius:999px;background:var(--admin-surface);color:var(--admin-accent);font-weight:600;margin-left:0.5rem;">${esc(a.tag || '')}</span></div>
                <div style="font-size:0.8125rem;color:var(--admin-text-secondary);">${esc(a.description || '')}</div>
                <div style="font-size:0.75rem;color:var(--admin-text-secondary);margin-top:2px;">Rute / Keterangan: <strong>${esc(a.duration || '-')}</strong></div>
              </div>
            </div>
            <div class="item-actions">
              <button class="btn-icon" onclick="window._editActivity(${i})" title="Edit">
                <span class="material-symbols-outlined" style="font-size:18px;">edit</span>
              </button>
              <button class="btn-icon" style="color:var(--admin-danger);" onclick="window._deleteActivity(${i})" title="Hapus">
                <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  $('#btn-add-act')?.addEventListener('click', () => openActivityModal(null, false));
}

function openActivityModal(act, isEdit = false, index = -1) {
  const a = act || {};
  openModal(
    isEdit ? 'Edit Aktivitas' : 'Tambah Aktivitas',
    `
    <div class="field-row">
      <div class="field-group">
        <label for="modal-act-title">Judul Aktivitas</label>
        <input type="text" id="modal-act-title" value="${esc(a.title || '')}" placeholder="Contoh: Full Body Rafting ±1,5 KM" required/>
      </div>
      <div class="field-group">
        <label for="modal-act-tag">Badge / Tag</label>
        <input type="text" id="modal-act-tag" value="${esc(a.tag || '')}" placeholder="Mulai dari Rp69.000"/>
      </div>
    </div>
    <div class="field-group">
      <label for="modal-act-desc">Deskripsi Aktivitas</label>
      <textarea id="modal-act-desc" rows="3" placeholder="Deskripsi aktivitas...">${esc(a.description || '')}</textarea>
    </div>
    <div class="field-group">
      <label for="modal-act-dur">Keterangan Rute</label>
      <input type="text" id="modal-act-dur" value="${esc(a.duration || '')}" placeholder="Contoh: Rute ±1,5 KM"/>
    </div>
    <div class="field-group">
      <label>Foto Aktivitas</label>
      <div class="upload-zone" id="modal-act-zone">
        <span class="material-symbols-outlined" style="font-size:28px;color:var(--admin-accent);">cloud_upload</span>
        <p style="font-weight:600;font-size:0.8125rem;">Upload Foto Baru ke Firebase Storage</p>
        <input type="file" id="modal-act-file" accept="image/*" style="display:none;"/>
        <img src="${esc(a.image || '')}" id="modal-act-preview" class="upload-preview" style="${a.image ? '' : 'display:none;'}" alt="Preview"/>
        <div id="modal-act-status" class="upload-status"></div>
      </div>
      <input type="text" id="modal-act-img" value="${esc(a.image || '')}" placeholder="/images/citumang/citumang-04.jpg" style="margin-top:0.5rem;"/>
    </div>
  `,
    async () => {
      const data = {
        title: $('#modal-act-title')?.value.trim() || '',
        tag: $('#modal-act-tag')?.value.trim() || '',
        description: $('#modal-act-desc')?.value.trim() || '',
        duration: $('#modal-act-dur')?.value.trim() || '',
        image: $('#modal-act-img')?.value.trim() || '/images/citumang/hero.jpg'
      };
      if (!data.title) return;

      if (isEdit && a.id && !a.id.startsWith('local_') && db) {
        await updateDoc(doc(db, 'activities', a.id), {
          ...data,
          updatedAt: serverTimestamp()
        });
        siteData.activities[index] = { ...a, ...data };
      } else if (db) {
        const docRef = await addDoc(collection(db, 'activities'), {
          ...data,
          createdAt: serverTimestamp()
        });
        siteData.activities.push({ id: docRef.id, ...data });
      } else {
        siteData.activities.push({ id: 'local_' + Date.now(), ...data });
      }

      closeModal();
      renderActivities();
    }
  );

  setupUploader({
    zoneId: 'modal-act-zone',
    inputId: 'modal-act-file',
    urlInputId: 'modal-act-img',
    previewId: 'modal-act-preview',
    statusId: 'modal-act-status',
    folder: 'activities'
  });
}

window._editActivity = (index) => {
  openActivityModal(siteData.activities[index], true, index);
};

window._deleteActivity = async (index) => {
  const a = siteData.activities[index];
  if (!confirm(`Hapus aktivitas "${a.title}"?`)) return;
  if (a.id && !a.id.startsWith('local_') && db) {
    await deleteDoc(doc(db, 'activities', a.id)).catch(() => null);
  }
  siteData.activities.splice(index, 1);
  renderActivities();
};

// ----- 9. FOTO / GALLERY (DENGAN UPLOAD FOTO) -----
function renderGallery() {
  const content = $('#admin-content');
  if (!content) return;

  const items = siteData.gallery
    .map(
      (g, i) => `
    <div class="gallery-item" title="${esc(g.alt || '')}">
      <img src="${esc(g.image)}" alt="${esc(g.alt || '')}" loading="lazy" onerror="this.src='/images/citumang/hero.jpg';"/>
      <div class="gallery-overlay">
        <button class="btn-icon" style="color:#fff;background:rgba(255,255,255,0.2);margin-right:0.5rem;" onclick="window._editGallery(${i})" title="Edit">
          <span class="material-symbols-outlined" style="font-size:20px;">edit</span>
        </button>
        <button class="btn-icon" style="color:#fff;background:rgba(186,26,26,0.6);" onclick="window._deleteGallery(${i})" title="Hapus">
          <span class="material-symbols-outlined" style="font-size:20px;">delete</span>
        </button>
      </div>
      <div class="gallery-info">
        <div class="gallery-title">${esc(g.title || 'Foto Citumang')}</div>
      </div>
    </div>
  `
    )
    .join('');

  content.innerHTML = `
    <div class="content-header">
      <h3>Foto &amp; Galeri Website</h3>
      <p>Kelola koleksi foto dokumentasi nyata wisatawan di Citumang Pangandaran.</p>
    </div>
    <div class="admin-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
        <h4><span class="material-symbols-outlined" style="font-size:20px;">photo_library</span> Galeri (${siteData.gallery.length} foto)</h4>
        <button class="btn-primary" id="btn-add-gal">
          <span class="material-symbols-outlined" style="font-size:18px;">add_photo_alternate</span> Upload Foto Baru
        </button>
      </div>
      <div class="gallery-grid">
        ${items}
      </div>
    </div>
  `;

  $('#btn-add-gal')?.addEventListener('click', () => openGalleryModal(null, false));
}

function openGalleryModal(item, isEdit = false, index = -1) {
  const g = item || {};
  openModal(
    isEdit ? 'Edit Foto Galeri' : 'Upload Foto Galeri Baru',
    `
    <div class="field-group">
      <label for="modal-gal-title">Judul Foto</label>
      <input type="text" id="modal-gal-title" value="${esc(g.title || '')}" placeholder="Contoh: Kesegaran Aliran Sungai Citumang" required/>
    </div>
    <div class="field-row">
      <div class="field-group">
        <label for="modal-gal-cat">Kategori</label>
        <input type="text" id="modal-gal-cat" value="${esc(g.category || 'Wisata Alam')}" placeholder="Wisata Alam / Rafting"/>
      </div>
      <div class="field-group">
        <label for="modal-gal-alt">Teks Alt (SEO)</label>
        <input type="text" id="modal-gal-alt" value="${esc(g.alt || '')}" placeholder="Deskripsi gambar untuk SEO"/>
      </div>
    </div>
    <div class="field-group">
      <label>Foto Galeri (Upload ke Firebase Storage)</label>
      <div class="upload-zone" id="modal-gal-zone">
        <span class="material-symbols-outlined" style="font-size:32px;color:var(--admin-accent);">add_photo_alternate</span>
        <p style="font-weight:600;font-size:0.8125rem;">Klik untuk pilih file dari perangkat</p>
        <input type="file" id="modal-gal-file" accept="image/*" style="display:none;"/>
        <img src="${esc(g.image || '')}" id="modal-gal-preview" class="upload-preview" style="${g.image ? '' : 'display:none;'}" alt="Preview Foto"/>
        <div id="modal-gal-status" class="upload-status"></div>
      </div>
      <input type="text" id="modal-gal-img" value="${esc(g.image || '')}" placeholder="/images/citumang/citumang-01.jpg" style="margin-top:0.5rem;"/>
    </div>
  `,
    async () => {
      const data = {
        title: $('#modal-gal-title')?.value.trim() || 'Foto Citumang',
        category: $('#modal-gal-cat')?.value.trim() || 'Wisata Alam',
        alt: $('#modal-gal-alt')?.value.trim() || 'Dokumentasi Wisata Citumang Pangandaran',
        image: $('#modal-gal-img')?.value.trim() || '/images/citumang/hero.jpg'
      };

      if (isEdit && g.id && !g.id.startsWith('local_') && db) {
        await updateDoc(doc(db, 'gallery', g.id), { ...data, updatedAt: serverTimestamp() });
        siteData.gallery[index] = { ...g, ...data };
      } else if (db) {
        const docRef = await addDoc(collection(db, 'gallery'), {
          ...data,
          createdAt: serverTimestamp()
        });
        siteData.gallery.push({ id: docRef.id, ...data });
      } else {
        siteData.gallery.push({ id: 'local_' + Date.now(), ...data });
      }

      closeModal();
      renderGallery();
    }
  );

  setupUploader({
    zoneId: 'modal-gal-zone',
    inputId: 'modal-gal-file',
    urlInputId: 'modal-gal-img',
    previewId: 'modal-gal-preview',
    statusId: 'modal-gal-status',
    folder: 'gallery'
  });
}

window._editGallery = (index) => {
  openGalleryModal(siteData.gallery[index], true, index);
};

window._deleteGallery = async (index) => {
  const g = siteData.gallery[index];
  if (!confirm(`Hapus foto "${g.title}"?`)) return;
  if (g.id && !g.id.startsWith('local_') && db) {
    await deleteDoc(doc(db, 'gallery', g.id)).catch(() => null);
  }
  siteData.gallery.splice(index, 1);
  renderGallery();
};

window._goToSection = (sectionName) => {
  $$('.sidebar-nav-item').forEach((i) => i.classList.remove('active'));
  $(`.sidebar-nav-item[data-section="${sectionName}"]`)?.classList.add('active');
  currentSection = sectionName;
  renderSection(sectionName);
};

// ===== HELPER: IMAGE UPLOADER HANDLER =====
function setupUploader({ zoneId, inputId, urlInputId, previewId, statusId, folder }) {
  const zone = $(`#${zoneId}`);
  const input = $(`#${inputId}`);
  const urlInput = $(`#${urlInputId}`);
  const preview = $(`#${previewId}`);
  const status = $(`#${statusId}`);

  zone?.addEventListener('click', (e) => {
    if (e.target !== input) input?.click();
  });

  input?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (status) {
      status.className = 'upload-status loading';
      status.textContent = '⏳ Mengunggah foto ke Firebase Storage...';
    }

    try {
      const downloadUrl = await uploadImageToStorage(file, folder);
      if (urlInput) urlInput.value = downloadUrl;
      if (preview) {
        preview.src = downloadUrl;
        preview.style.display = 'block';
      }
      if (status) {
        status.className = 'upload-status success';
        status.textContent = '✓ Berhasil diunggah ke Firebase Storage!';
      }
    } catch (err) {
      console.error('[Upload Error]:', err);
      if (status) {
        status.className = 'upload-status error';
        status.textContent = `✗ Gagal upload: ${err.message || 'Periksa Firebase Storage bucket/rules'}`;
      }
    }
  });
}

// ===== HELPER: MODAL CONTROLLERS =====
function openModal(title, bodyHtml, onSave) {
  const modal = $('#edit-modal');
  const modalContent = $('#edit-modal-content');
  if (!modal || !modalContent) return;

  modalContent.innerHTML = `
    <h3>${title}</h3>
    ${bodyHtml}
    <div class="modal-actions">
      <button class="btn-secondary" id="modal-cancel" type="button">Batal</button>
      <button class="btn-primary" id="modal-save" type="button">
        <span class="material-symbols-outlined" style="font-size:18px;">save</span>
        Simpan
      </button>
    </div>
  `;
  modal.classList.add('show');

  $('#modal-cancel')?.addEventListener('click', closeModal);
  $('#modal-save')?.addEventListener('click', async () => {
    const saveBtn = $('#modal-save');

    if (!firebaseStatus.firestoreConnected) {
      alert('Gagal: Tidak ada koneksi aktif ke Firestore (Offline / Error Rules). Operasi dibatalkan.');
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="spinner"></span> Menyimpan...';
    }
    try {
      await onSave();
    } catch (err) {
      console.error('[Modal Save Error]:', err);
      alert('Gagal menyimpan: ' + (err.message || 'Kesalahan jaringan.'));
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Simpan';
      }
    }
  });
}

function closeModal() {
  const modal = $('#edit-modal');
  if (modal) modal.classList.remove('show');
}

// ===== HELPER: PERSISTENCE TO FIRESTORE =====
async function saveDoc(collName, docId, data, statusId) {
  const statusEl = statusId ? $(`#${statusId}`) : null;

  if (!db || !firebaseStatus.firestoreConnected) {
    if (statusEl) {
      statusEl.className = 'status-msg error';
      statusEl.textContent = '✗ Gagal: Tidak ada koneksi aktif ke Firestore (Offline / Error Rules).';
    }
    const err = new Error('Firestore is offline or permission denied');
    throw err;
  }

  try {
    await setDoc(doc(db, collName, docId), data, { merge: true });
    if (collName === 'siteConfig') {
      siteData[docId] = { ...siteData[docId], ...data };
    }
    if (statusEl) {
      statusEl.className = 'status-msg success';
      statusEl.textContent = '✓ Berhasil disimpan secara permanen ke server!';
      setTimeout(() => {
        statusEl.className = 'status-msg';
      }, 3500);
    }
  } catch (err) {
    console.error('[Firestore Save Error]:', err);
    if (statusEl) {
      statusEl.className = 'status-msg error';
      statusEl.textContent = `✗ Gagal menyimpan ke server: ${err.message || err.code || 'Izin akses ditolak'}`;
    }
    throw err;
  }
}

// ===== HELPER: XSS ESCAPING =====
function esc(str) {
  if (str === null || str === undefined) return '';
  if (typeof str !== 'string') return str || '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Inisialisasi saat DOM siap
document.addEventListener('DOMContentLoaded', initAuth);
