import React, { useEffect, useState } from 'react';
import { siteConfig } from '../config/siteConfig';

export default function PageLoader({ onFinish }) {
  const [stage, setStage] = useState('entering'); // entering -> fading -> done

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      onFinish();
      return;
    }

    const timer1 = setTimeout(() => {
      setStage('fading');
    }, 1100);

    const timer2 = setTimeout(() => {
      setStage('done');
      if (onFinish) onFinish();
    }, 1600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onFinish]);

  if (stage === 'done') return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary transition-opacity duration-500 ${
        stage === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center justify-center text-center p-6 space-y-4 animate-scale-smooth">
        {/* Logo Container with subtle glow */}
        <div className="relative flex items-center justify-center">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-surface-container-high/20 backdrop-blur-md flex items-center justify-center p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] ring-2 ring-secondary-fixed/40">
            <img
              src={siteConfig.logo}
              alt="Logo Citumang"
              className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover"
            />
          </div>
        </div>

        {/* Brand Text */}
        <div className="flex flex-col items-center">
          <h1 className="font-headline-sm text-2xl md:text-3xl text-surface-container-lowest tracking-wider font-semibold">
            CITUMANG
          </h1>
          <span className="font-label-sm text-xs md:text-sm text-secondary-fixed uppercase tracking-[0.3em] mt-1 font-medium">
            PANGANDARAN
          </span>
        </div>

        {/* Elegant subtle status line */}
        <div className="w-24 h-0.5 bg-secondary-fixed/30 rounded-full overflow-hidden mt-2">
          <div className="w-full h-full bg-secondary-fixed animate-pulse"></div>
        </div>
        <p className="text-surface-container-high/80 text-xs font-light tracking-widest uppercase">
          Suaka Alam Sungai Karst
        </p>
      </div>
    </div>
  );
}
