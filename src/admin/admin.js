/**
 * Admin Panel — Citumang Pangandaran
 * Mengelola autentikasi admin dan CRUD data website via Firebase.
 * Dilengkapi proteksi sesi, timeout pencegah infinite loading, dan validasi hak akses admin.
 */

import { auth, db, initError, checkFirebaseEnv } from '../config/firebase.js';
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
  info: {},
  pricing: {},
  hours: {},
  facilities: [],
  activities: [],
  gallery: []
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

  // 2. Verifikasi opsional ke koleksi 'admins' Firestore jika ada
  if (db) {
    try {
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      if (adminDoc.exists()) {
        const data = adminDoc.data();
        if (data.role && data.role !== 'admin') {
          return { authorized: false, reason: 'Peran akun Anda bukan administrator.' };
        }
      }
    } catch {
      // Abaikan jika koleksi belum ada / rules belum diset
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

  // Tombol alternatif jika verifikasi lambat
  const fallbackTimer = setTimeout(() => {
    if (!authResolved) {
      const btnFallback = $('#btn-force-show-login');
      if (btnFallback) btnFallback.style.display = 'inline-block';
    }
  }, 2000);

  // Safety timeout: jangan biarkan loading berputar lebih dari 3.5 detik
  const safetyTimer = setTimeout(() => {
    if (!authResolved) {
      console.warn('[Admin Auth] Auth check timed out. Menampilkan form login.');
      authResolved = true;
      hideLoading();
      showLogin();
    }
  }, 3500);

  // Listener autentikasi Firebase
  try {
    onAuthStateChanged(
      auth,
      async (user) => {
        authResolved = true;
        clearTimeout(fallbackTimer);
        clearTimeout(safetyTimer);

        if (user) {
          const authCheck = await verifyAdminAccess(user);
          if (authCheck.authorized) {
            await showDashboard(user);
          } else {
            console.warn('[Admin Auth] Akses ditolak untuk akun:', user.email);
            try {
              await signOut(auth);
            } catch (e) {
              console.error(e);
            }
            showLogin();
            showLoginError(authCheck.reason);
          }
        } else {
          showLogin();
        }
      },
      (error) => {
        authResolved = true;
        clearTimeout(fallbackTimer);
        clearTimeout(safetyTimer);
        console.error('[Admin Auth Error]:', error);
        showLogin();
        showLoginError('Gagal memverifikasi status login: ' + (error.message || 'Koneksi terputus.'));
      }
    );
  } catch (err) {
    authResolved = true;
    clearTimeout(fallbackTimer);
    clearTimeout(safetyTimer);
    console.error('[Admin Auth Listener Error]:', err);
    showLogin();
    showLoginError('Terjadi kesalahan inisialisasi: ' + err.message);
  }
}

async function showDashboard(user) {
  hideLoading();
  const lp = $('#login-page');
  const dp = $('#dashboard-page');
  const emailEl = $('#admin-email');

  if (lp) lp.style.display = 'none';
  if (dp) dp.style.display = 'block';
  if (emailEl) emailEl.textContent = user.email || 'Admin';

  await loadAllData();
  renderSection(currentSection);
}

// ===== REGISTER DOM EVENT LISTENERS =====
function initDOMEvents() {
  // Tombol buka form login darurat
  $('#btn-force-show-login')?.addEventListener('click', () => {
    authResolved = true;
    showLogin();
  });

  // Form Login Submit
  $('#login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideLoginError();

    if (!auth) {
      showLoginError('Firebase Auth belum siap. Periksa konfigurasi environment variables.');
      return;
    }

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
    showLoading('Sedang keluar...');
    try {
      if (auth) await signOut(auth);
    } catch (err) {
      console.error('[Logout Error]:', err);
    } finally {
      showLogin();
    }
  });

  // Sidebar Menu Items
  $$('.sidebar-nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.sidebar-nav-item').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentSection = btn.dataset.section || 'overview';
      renderSection(currentSection);
      $('#admin-sidebar')?.classList.remove('open');
    });
  });

  // Mobile Sidebar Toggle
  $('#btn-sidebar-toggle')?.addEventListener('click', () => {
    $('#admin-sidebar')?.classList.toggle('open');
  });

  // Close modal on overlay click
  $('#edit-modal')?.addEventListener('click', (e) => {
    if (e.target === $('#edit-modal')) closeModal();
  });
}

// ===== DATA LOADING DENGAN FALLBACK AMAN =====
async function loadAllData() {
  if (!db) {
    loadDefaultData();
    return;
  }

  try {
    // 1. Info
    try {
      const infoDoc = await getDoc(doc(db, 'siteConfig', 'info'));
      siteData.info = infoDoc.exists() ? infoDoc.data() : getDefaultInfo();
    } catch (err) {
      console.warn('[Firestore] Info default digunakan:', err.message);
      siteData.info = getDefaultInfo();
    }

    // 2. Pricing
    try {
      const pricingDoc = await getDoc(doc(db, 'siteConfig', 'pricing'));
      siteData.pricing = pricingDoc.exists() ? pricingDoc.data() : getDefaultPricing();
    } catch (err) {
      console.warn('[Firestore] Pricing default digunakan:', err.message);
      siteData.pricing = getDefaultPricing();
    }

    // 3. Hours
    try {
      const hoursDoc = await getDoc(doc(db, 'siteConfig', 'hours'));
      siteData.hours = hoursDoc.exists() ? hoursDoc.data() : getDefaultHours();
    } catch (err) {
      console.warn('[Firestore] Hours default digunakan:', err.message);
      siteData.hours = getDefaultHours();
    }

    // 4. Facilities
    try {
      const facSnap = await getDocs(collection(db, 'facilities'));
      siteData.facilities = [];
      facSnap.forEach((d) => siteData.facilities.push({ id: d.id, ...d.data() }));
      if (siteData.facilities.length === 0) siteData.facilities = getDefaultFacilities();
    } catch (err) {
      console.warn('[Firestore] Facilities default digunakan:', err.message);
      siteData.facilities = getDefaultFacilities();
    }

    // 5. Activities
    try {
      const actSnap = await getDocs(collection(db, 'activities'));
      siteData.activities = [];
      actSnap.forEach((d) => siteData.activities.push({ id: d.id, ...d.data() }));
      if (siteData.activities.length === 0) siteData.activities = getDefaultActivities();
    } catch (err) {
      console.warn('[Firestore] Activities default digunakan:', err.message);
      siteData.activities = getDefaultActivities();
    }

    // 6. Gallery
    try {
      const galSnap = await getDocs(collection(db, 'gallery'));
      siteData.gallery = [];
      galSnap.forEach((d) => siteData.gallery.push({ id: d.id, ...d.data() }));
      if (siteData.gallery.length === 0) siteData.gallery = getDefaultGallery();
    } catch (err) {
      console.warn('[Firestore] Gallery default digunakan:', err.message);
      siteData.gallery = getDefaultGallery();
    }
  } catch (globalErr) {
    console.error('[Firestore Load All Error]:', globalErr);
    loadDefaultData();
  }
}

function loadDefaultData() {
  siteData.info = getDefaultInfo();
  siteData.pricing = getDefaultPricing();
  siteData.hours = getDefaultHours();
  siteData.facilities = getDefaultFacilities();
  siteData.activities = getDefaultActivities();
  siteData.gallery = getDefaultGallery();
}

// ===== DATA DEFAULT CITUMANG PANGANDARAN =====
function getDefaultInfo() {
  return {
    name: 'Citumang Pangandaran',
    tagline: 'Wisata Alam & River Tubing',
    description: 'Suaka ngarai sungai tropis legendaris di Pangandaran, Jawa Barat. Pengalaman body rafting eksklusif mengarungi kejernihan air alami dan gua karst purba.',
    address: 'Bojong, Parigi, Pangandaran Regency, West Java 46393',
    whatsapp: '6281221325957',
    instagram: '@citumangpangandaran01',
    tiktok: '@citumangpangandaran01'
  };
}

function getDefaultPricing() {
  return {
    startingPrice: 'Rp69.000',
    packages: [
      'Paket Body Rafting Lengkap (Mulai dari Rp69.000)',
      'River Body Rafting (Full Rute ±1,5 KM)',
      'Eksplorasi Gua Karst & Stalaktit',
      'Family Adventure (Ramah Anak & Lansia)',
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
    { title: 'Full body rafting ±1,5 KM', description: 'Pengarungan rute aliran sungai sepanjang ±1,5 KM.' },
    { title: 'Perlengkapan body rafting', description: 'Rompi pelampung dan helm keselamatan standar resmi.' },
    { title: 'Pemandu profesional', description: 'Instruktur lokal berlisensi dan berpengalaman.' },
    { title: 'Jasa dokumentasi', description: 'Dokumentasi foto dan video selama petualangan berlangsung.' },
    { title: 'Makan Nasi Liwet', description: 'Sajian hangat kuliner khas Sunda nasi liwet komplit.' },
    { title: 'Asuransi', description: 'Perlindungan asuransi keselamatan bagi setiap wisatawan.' },
    { title: 'Tempat penyimpanan barang', description: 'Loker penitipan barang yang aman dan terpantau.' },
    { title: 'Dry bag', description: 'Tas tahan air untuk mengamankan barang elektronik berharga.' },
    { title: 'Kolam terapi ikan', description: 'Kolam relaksasi terapi ikan alami di tepi sungai.' }
  ];
}

function getDefaultActivities() {
  return [
    {
      title: 'Full Body Rafting ±1,5 KM',
      description: 'Pengarungan rute aliran sungai dan tebing karst Citumang sepanjang ±1,5 KM mengenakan rompi pelampung standar keselamatan dipandu instruktur profesional.',
      duration: 'Durasi ~2 - 3 Jam',
      image: '/images/citumang/citumang-04.jpg'
    },
    {
      title: 'Berenang Santai di Air Jernih',
      description: 'Berenang dan mengapung santai di aliran air sungai karst alami yang jernih dan segar di bawah naungan tebing batu kapur yang asri.',
      duration: 'Bebas Waktu',
      image: '/images/citumang/citumang-03.jpg'
    },
    {
      title: 'Eksplorasi Gua Karst',
      description: 'Mengeksplorasi lorong gua karst alami tempat hulu mata air sungai pegunungan mengalir tenang dengan formasi dinding batu kapur alami.',
      duration: 'Tersedia Pemandu',
      image: '/images/citumang/citumang-06.jpg'
    },
    {
      title: 'Aktivitas Ramah Keluarga',
      description: 'Aktivitas berenang di sungai yang aman untuk keluarga dan anak-anak dengan rompi pelampung standar resmi serta pendampingan ranger.',
      duration: 'Semua Usia',
      image: '/images/citumang/citumang-05.jpg'
    }
  ];
}

function getDefaultGallery() {
  const items = [];
  for (let i = 1; i <= 10; i++) {
    const num = String(i).padStart(2, '0');
    items.push({
      image: `/images/citumang/citumang-${num}.jpg`,
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

// ----- OVERVIEW -----
function renderOverview() {
  const content = $('#admin-content');
  if (!content) return;

  content.innerHTML = `
    <div class="content-header">
      <h3>Dashboard</h3>
      <p>Ringkasan pengelolaan website Citumang Pangandaran.</p>
    </div>
    <div class="overview-grid">
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
          <div class="ov-label">Foto Gallery</div>
          <div class="ov-value">${siteData.gallery.length}</div>
        </div>
      </div>
      <div class="overview-card">
        <div class="ov-icon"><span class="material-symbols-outlined">payments</span></div>
        <div>
          <div class="ov-label">Harga Mulai</div>
          <div class="ov-value">${esc(siteData.pricing.startingPrice || 'Rp69.000')}</div>
        </div>
      </div>
    </div>

    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">info</span> Informasi Cepat</h4>
      <div class="field-row">
        <div>
          <div class="field-group">
            <label>Nama Wisata</label>
            <div style="font-size:0.875rem;font-weight:600;">${esc(siteData.info.name || '-')}</div>
          </div>
        </div>
        <div>
          <div class="field-group">
            <label>Jam Operasional</label>
            <div style="font-size:0.875rem;">${esc(siteData.hours.open || '07:00')} - ${esc(siteData.hours.close || '16:30')} ${esc(siteData.hours.timezone || 'WIB')}</div>
          </div>
        </div>
      </div>
      <div class="field-row">
        <div>
          <div class="field-group">
            <label>WhatsApp</label>
            <div style="font-size:0.875rem;">${esc(siteData.info.whatsapp || '-')}</div>
          </div>
        </div>
        <div>
          <div class="field-group">
            <label>Alamat</label>
            <div style="font-size:0.875rem;">${esc(siteData.info.address || '-')}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ----- INFO -----
function renderInfo() {
  const content = $('#admin-content');
  if (!content) return;

  const d = siteData.info || {};
  content.innerHTML = `
    <div class="content-header">
      <h3>Informasi Website</h3>
      <p>Kelola informasi umum yang ditampilkan di website.</p>
    </div>
    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">edit</span> Data Informasi</h4>
      <form id="form-info">
        <div class="field-row">
          <div class="field-group">
            <label for="info-name">Nama Wisata</label>
            <input type="text" id="info-name" value="${esc(d.name || '')}" placeholder="Citumang Pangandaran"/>
          </div>
          <div class="field-group">
            <label for="info-tagline">Tagline</label>
            <input type="text" id="info-tagline" value="${esc(d.tagline || '')}" placeholder="Wisata Alam & River Tubing"/>
          </div>
        </div>
        <div class="field-group">
          <label for="info-desc">Deskripsi</label>
          <textarea id="info-desc" rows="3" placeholder="Deskripsi singkat wisata...">${esc(d.description || '')}</textarea>
        </div>
        <div class="field-group">
          <label for="info-address">Alamat Lengkap</label>
          <input type="text" id="info-address" value="${esc(d.address || '')}" placeholder="Alamat lengkap"/>
        </div>
        <div class="field-row">
          <div class="field-group">
            <label for="info-wa">WhatsApp (format: 628xxx)</label>
            <input type="text" id="info-wa" value="${esc(d.whatsapp || '')}" placeholder="6281221325957"/>
          </div>
          <div class="field-group">
            <label for="info-ig">Instagram</label>
            <input type="text" id="info-ig" value="${esc(d.instagram || '')}" placeholder="@username"/>
          </div>
        </div>
        <div class="field-group">
          <label for="info-tiktok">TikTok</label>
          <input type="text" id="info-tiktok" value="${esc(d.tiktok || '')}" placeholder="@username"/>
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

// ----- PRICING -----
function renderPricing() {
  const content = $('#admin-content');
  if (!content) return;

  const d = siteData.pricing || {};
  const pkgs = (d.packages || [])
    .map(
      (p, i) => `
    <div class="item-entry">
      <div><div class="item-title">${esc(p)}</div></div>
      <div class="item-actions">
        <button class="btn-icon" onclick="window._editPackage(${i})" title="Edit"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
        <button class="btn-icon danger" onclick="window._deletePackage(${i})" title="Hapus"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
      </div>
    </div>
  `
    )
    .join('');

  content.innerHTML = `
    <div class="content-header">
      <h3>Harga & Paket</h3>
      <p>Kelola harga dasar dan daftar paket wisata.</p>
    </div>
    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">sell</span> Harga Dasar</h4>
      <form id="form-price">
        <div class="field-group">
          <label for="price-start">Harga Mulai Dari</label>
          <input type="text" id="price-start" value="${esc(d.startingPrice || '')}" placeholder="Rp69.000"/>
        </div>
        <div class="btn-group">
          <button type="submit" class="btn-primary" id="btn-save-price">
            <span class="material-symbols-outlined" style="font-size:18px;">save</span>
            Simpan Harga
          </button>
        </div>
        <div class="status-msg" id="price-status"></div>
      </form>
    </div>

    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">inventory_2</span> Daftar Paket</h4>
      <div id="package-list">${pkgs || '<p style="color:var(--admin-text-secondary);font-size:0.875rem;">Belum ada paket.</p>'}</div>
      <div class="btn-group">
        <button class="btn-secondary" id="btn-add-package" type="button">
          <span class="material-symbols-outlined" style="font-size:18px;">add</span>
          Tambah Paket
        </button>
      </div>
    </div>
  `;

  $('#form-price')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#btn-save-price');
    if (btn) btn.disabled = true;

    siteData.pricing.startingPrice = $('#price-start')?.value.trim() || 'Rp69.000';
    await saveDoc('siteConfig', 'pricing', siteData.pricing, 'price-status');

    if (btn) btn.disabled = false;
  });

  $('#btn-add-package')?.addEventListener('click', () => {
    openModal(
      'Tambah Paket Wisata',
      `
      <div class="field-group">
        <label for="modal-pkg-name">Nama Paket</label>
        <input type="text" id="modal-pkg-name" placeholder="Contoh: Paket Family Rafting (Rp85.000)"/>
      </div>
    `,
      async () => {
        const name = $('#modal-pkg-name')?.value.trim();
        if (!name) return;
        siteData.pricing.packages = siteData.pricing.packages || [];
        siteData.pricing.packages.push(name);
        await saveDoc('siteConfig', 'pricing', siteData.pricing, null);
        closeModal();
        renderPricing();
      }
    );
  });

  window._editPackage = (i) => {
    const pkg = siteData.pricing.packages[i];
    openModal(
      'Edit Paket Wisata',
      `
      <div class="field-group">
        <label for="modal-pkg-name">Nama Paket</label>
        <input type="text" id="modal-pkg-name" value="${esc(pkg)}"/>
      </div>
    `,
      async () => {
        const val = $('#modal-pkg-name')?.value.trim();
        if (!val) return;
        siteData.pricing.packages[i] = val;
        await saveDoc('siteConfig', 'pricing', siteData.pricing, null);
        closeModal();
        renderPricing();
      }
    );
  };

  window._deletePackage = async (i) => {
    if (!confirm('Hapus paket ini?')) return;
    siteData.pricing.packages.splice(i, 1);
    await saveDoc('siteConfig', 'pricing', siteData.pricing, null);
    renderPricing();
  };
}

// ----- HOURS -----
function renderHours() {
  const content = $('#admin-content');
  if (!content) return;

  const d = siteData.hours || {};
  content.innerHTML = `
    <div class="content-header">
      <h3>Jam Operasional</h3>
      <p>Atur jadwal buka dan tutup wisata Citumang.</p>
    </div>
    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">schedule</span> Jadwal Kunjungan</h4>
      <form id="form-hours">
        <div class="field-group">
          <label for="hours-days">Hari Operasional</label>
          <input type="text" id="hours-days" value="${esc(d.days || '')}" placeholder="Senin - Minggu"/>
        </div>
        <div class="field-row">
          <div class="field-group">
            <label for="hours-open">Jam Buka</label>
            <input type="time" id="hours-open" value="${esc(d.open || '07:00')}"/>
          </div>
          <div class="field-group">
            <label for="hours-close">Jam Tutup</label>
            <input type="time" id="hours-close" value="${esc(d.close || '16:30')}"/>
          </div>
        </div>
        <div class="field-group">
          <label for="hours-tz">Zona Waktu</label>
          <input type="text" id="hours-tz" value="${esc(d.timezone || 'WIB')}" placeholder="WIB"/>
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
        open: $('#hours-open')?.value || '07:00',
        close: $('#hours-close')?.value || '16:30',
        timezone: $('#hours-tz')?.value.trim() || 'WIB',
        updatedAt: serverTimestamp()
      },
      'hours-status'
    );

    if (btn) btn.disabled = false;
  });
}

// ----- FACILITIES -----
function renderFacilities() {
  const content = $('#admin-content');
  if (!content) return;

  const items = siteData.facilities
    .map(
      (f, i) => `
    <div class="item-entry">
      <div>
        <div class="item-title">${esc(f.title)}</div>
        <div class="item-sub">${esc(f.description || '')}</div>
      </div>
      <div class="item-actions">
        <button class="btn-icon" onclick="window._editFacility(${i})" title="Edit"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
        <button class="btn-icon danger" onclick="window._deleteFacility(${i})" title="Hapus"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
      </div>
    </div>
  `
    )
    .join('');

  content.innerHTML = `
    <div class="content-header">
      <h3>Fasilitas</h3>
      <p>Kelola daftar fasilitas resmi yang didapatkan pengunjung.</p>
    </div>
    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">list</span> Daftar Fasilitas (${siteData.facilities.length})</h4>
      <div id="facility-list">${items || '<p style="color:var(--admin-text-secondary);font-size:0.875rem;">Belum ada fasilitas.</p>'}</div>
      <div class="btn-group">
        <button class="btn-secondary" id="btn-add-facility" type="button">
          <span class="material-symbols-outlined" style="font-size:18px;">add</span>
          Tambah Fasilitas
        </button>
      </div>
    </div>
  `;

  $('#btn-add-facility')?.addEventListener('click', () => {
    openModal(
      'Tambah Fasilitas',
      `
      <div class="field-group">
        <label for="modal-fac-title">Nama Fasilitas</label>
        <input type="text" id="modal-fac-title" placeholder="Nama fasilitas"/>
      </div>
      <div class="field-group">
        <label for="modal-fac-desc">Deskripsi</label>
        <textarea id="modal-fac-desc" rows="2" placeholder="Deskripsi singkat"></textarea>
      </div>
    `,
      async () => {
        const title = $('#modal-fac-title')?.value.trim();
        if (!title) return;
        const newFac = {
          title,
          description: $('#modal-fac-desc')?.value.trim() || ''
        };
        if (db) {
          try {
            const docRef = await addDoc(collection(db, 'facilities'), {
              ...newFac,
              createdAt: serverTimestamp()
            });
            siteData.facilities.push({ id: docRef.id, ...newFac });
          } catch (err) {
            console.warn('[Firestore] Gagal menyimpan ke server, menyimpan secara lokal:', err);
            siteData.facilities.push({ id: 'local_' + Date.now(), ...newFac });
          }
        } else {
          siteData.facilities.push({ id: 'local_' + Date.now(), ...newFac });
        }
        closeModal();
        renderFacilities();
      }
    );
  });

  window._editFacility = (i) => {
    const f = siteData.facilities[i];
    openModal(
      'Edit Fasilitas',
      `
      <div class="field-group">
        <label for="modal-fac-title">Nama Fasilitas</label>
        <input type="text" id="modal-fac-title" value="${esc(f.title)}"/>
      </div>
      <div class="field-group">
        <label for="modal-fac-desc">Deskripsi</label>
        <textarea id="modal-fac-desc" rows="2">${esc(f.description || '')}</textarea>
      </div>
    `,
      async () => {
        const updated = {
          title: $('#modal-fac-title')?.value.trim() || f.title,
          description: $('#modal-fac-desc')?.value.trim() || ''
        };
        if (db && f.id && !f.id.startsWith('local_')) {
          try {
            await updateDoc(doc(db, 'facilities', f.id), {
              ...updated,
              updatedAt: serverTimestamp()
            });
          } catch (err) {
            console.warn('[Firestore] Gagal update fasilitas:', err);
          }
        }
        siteData.facilities[i] = { ...f, ...updated };
        closeModal();
        renderFacilities();
      }
    );
  };

  window._deleteFacility = async (i) => {
    if (!confirm('Hapus fasilitas ini?')) return;
    const f = siteData.facilities[i];
    if (db && f.id && !f.id.startsWith('local_')) {
      try {
        await deleteDoc(doc(db, 'facilities', f.id));
      } catch (err) {
        console.warn('[Firestore] Gagal delete fasilitas:', err);
      }
    }
    siteData.facilities.splice(i, 1);
    renderFacilities();
  };
}

// ----- ACTIVITIES -----
function renderActivities() {
  const content = $('#admin-content');
  if (!content) return;

  const items = siteData.activities
    .map(
      (a, i) => `
    <div class="item-entry">
      <div style="display:flex;align-items:center;gap:0.75rem;">
        ${a.image ? `<img src="${esc(a.image)}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;" alt="" loading="lazy"/>` : ''}
        <div>
          <div class="item-title">${esc(a.title)}</div>
          <div class="item-sub">${esc(a.duration || '')}</div>
        </div>
      </div>
      <div class="item-actions">
        <button class="btn-icon" onclick="window._editActivity(${i})" title="Edit"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
        <button class="btn-icon danger" onclick="window._deleteActivity(${i})" title="Hapus"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
      </div>
    </div>
  `
    )
    .join('');

  content.innerHTML = `
    <div class="content-header">
      <h3>Aktivitas</h3>
      <p>Kelola aktivitas wisata yang ditampilkan di website Citumang.</p>
    </div>
    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">list</span> Daftar Aktivitas (${siteData.activities.length})</h4>
      <div id="activity-list">${items || '<p style="color:var(--admin-text-secondary);font-size:0.875rem;">Belum ada aktivitas.</p>'}</div>
      <div class="btn-group">
        <button class="btn-secondary" id="btn-add-activity" type="button">
          <span class="material-symbols-outlined" style="font-size:18px;">add</span>
          Tambah Aktivitas
        </button>
      </div>
    </div>
  `;

  $('#btn-add-activity')?.addEventListener('click', () => {
    showActivityModal(-1);
  });

  window._editActivity = (i) => showActivityModal(i);

  window._deleteActivity = async (i) => {
    if (!confirm('Hapus aktivitas ini?')) return;
    const a = siteData.activities[i];
    if (db && a.id && !a.id.startsWith('local_')) {
      try {
        await deleteDoc(doc(db, 'activities', a.id));
      } catch (err) {
        console.warn('[Firestore] Gagal delete aktivitas:', err);
      }
    }
    siteData.activities.splice(i, 1);
    renderActivities();
  };
}

function showActivityModal(index) {
  const isEdit = index >= 0;
  const a = isEdit ? siteData.activities[index] : {};

  openModal(
    isEdit ? 'Edit Aktivitas' : 'Tambah Aktivitas',
    `
    <div class="field-group">
      <label for="modal-act-title">Judul Aktivitas</label>
      <input type="text" id="modal-act-title" value="${esc(a.title || '')}" placeholder="Judul aktivitas"/>
    </div>
    <div class="field-group">
      <label for="modal-act-desc">Deskripsi</label>
      <textarea id="modal-act-desc" rows="3" placeholder="Deskripsi aktivitas...">${esc(a.description || '')}</textarea>
    </div>
    <div class="field-row">
      <div class="field-group">
        <label for="modal-act-dur">Durasi / Keterangan</label>
        <input type="text" id="modal-act-dur" value="${esc(a.duration || '')}" placeholder="Contoh: Durasi ~2 - 3 Jam"/>
      </div>
      <div class="field-group">
        <label for="modal-act-img">Path Foto</label>
        <input type="text" id="modal-act-img" value="${esc(a.image || '')}" placeholder="/images/citumang/citumang-01.jpg"/>
      </div>
    </div>
  `,
    async () => {
      const data = {
        title: $('#modal-act-title')?.value.trim() || '',
        description: $('#modal-act-desc')?.value.trim() || '',
        duration: $('#modal-act-dur')?.value.trim() || '',
        image: $('#modal-act-img')?.value.trim() || ''
      };
      if (!data.title) return;

      if (isEdit && a.id && !a.id.startsWith('local_') && db) {
        try {
          await updateDoc(doc(db, 'activities', a.id), {
            ...data,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.warn('[Firestore] Gagal update aktivitas:', err);
        }
        siteData.activities[index] = { ...a, ...data };
      } else if (db) {
        try {
          const docRef = await addDoc(collection(db, 'activities'), {
            ...data,
            createdAt: serverTimestamp()
          });
          siteData.activities.push({ id: docRef.id, ...data });
        } catch (err) {
          console.warn('[Firestore] Gagal menambah aktivitas:', err);
          siteData.activities.push({ id: 'local_' + Date.now(), ...data });
        }
      } else {
        siteData.activities.push({ id: 'local_' + Date.now(), ...data });
      }

      closeModal();
      renderActivities();
    }
  );
}

// ----- GALLERY -----
function renderGallery() {
  const content = $('#admin-content');
  if (!content) return;

  const items = siteData.gallery
    .map(
      (g, i) => `
    <div class="gallery-item" title="${esc(g.alt || '')}">
      <img src="${esc(g.image)}" alt="${esc(g.alt || '')}" loading="lazy"/>
      <div class="gallery-overlay">
        <button class="btn-icon" style="color:#fff;background:rgba(255,255,255,0.2);margin-right:0.5rem;" onclick="window._editGallery(${i})" title="Edit">
          <span class="material-symbols-outlined" style="font-size:20px;">edit</span>
        </button>
        <button class="btn-icon" style="color:#fff;background:rgba(186,26,26,0.6);" onclick="window._deleteGallery(${i})" title="Hapus">
          <span class="material-symbols-outlined" style="font-size:20px;">delete</span>
        </button>
      </div>
    </div>
  `
    )
    .join('');

  content.innerHTML = `
    <div class="content-header">
      <h3>Foto / Gallery</h3>
      <p>Kelola koleksi foto dokumentasi wisatawan di Citumang Pangandaran.</p>
    </div>
    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">collections</span> Koleksi Foto (${siteData.gallery.length})</h4>
      <div class="gallery-grid" id="gallery-grid">${items}</div>
      <div class="btn-group">
        <button class="btn-secondary" id="btn-add-gallery" type="button">
          <span class="material-symbols-outlined" style="font-size:18px;">add_photo_alternate</span>
          Tambah Foto
        </button>
      </div>
    </div>
  `;

  $('#btn-add-gallery')?.addEventListener('click', () => {
    openModal(
      'Tambah Foto Gallery',
      `
      <div class="field-group">
        <label for="modal-gal-img">Path Foto</label>
        <input type="text" id="modal-gal-img" placeholder="/images/citumang/citumang-01.jpg"/>
      </div>
      <div class="field-group">
        <label for="modal-gal-alt">Deskripsi Foto / Alt Text</label>
        <input type="text" id="modal-gal-alt" placeholder="Deskripsi faktual foto"/>
      </div>
    `,
      async () => {
        const data = {
          image: $('#modal-gal-img')?.value.trim() || '',
          alt: $('#modal-gal-alt')?.value.trim() || '',
          order: siteData.gallery.length + 1
        };
        if (!data.image) return;

        if (db) {
          try {
            const docRef = await addDoc(collection(db, 'gallery'), {
              ...data,
              createdAt: serverTimestamp()
            });
            siteData.gallery.push({ id: docRef.id, ...data });
          } catch (err) {
            console.warn('[Firestore] Gagal simpan foto:', err);
            siteData.gallery.push({ id: 'local_' + Date.now(), ...data });
          }
        } else {
          siteData.gallery.push({ id: 'local_' + Date.now(), ...data });
        }

        closeModal();
        renderGallery();
      }
    );
  });

  window._editGallery = (i) => {
    const g = siteData.gallery[i];
    openModal(
      'Edit Foto Gallery',
      `
      <div class="field-group">
        <label for="modal-gal-img">Path Foto</label>
        <input type="text" id="modal-gal-img" value="${esc(g.image)}"/>
      </div>
      <div class="field-group">
        <label for="modal-gal-alt">Deskripsi Foto / Alt Text</label>
        <input type="text" id="modal-gal-alt" value="${esc(g.alt || '')}"/>
      </div>
    `,
      async () => {
        const data = {
          image: $('#modal-gal-img')?.value.trim() || g.image,
          alt: $('#modal-gal-alt')?.value.trim() || ''
        };
        if (db && g.id && !g.id.startsWith('local_')) {
          try {
            await updateDoc(doc(db, 'gallery', g.id), {
              ...data,
              updatedAt: serverTimestamp()
            });
          } catch (err) {
            console.warn('[Firestore] Gagal update foto:', err);
          }
        }
        siteData.gallery[i] = { ...g, ...data };
        closeModal();
        renderGallery();
      }
    );
  };

  window._deleteGallery = async (i) => {
    if (!confirm('Hapus foto ini dari galeri?')) return;
    const g = siteData.gallery[i];
    if (db && g.id && !g.id.startsWith('local_')) {
      try {
        await deleteDoc(doc(db, 'gallery', g.id));
      } catch (err) {
        console.warn('[Firestore] Gagal delete foto:', err);
      }
    }
    siteData.gallery.splice(i, 1);
    renderGallery();
  };
}

// ===== HELPERS =====
function esc(str) {
  if (typeof str !== 'string') return str || '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function saveDoc(collName, docId, data, statusId) {
  const statusEl = statusId ? $(`#${statusId}`) : null;
  if (!db) {
    if (collName === 'siteConfig') {
      siteData[docId] = { ...siteData[docId], ...data };
    }
    if (statusEl) {
      statusEl.className = 'status-msg success';
      statusEl.textContent = '✓ Data berhasil diperbarui (tersimpan lokal).';
      setTimeout(() => {
        statusEl.className = 'status-msg';
      }, 3000);
    }
    return;
  }

  try {
    await setDoc(doc(db, collName, docId), data, { merge: true });
    if (collName === 'siteConfig') {
      siteData[docId] = { ...siteData[docId], ...data };
    }
    if (statusEl) {
      statusEl.className = 'status-msg success';
      statusEl.textContent = '✓ Berhasil disimpan ke server!';
      setTimeout(() => {
        statusEl.className = 'status-msg';
      }, 3000);
    }
  } catch (err) {
    console.error('[Firestore Save Error]:', err);
    if (collName === 'siteConfig') {
      siteData[docId] = { ...siteData[docId], ...data };
    }
    if (statusEl) {
      statusEl.className = 'status-msg error';
      statusEl.textContent =
        'Tersimpan lokal (server error: ' + (err.code || err.message) + ')';
    }
  }
}

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
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="spinner"></span>';
    }
    try {
      await onSave();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML =
          '<span class="material-symbols-outlined" style="font-size:18px;">save</span> Simpan';
      }
    }
  });
}

function closeModal() {
  const modal = $('#edit-modal');
  if (modal) modal.classList.remove('show');
}

// Jalankan saat DOM siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initDOMEvents();
    initAuth();
  });
} else {
  initDOMEvents();
  initAuth();
}
