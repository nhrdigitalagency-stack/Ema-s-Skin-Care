import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { EDITORIAL_EASE } from './MotionSection';

export function GiantBrandBanner() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative overflow-hidden bg-[#132d22] py-16 sm:py-24 lg:py-28 text-white select-none">
      {/* Background glow and subtle gradient vignette */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#0d2119] via-[#16382b] to-[#0d2119] opacity-90" />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,245,155,0.08)_0%,transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: EDITORIAL_EASE }}
          className="space-y-4"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#d9c39b]">
            Les Laboratoires Emaüs · Douala, Cameroun
          </p>

          <h2 className="font-editorial text-balance text-[clamp(2.8rem,9vw,9.5rem)] font-extrabold leading-[0.92] tracking-tight text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
            EMAÜS SKIN CARE
          </h2>

          <p className="mx-auto max-w-xl text-sm leading-relaxed text-[#cde0d5] sm:text-base">
            La cosmétique qui écoute votre peau · Formules validées, INCI transparentes et traçabilité rigoureuse.
          </p>
        </motion.div>
      </div>

      {/* Decorative hairline separator */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#d9c39b]/40 to-transparent" />
    </div>
  );
}
