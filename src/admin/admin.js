/**
 * Admin Panel — Citumang Pangandaran
 * Mengelola autentikasi admin dan CRUD data website via Firebase.
 */

import { auth, db } from '../config/firebase.js';
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
let siteData = {
  info: {},
  pricing: {},
  hours: {},
  facilities: [],
  activities: [],
  gallery: []
};

// ===== DOM REFS =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const loadingScreen = $('#loading-screen');
const loginPage = $('#login-page');
const dashboardPage = $('#dashboard-page');
const loginForm = $('#login-form');
const loginError = $('#login-error');
const loginErrorText = $('#login-error-text');
const loginBtn = $('#btn-login');
const loginBtnText = $('#login-btn-text');
const logoutBtn = $('#btn-logout');
const adminEmail = $('#admin-email');
const adminContent = $('#admin-content');
const sidebarToggle = $('#btn-sidebar-toggle');
const sidebar = $('#admin-sidebar');
const editModal = $('#edit-modal');
const editModalContent = $('#edit-modal-content');

// ===== AUTH =====
onAuthStateChanged(auth, async (user) => {
  loadingScreen.style.display = 'none';
  if (user) {
    showDashboard(user);
  } else {
    showLogin();
  }
});

function showLogin() {
  loginPage.style.display = 'flex';
  dashboardPage.style.display = 'none';
}

async function showDashboard(user) {
  loginPage.style.display = 'none';
  dashboardPage.style.display = 'block';
  adminEmail.textContent = user.email;
  await loadAllData();
  renderSection(currentSection);
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#login-email').value.trim();
  const password = $('#login-password').value;

  loginBtn.disabled = true;
  loginBtnText.innerHTML = '<span class="spinner"></span>';
  loginError.classList.remove('show');

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    let msg = 'Email atau password salah.';
    if (err.code === 'auth/user-not-found') msg = 'Akun tidak ditemukan.';
    if (err.code === 'auth/wrong-password') msg = 'Password salah.';
    if (err.code === 'auth/too-many-requests') msg = 'Terlalu banyak percobaan. Coba lagi nanti.';
    if (err.code === 'auth/invalid-credential') msg = 'Email atau password salah.';
    loginErrorText.textContent = msg;
    loginError.classList.add('show');
  } finally {
    loginBtn.disabled = false;
    loginBtnText.textContent = 'Masuk';
  }
});

logoutBtn.addEventListener('click', () => signOut(auth));

// ===== SIDEBAR NAV =====
$$('.sidebar-nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.sidebar-nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSection = btn.dataset.section;
    renderSection(currentSection);
    // Close mobile sidebar
    sidebar.classList.remove('open');
  });
});

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

// Close modal on overlay click
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeModal();
});

// ===== DATA LOADING =====
async function loadAllData() {
  try {
    // Load site info
    const infoDoc = await getDoc(doc(db, 'siteConfig', 'info'));
    siteData.info = infoDoc.exists() ? infoDoc.data() : getDefaultInfo();

    // Load pricing
    const pricingDoc = await getDoc(doc(db, 'siteConfig', 'pricing'));
    siteData.pricing = pricingDoc.exists() ? pricingDoc.data() : getDefaultPricing();

    // Load hours
    const hoursDoc = await getDoc(doc(db, 'siteConfig', 'hours'));
    siteData.hours = hoursDoc.exists() ? hoursDoc.data() : getDefaultHours();

    // Load facilities
    const facSnap = await getDocs(collection(db, 'facilities'));
    siteData.facilities = [];
    facSnap.forEach(d => siteData.facilities.push({ id: d.id, ...d.data() }));
    if (siteData.facilities.length === 0) siteData.facilities = getDefaultFacilities();

    // Load activities
    const actSnap = await getDocs(collection(db, 'activities'));
    siteData.activities = [];
    actSnap.forEach(d => siteData.activities.push({ id: d.id, ...d.data() }));
    if (siteData.activities.length === 0) siteData.activities = getDefaultActivities();

    // Load gallery
    const galSnap = await getDocs(collection(db, 'gallery'));
    siteData.gallery = [];
    galSnap.forEach(d => siteData.gallery.push({ id: d.id, ...d.data() }));
    if (siteData.gallery.length === 0) siteData.gallery = getDefaultGallery();

  } catch (err) {
    console.error('Error loading data:', err);
  }
}

// ===== DEFAULT DATA (fallback when Firestore is empty) =====
function getDefaultInfo() {
  return {
    name: 'Citumang Pangandaran',
    tagline: 'Wisata Alam & River Tubing',
    description: 'Suaka ngarai sungai tropis legendaris di Pangandaran, Jawa Barat.',
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
    { title: 'Full body rafting ±1,5 KM', description: 'Pengarungan rute sepanjang ±1,5 KM' },
    { title: 'Perlengkapan body rafting', description: 'Rompi pelampung dan helm' },
    { title: 'Pemandu profesional', description: 'Instruktur berpengalaman' },
    { title: 'Jasa dokumentasi', description: 'Foto dan video selama aktivitas' },
    { title: 'Makan Nasi Liwet', description: 'Nasi liwet khas Pangandaran' },
    { title: 'Asuransi', description: 'Perlindungan asuransi wisatawan' },
    { title: 'Tempat penyimpanan barang', description: 'Loker dan area penitipan' },
    { title: 'Dry bag', description: 'Tas anti air untuk barang berharga' },
    { title: 'Kolam terapi ikan', description: 'Kolam ikan terapi alami' }
  ];
}

function getDefaultActivities() {
  return [
    { title: 'Full Body Rafting ±1,5 KM', description: 'Pengarungan rute aliran sungai dan tebing karst Citumang sepanjang ±1,5 KM.', duration: 'Durasi ~2-3 Jam', image: '/images/citumang/citumang-04.jpg' },
    { title: 'Berenang Santai di Air Jernih', description: 'Berenang dan mengapung santai di aliran air sungai karst alami yang jernih.', duration: 'Bebas Waktu', image: '/images/citumang/citumang-03.jpg' },
    { title: 'Eksplorasi Gua Karst', description: 'Mengeksplorasi lorong gua karst alami dengan dinding batu kapur.', duration: 'Tersedia Pemandu', image: '/images/citumang/citumang-06.jpg' },
    { title: 'Aktivitas Ramah Keluarga', description: 'Aktivitas berenang yang aman untuk keluarga dan anak-anak.', duration: 'Semua Usia', image: '/images/citumang/citumang-05.jpg' }
  ];
}

function getDefaultGallery() {
  const items = [];
  for (let i = 1; i <= 10; i++) {
    const num = String(i).padStart(2, '0');
    items.push({
      image: `/images/citumang/citumang-${num}.jpg`,
      alt: `Foto Citumang ${i}`,
      order: i
    });
  }
  return items;
}

// ===== SECTION RENDERING =====
function renderSection(section) {
  switch (section) {
    case 'overview': renderOverview(); break;
    case 'info': renderInfo(); break;
    case 'pricing': renderPricing(); break;
    case 'hours': renderHours(); break;
    case 'facilities': renderFacilities(); break;
    case 'activities': renderActivities(); break;
    case 'gallery': renderGallery(); break;
  }
}

// ----- OVERVIEW -----
function renderOverview() {
  adminContent.innerHTML = `
    <div class="content-header">
      <h3>Dashboard</h3>
      <p>Ringkasan pengelolaan website Citumang Pangandaran.</p>
    </div>
    <div class="overview-grid">
      <div class="overview-card">
        <div class="ov-icon"><span class="material-symbols-outlined">kayaking</span></div>
        <div><div class="ov-label">Aktivitas</div><div class="ov-value">${siteData.activities.length}</div></div>
      </div>
      <div class="overview-card">
        <div class="ov-icon"><span class="material-symbols-outlined">spa</span></div>
        <div><div class="ov-label">Fasilitas</div><div class="ov-value">${siteData.facilities.length}</div></div>
      </div>
      <div class="overview-card">
        <div class="ov-icon"><span class="material-symbols-outlined">photo_library</span></div>
        <div><div class="ov-label">Foto Gallery</div><div class="ov-value">${siteData.gallery.length}</div></div>
      </div>
      <div class="overview-card">
        <div class="ov-icon"><span class="material-symbols-outlined">payments</span></div>
        <div><div class="ov-label">Harga Mulai</div><div class="ov-value">${siteData.pricing.startingPrice || 'Rp69.000'}</div></div>
      </div>
    </div>
    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">info</span> Informasi Cepat</h4>
      <div class="field-row">
        <div>
          <div class="field-group"><label>Nama Wisata</label><div style="font-size:0.875rem;font-weight:600;">${siteData.info.name || '-'}</div></div>
        </div>
        <div>
          <div class="field-group"><label>Jam Operasional</label><div style="font-size:0.875rem;">${siteData.hours.open || '07:00'} - ${siteData.hours.close || '16:30'} ${siteData.hours.timezone || 'WIB'}</div></div>
        </div>
      </div>
      <div class="field-row">
        <div>
          <div class="field-group"><label>WhatsApp</label><div style="font-size:0.875rem;">${siteData.info.whatsapp || '-'}</div></div>
        </div>
        <div>
          <div class="field-group"><label>Alamat</label><div style="font-size:0.875rem;">${siteData.info.address || '-'}</div></div>
        </div>
      </div>
    </div>
  `;
}

// ----- INFO -----
function renderInfo() {
  const d = siteData.info;
  adminContent.innerHTML = `
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
            <label for="info-wa">WhatsApp (62xxx)</label>
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
          <button type="submit" class="btn-primary">
            <span class="material-symbols-outlined" style="font-size:18px;">save</span>
            Simpan Perubahan
          </button>
        </div>
        <div class="status-msg" id="info-status"></div>
      </form>
    </div>
  `;

  $('#form-info').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveDoc('siteConfig', 'info', {
      name: $('#info-name').value.trim(),
      tagline: $('#info-tagline').value.trim(),
      description: $('#info-desc').value.trim(),
      address: $('#info-address').value.trim(),
      whatsapp: $('#info-wa').value.trim(),
      instagram: $('#info-ig').value.trim(),
      tiktok: $('#info-tiktok').value.trim(),
      updatedAt: serverTimestamp()
    }, 'info-status');
  });
}

// ----- PRICING -----
function renderPricing() {
  const d = siteData.pricing;
  const pkgs = (d.packages || []).map((p, i) => `
    <div class="item-entry">
      <div><div class="item-title">${esc(p)}</div></div>
      <div class="item-actions">
        <button class="btn-icon" onclick="window._editPackage(${i})" title="Edit"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
        <button class="btn-icon danger" onclick="window._deletePackage(${i})" title="Hapus"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
      </div>
    </div>
  `).join('');

  adminContent.innerHTML = `
    <div class="content-header">
      <h3>Harga & Paket</h3>
      <p>Kelola harga dan paket wisata.</p>
    </div>
    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">sell</span> Harga Dasar</h4>
      <form id="form-price">
        <div class="field-group">
          <label for="price-start">Harga Mulai Dari</label>
          <input type="text" id="price-start" value="${esc(d.startingPrice || '')}" placeholder="Rp69.000"/>
        </div>
        <div class="btn-group">
          <button type="submit" class="btn-primary">
            <span class="material-symbols-outlined" style="font-size:18px;">save</span>
            Simpan
          </button>
        </div>
        <div class="status-msg" id="price-status"></div>
      </form>
    </div>
    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">inventory_2</span> Daftar Paket</h4>
      <div id="package-list">${pkgs || '<p style="color:var(--admin-text-secondary);font-size:0.875rem;">Belum ada paket.</p>'}</div>
      <div class="btn-group">
        <button class="btn-secondary" id="btn-add-package">
          <span class="material-symbols-outlined" style="font-size:18px;">add</span>
          Tambah Paket
        </button>
      </div>
    </div>
  `;

  $('#form-price').addEventListener('submit', async (e) => {
    e.preventDefault();
    siteData.pricing.startingPrice = $('#price-start').value.trim();
    await saveDoc('siteConfig', 'pricing', siteData.pricing, 'price-status');
  });

  $('#btn-add-package').addEventListener('click', () => {
    openModal('Tambah Paket', `
      <div class="field-group">
        <label for="modal-pkg-name">Nama Paket</label>
        <input type="text" id="modal-pkg-name" placeholder="Nama paket baru"/>
      </div>
    `, async () => {
      const name = $('#modal-pkg-name').value.trim();
      if (!name) return;
      siteData.pricing.packages = siteData.pricing.packages || [];
      siteData.pricing.packages.push(name);
      await setDoc(doc(db, 'siteConfig', 'pricing'), siteData.pricing);
      closeModal();
      renderPricing();
    });
  });

  window._editPackage = (i) => {
    const pkg = siteData.pricing.packages[i];
    openModal('Edit Paket', `
      <div class="field-group">
        <label for="modal-pkg-name">Nama Paket</label>
        <input type="text" id="modal-pkg-name" value="${esc(pkg)}"/>
      </div>
    `, async () => {
      siteData.pricing.packages[i] = $('#modal-pkg-name').value.trim();
      await setDoc(doc(db, 'siteConfig', 'pricing'), siteData.pricing);
      closeModal();
      renderPricing();
    });
  };

  window._deletePackage = async (i) => {
    if (!confirm('Hapus paket ini?')) return;
    siteData.pricing.packages.splice(i, 1);
    await setDoc(doc(db, 'siteConfig', 'pricing'), siteData.pricing);
    renderPricing();
  };
}

// ----- HOURS -----
function renderHours() {
  const d = siteData.hours;
  adminContent.innerHTML = `
    <div class="content-header">
      <h3>Jam Operasional</h3>
      <p>Atur jadwal buka dan tutup wisata.</p>
    </div>
    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">schedule</span> Jadwal</h4>
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
          <button type="submit" class="btn-primary">
            <span class="material-symbols-outlined" style="font-size:18px;">save</span>
            Simpan
          </button>
        </div>
        <div class="status-msg" id="hours-status"></div>
      </form>
    </div>
  `;

  $('#form-hours').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveDoc('siteConfig', 'hours', {
      days: $('#hours-days').value.trim(),
      open: $('#hours-open').value,
      close: $('#hours-close').value,
      timezone: $('#hours-tz').value.trim(),
      updatedAt: serverTimestamp()
    }, 'hours-status');
  });
}

// ----- FACILITIES -----
function renderFacilities() {
  const items = siteData.facilities.map((f, i) => `
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
  `).join('');

  adminContent.innerHTML = `
    <div class="content-header">
      <h3>Fasilitas</h3>
      <p>Kelola daftar fasilitas yang tersedia.</p>
    </div>
    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">list</span> Daftar Fasilitas (${siteData.facilities.length})</h4>
      <div id="facility-list">${items || '<p style="color:var(--admin-text-secondary);font-size:0.875rem;">Belum ada fasilitas.</p>'}</div>
      <div class="btn-group">
        <button class="btn-secondary" id="btn-add-facility">
          <span class="material-symbols-outlined" style="font-size:18px;">add</span>
          Tambah Fasilitas
        </button>
      </div>
    </div>
  `;

  $('#btn-add-facility').addEventListener('click', () => {
    openModal('Tambah Fasilitas', `
      <div class="field-group">
        <label for="modal-fac-title">Nama Fasilitas</label>
        <input type="text" id="modal-fac-title" placeholder="Nama fasilitas"/>
      </div>
      <div class="field-group">
        <label for="modal-fac-desc">Deskripsi</label>
        <textarea id="modal-fac-desc" rows="2" placeholder="Deskripsi singkat"></textarea>
      </div>
    `, async () => {
      const title = $('#modal-fac-title').value.trim();
      if (!title) return;
      const newFac = { title, description: $('#modal-fac-desc').value.trim() };
      const docRef = await addDoc(collection(db, 'facilities'), { ...newFac, createdAt: serverTimestamp() });
      siteData.facilities.push({ id: docRef.id, ...newFac });
      closeModal();
      renderFacilities();
    });
  });

  window._editFacility = (i) => {
    const f = siteData.facilities[i];
    openModal('Edit Fasilitas', `
      <div class="field-group">
        <label for="modal-fac-title">Nama Fasilitas</label>
        <input type="text" id="modal-fac-title" value="${esc(f.title)}"/>
      </div>
      <div class="field-group">
        <label for="modal-fac-desc">Deskripsi</label>
        <textarea id="modal-fac-desc" rows="2">${esc(f.description || '')}</textarea>
      </div>
    `, async () => {
      const updated = { title: $('#modal-fac-title').value.trim(), description: $('#modal-fac-desc').value.trim() };
      if (f.id) {
        await updateDoc(doc(db, 'facilities', f.id), { ...updated, updatedAt: serverTimestamp() });
      }
      siteData.facilities[i] = { ...f, ...updated };
      closeModal();
      renderFacilities();
    });
  };

  window._deleteFacility = async (i) => {
    if (!confirm('Hapus fasilitas ini?')) return;
    const f = siteData.facilities[i];
    if (f.id) await deleteDoc(doc(db, 'facilities', f.id));
    siteData.facilities.splice(i, 1);
    renderFacilities();
  };
}

// ----- ACTIVITIES -----
function renderActivities() {
  const items = siteData.activities.map((a, i) => `
    <div class="item-entry">
      <div style="display:flex;align-items:center;gap:0.75rem;">
        ${a.image ? `<img src="${esc(a.image)}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;" alt=""/>` : ''}
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
  `).join('');

  adminContent.innerHTML = `
    <div class="content-header">
      <h3>Aktivitas</h3>
      <p>Kelola aktivitas wisata yang ditampilkan di website.</p>
    </div>
    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">list</span> Daftar Aktivitas (${siteData.activities.length})</h4>
      <div id="activity-list">${items || '<p style="color:var(--admin-text-secondary);font-size:0.875rem;">Belum ada aktivitas.</p>'}</div>
      <div class="btn-group">
        <button class="btn-secondary" id="btn-add-activity">
          <span class="material-symbols-outlined" style="font-size:18px;">add</span>
          Tambah Aktivitas
        </button>
      </div>
    </div>
  `;

  $('#btn-add-activity').addEventListener('click', () => {
    showActivityModal(-1);
  });

  window._editActivity = (i) => showActivityModal(i);

  window._deleteActivity = async (i) => {
    if (!confirm('Hapus aktivitas ini?')) return;
    const a = siteData.activities[i];
    if (a.id) await deleteDoc(doc(db, 'activities', a.id));
    siteData.activities.splice(i, 1);
    renderActivities();
  };
}

function showActivityModal(index) {
  const isEdit = index >= 0;
  const a = isEdit ? siteData.activities[index] : {};

  openModal(isEdit ? 'Edit Aktivitas' : 'Tambah Aktivitas', `
    <div class="field-group">
      <label for="modal-act-title">Judul</label>
      <input type="text" id="modal-act-title" value="${esc(a.title || '')}" placeholder="Judul aktivitas"/>
    </div>
    <div class="field-group">
      <label for="modal-act-desc">Deskripsi</label>
      <textarea id="modal-act-desc" rows="3" placeholder="Deskripsi aktivitas">${esc(a.description || '')}</textarea>
    </div>
    <div class="field-row">
      <div class="field-group">
        <label for="modal-act-dur">Durasi</label>
        <input type="text" id="modal-act-dur" value="${esc(a.duration || '')}" placeholder="Bebas Waktu"/>
      </div>
      <div class="field-group">
        <label for="modal-act-img">Path Gambar</label>
        <input type="text" id="modal-act-img" value="${esc(a.image || '')}" placeholder="/images/citumang/citumang-01.jpg"/>
      </div>
    </div>
  `, async () => {
    const data = {
      title: $('#modal-act-title').value.trim(),
      description: $('#modal-act-desc').value.trim(),
      duration: $('#modal-act-dur').value.trim(),
      image: $('#modal-act-img').value.trim()
    };
    if (!data.title) return;

    if (isEdit && a.id) {
      await updateDoc(doc(db, 'activities', a.id), { ...data, updatedAt: serverTimestamp() });
      siteData.activities[index] = { ...a, ...data };
    } else {
      const docRef = await addDoc(collection(db, 'activities'), { ...data, createdAt: serverTimestamp() });
      siteData.activities.push({ id: docRef.id, ...data });
    }
    closeModal();
    renderActivities();
  });
}

// ----- GALLERY -----
function renderGallery() {
  const items = siteData.gallery.map((g, i) => `
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
  `).join('');

  adminContent.innerHTML = `
    <div class="content-header">
      <h3>Foto / Gallery</h3>
      <p>Kelola foto-foto yang ditampilkan di gallery website.</p>
    </div>
    <div class="admin-card">
      <h4><span class="material-symbols-outlined" style="font-size:20px;">collections</span> Koleksi Foto (${siteData.gallery.length})</h4>
      <div class="gallery-grid" id="gallery-grid">${items}</div>
      <div class="btn-group">
        <button class="btn-secondary" id="btn-add-gallery">
          <span class="material-symbols-outlined" style="font-size:18px;">add_photo_alternate</span>
          Tambah Foto
        </button>
      </div>
    </div>
  `;

  $('#btn-add-gallery').addEventListener('click', () => {
    openModal('Tambah Foto', `
      <div class="field-group">
        <label for="modal-gal-img">Path Gambar</label>
        <input type="text" id="modal-gal-img" placeholder="/images/citumang/citumang-01.jpg"/>
      </div>
      <div class="field-group">
        <label for="modal-gal-alt">Keterangan / Alt Text</label>
        <input type="text" id="modal-gal-alt" placeholder="Deskripsi foto"/>
      </div>
    `, async () => {
      const data = {
        image: $('#modal-gal-img').value.trim(),
        alt: $('#modal-gal-alt').value.trim(),
        order: siteData.gallery.length + 1
      };
      if (!data.image) return;
      const docRef = await addDoc(collection(db, 'gallery'), { ...data, createdAt: serverTimestamp() });
      siteData.gallery.push({ id: docRef.id, ...data });
      closeModal();
      renderGallery();
    });
  });

  window._editGallery = (i) => {
    const g = siteData.gallery[i];
    openModal('Edit Foto', `
      <div class="field-group">
        <label for="modal-gal-img">Path Gambar</label>
        <input type="text" id="modal-gal-img" value="${esc(g.image)}"/>
      </div>
      <div class="field-group">
        <label for="modal-gal-alt">Keterangan / Alt Text</label>
        <input type="text" id="modal-gal-alt" value="${esc(g.alt || '')}"/>
      </div>
    `, async () => {
      const data = { image: $('#modal-gal-img').value.trim(), alt: $('#modal-gal-alt').value.trim() };
      if (g.id) await updateDoc(doc(db, 'gallery', g.id), { ...data, updatedAt: serverTimestamp() });
      siteData.gallery[i] = { ...g, ...data };
      closeModal();
      renderGallery();
    });
  };

  window._deleteGallery = async (i) => {
    if (!confirm('Hapus foto ini dari gallery?')) return;
    const g = siteData.gallery[i];
    if (g.id) await deleteDoc(doc(db, 'gallery', g.id));
    siteData.gallery.splice(i, 1);
    renderGallery();
  };
}

// ===== HELPERS =====
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function saveDoc(collName, docId, data, statusId) {
  const statusEl = $(`#${statusId}`);
  try {
    await setDoc(doc(db, collName, docId), data, { merge: true });
    // Update local data
    if (collName === 'siteConfig') {
      siteData[docId] = { ...siteData[docId], ...data };
    }
    if (statusEl) {
      statusEl.className = 'status-msg success';
      statusEl.textContent = '✓ Berhasil disimpan!';
      setTimeout(() => { statusEl.className = 'status-msg'; }, 3000);
    }
  } catch (err) {
    console.error('Save error:', err);
    if (statusEl) {
      statusEl.className = 'status-msg error';
      statusEl.textContent = '✗ Gagal menyimpan: ' + err.message;
    }
  }
}

function openModal(title, bodyHtml, onSave) {
  editModalContent.innerHTML = `
    <h3>${title}</h3>
    ${bodyHtml}
    <div class="modal-actions">
      <button class="btn-secondary" id="modal-cancel">Batal</button>
      <button class="btn-primary" id="modal-save">
        <span class="material-symbols-outlined" style="font-size:18px;">save</span>
        Simpan
      </button>
    </div>
  `;
  editModal.classList.add('show');

  $('#modal-cancel').addEventListener('click', closeModal);
  $('#modal-save').addEventListener('click', async () => {
    const saveBtn = $('#modal-save');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner"></span>';
    try {
      await onSave();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">save</span> Simpan';
    }
  });
}

function closeModal() {
  editModal.classList.remove('show');
}
