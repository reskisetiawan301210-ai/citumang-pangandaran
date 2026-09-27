/**
 * Data Identitas Provider / Pengelola Resmi Citumang Pangandaran
 * Struktur modular yang memudahkan pengelola untuk memperbarui informasi
 * (nama, peran, deskripsi, foto, kontak, media sosial) tanpa mengubah kode layout.
 */

export const providerData = {
  // Identitas & Jabatan
  name: "Pengelola Resmi Citumang",
  role: "Official Provider & Tour Coordinator",
  badge: "Provider Resmi Terverifikasi",
  experienceTag: "Pelayanan Wisata & Reservasi Resmi",
  
  // Deskripsi Faktual (tidak mengarang biodata pribadi)
  description: "Koordinator layanan wisata dan pemesanan paket resmi Citumang Pangandaran. Siap melayani dan mendampingi kunjungan wisatawan untuk petualangan body rafting yang aman, nyaman, dan berkesan.",
  
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
      title: "Pemandu Bersertifikat",
      desc: "Instruktur river guide lokal berpengalaman dan berlisensi."
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
