import React, { useState, useEffect } from 'react';
import { siteConfig } from '../config/siteConfig';

export default function Navbar({ onOpenReservation }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('beranda');

  const navLinks = [
    { name: 'Beranda', href: '#beranda', id: 'beranda' },
    { name: 'Tentang', href: '#tentang', id: 'tentang' },
    { name: 'Aktivitas', href: '#aktivitas', id: 'aktivitas' },
    { name: 'Galeri', href: '#galeri', id: 'galeri' },
    { name: 'Fasilitas', href: '#fasilitas', id: 'fasilitas' },
    { name: 'Informasi', href: '#informasi', id: 'informasi' },
    { name: 'Kontak', href: '#kontak', id: 'kontak' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      // Deteksi active section saat scroll
      const sections = navLinks.map(link => document.getElementById(link.id));
      const scrollPosition = window.scrollY + 120;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(navLinks[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e, href, id) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    setActiveSection(id);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-surface/95 backdrop-blur-xl shadow-[0_4px_20px_rgba(11,59,44,0.08)] py-0'
          : 'bg-surface/85 backdrop-blur-xl shadow-[0_1px_12px_rgba(11,59,44,0.05)]'
      }`}
    >
      <div className="h-20 w-full max-w-7xl mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <a
          href="#beranda"
          onClick={(e) => handleNavClick(e, '#beranda', 'beranda')}
          className="flex items-center gap-space-sm group focus:outline-none"
        >
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center p-0.5 shadow-[0_2px_8px_rgba(0,36,25,0.08)] group-hover:scale-105 transition-transform duration-300">
              <img
                src={siteConfig.logo}
                alt="Logo Citumang Pangandaran"
                className="w-8 h-8 rounded-full object-cover"
              />
            </div>
          </div>
          <div className="flex flex-col text-left">
            <span className="font-headline-sm text-headline-sm text-primary tracking-wide leading-none group-hover:text-secondary transition-colors">
              CITUMANG
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-[0.2em] mt-1">
              PANGANDARAN
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.id}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href, link.id)}
                className={`px-space-sm py-space-xs font-label-md text-label-md uppercase tracking-wider transition-all duration-200 rounded-lg ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container shadow-sm font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                }`}
              >
                {link.name}
              </a>
            );
          })}
        </nav>

        {/* Action Button & Mobile Hamburger */}
        <div className="flex items-center gap-space-sm">
          {/* Reservasi Button */}
          <button
            onClick={() => onOpenReservation()}
            type="button"
            className="hidden sm:inline-flex items-center gap-space-xs bg-primary-container text-on-primary px-space-md py-space-xs rounded-lg font-label-md text-label-md uppercase tracking-wider hover:bg-secondary transition-all duration-300 shadow-[0_8px_20px_-4px_rgba(0,106,97,0.25)] group"
          >
            <span className="translate-y-0.5">Reservasi</span>
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform duration-200">
              arrow_forward
            </span>
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors focus:outline-none"
            aria-label={mobileMenuOpen ? 'Tutup Menu Navigasi' : 'Buka Menu Navigasi'}
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown Menu */}
      <div
        className={`xl:hidden transition-all duration-300 ease-in-out border-b border-outline-variant/30 overflow-hidden ${
          mobileMenuOpen ? 'max-h-[500px] opacity-100 bg-surface/98 backdrop-blur-2xl' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="px-margin md:px-margin-tablet py-4 space-y-2">
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.id}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href, link.id)}
                className={`block px-4 py-2.5 rounded-lg font-label-md uppercase tracking-wider text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-container text-on-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                {link.name}
              </a>
            );
          })}
          <div className="pt-2 sm:hidden">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenReservation();
              }}
              type="button"
              className="w-full flex items-center justify-center gap-2 bg-secondary text-on-secondary px-4 py-3 rounded-lg font-label-md uppercase tracking-wider shadow-md text-sm"
            >
              <span>Reservasi Sekarang</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
