/**
 * Data Identitas Provider / Pengelola Citumang Pangandaran
 * Struktur modular yang memudahkan pengelola untuk memperbarui informasi
 * (nama, peran, deskripsi, foto, kontak, media sosial) tanpa mengubah kode layout.
 */

export const providerData = {
  // Identitas & Peran
  name: "Pinggih Priatna",
  role: "Pengelola & Provider Wisata Citumang Pangandaran",
  badge: "Pengelola & Provider Body Rafting",
  experienceTag: "Koordinator Layanan Body Rafting & Pemandu Lokal",
  
  // Deskripsi Faktual (berdasarkan layanan riil di lapangan)
  description: "Pengelola dan koordinator penyedia layanan wisata body rafting Citumang Pangandaran. Bertanggung jawab melayani reservasi paket body rafting, penyediaan pemandu lokal berpengalaman, perlengkapan pelampung dan helm keselamatan, dokumentasi kegiatan susur sungai, serta hidangan nasi liwet hangat khas Sunda di Desa Bojong, Parigi, Pangandaran.",
  
  // Aset Foto Transparan (PNG & Modern WebP)
  image: "/images/provider/provider.png",
  imageWebp: "/images/provider/provider.webp",
  alt: "Pinggih Priatna - Pengelola dan Provider Wisata Citumang Pangandaran",
  
  // Media Sosial & Kontak
  social: {
    whatsappDisplay: "0812-2132-5957",
    whatsappUrl: "https://wa.me/6281221325957",
    instagram: "@citumangpangandaran01",
    instagramUrl: "https://instagram.com/citumangpangandaran01",
    tiktok: "@citumangpangandaran01",
    tiktokUrl: "https://www.tiktok.com/@citumangpangandaran01"
  },
  
  // Poin Layanan Utama
  highlights: [
    {
      icon: "verified_user",
      title: "Pemandu Lokal Berpengalaman",
      desc: "Didampingi pemandu lokal yang memahami karakteristik aliran dan gua sungai Citumang."
    },
    {
      icon: "headset_mic",
      title: "Respon & Konsultasi Langsung",
      desc: "Konsultasi rute, kondisi air, dan jadwal kedatangan langsung via WhatsApp."
    },
    {
      icon: "sell",
      title: "Paket Lengkap Mulai Rp69.000",
      desc: "Mencakup 9 fasilitas: rafting 1,5 KM, alat safety, pemandu, dokumentasi, dan makan liwet."
    }
  ]
};
