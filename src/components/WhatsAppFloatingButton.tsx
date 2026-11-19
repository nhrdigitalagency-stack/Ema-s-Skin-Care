import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function WhatsAppFloatingButton() {
  const { lang, path, bootstrap } = useStore();
  const reduceMotion = useReducedMotion();

  // Hide on admin back-office to avoid cluttering data tables
  if (path.startsWith('/admin')) return null;

  const rawNumber = bootstrap?.settings.whatsappPhone || '+237 6 97 70 50 69';
  const digits = rawNumber.replace(/[^0-9]/g, '') || '237697705069';
  const greeting =
    lang === 'fr'
      ? 'Bonjour Emaüs Skin Care, je souhaite obtenir un renseignement auprès du service client.'
      : 'Hello Emaüs Skin Care, I would like assistance from customer service.';
  const href = `https://wa.me/${digits}?text=${encodeURIComponent(greeting)}`;

  // Clear both mobile bottom bar (56px) and mobile PDP sticky add-to-cart bar
  const isProductPage = path.startsWith('/produits/');
  const mobileBottomClass = isProductPage ? 'bottom-[124px]' : 'bottom-20';

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={
        lang === 'fr'
          ? 'Contacter le service client WhatsApp au +237 6 97 70 50 69'
          : 'Contact customer support on WhatsApp at +237 6 97 70 50 69'
      }
      initial={reduceMotion ? false : { opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduceMotion ? undefined : { scale: 1.04, y: -2 }}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      className={`fixed right-4 ${mobileBottomClass} z-30 inline-flex items-center gap-2.5 rounded-full border border-[#1E6B43]/30 bg-[#1B7A46] px-4 py-3 text-xs font-medium text-white shadow-[0_10px_28px_rgba(27,122,70,0.28)] transition-colors hover:bg-[#156338] lg:bottom-6 lg:right-6`}
    >
      <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline whitespace-nowrap">
        {lang === 'fr' ? 'Service client' : 'Customer Care'}
      </span>
    </motion.a>
  );
}
