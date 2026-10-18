/**
 * Data Identitas Provider / Pengelola Resmi Citumang Pangandaran
 * Struktur modular yang memudahkan pengelola untuk memperbarui informasi
 * (nama, peran, deskripsi, foto, kontak, media sosial) tanpa mengubah kode layout.
 */

export const providerData = {
  // Identitas & Jabatan
  name: "Pinggih Priatna",
  role: "Pengelola & Penyedia Layanan Resmi",
  badge: "Pengelola Resmi Terverifikasi",
  experienceTag: "Pelayanan Wisata & Reservasi Resmi",
  
  // Deskripsi Faktual (tidak mengarang biodata pribadi)
  description: "Pengelola dan koordinator penyedia layanan wisata resmi Citumang Pangandaran. Siap melayani reservasi tiket resmi, pemandu profesional, perlengkapan body rafting, dokumentasi, asuransi, dan sajian nasi liwet khas Citumang.",
  
  // Aset Foto Transparan (PNG & Modern WebP)
  image: "/images/provider/provider.png",
  imageWebp: "/images/provider/provider.webp",
  alt: "Identitas Provider dan Pengelola Resmi Citumang Pangandaran",
  
  // Media Sosial & Kontak Resmi
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
      title: "Pemandu Profesional",
      desc: "Instruktur lokal berpengalaman mendampingi setiap aktivitas body rafting."
    },
    {
      icon: "headset_mic",
      title: "Respon Cepat",
      desc: "Konsultasi rute dan reservasi mudah melalui WhatsApp."
    },
    {
      icon: "sell",
      title: "Harga Resmi Mulai Rp69.000",
      desc: "Transparan tanpa biaya tersembunyi, fasilitas lengkap."
    }
  ]
};
