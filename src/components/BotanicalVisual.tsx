import React, { useEffect, useState } from 'react';
import type { Product } from '../types/ecommerce';

interface BotanicalVisualProps {
  theme: Product['visualTheme'];
  title: string;
  subtitle?: string;
  isDraft?: boolean;
  imageUrl?: string;
  compact?: boolean;
  className?: string;
}

const THEME_SURFACES: Record<Product['visualTheme'], string> = {
  'sage-botanical': 'bg-[#F2F0E8]',
  'champagne-oil': 'bg-[#F5EFE3]',
  'ivory-milk': 'bg-[#F7F3EA]',
  'forest-balm': 'bg-[#EDF0EC]',
  'terracotta-clay': 'bg-[#F3ECE4]',
  'draft-blueprint': 'bg-[#F0EDE6]',
};

export const EMAUS_DEFAULT_LOGO_URL = '/assets/aistudio/emaus_transparent_5faf7a4d.png';

/**
 * Displays the official product photo when present and valid, or falls back
 * seamlessly to the official Emaüs Skin Care logo emblem.
 */
export function BotanicalVisual({
  theme,
  title,
  subtitle,
  isDraft,
  imageUrl,
  compact = false,
  className = 'aspect-[4/3]',
}: BotanicalVisualProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  const cleanImageUrl = imageUrl?.trim();

  if (cleanImageUrl && !imgError) {
    return (
      <div className={`relative overflow-hidden bg-[#F3EFE6] ${className}`}>
        <img
          src={cleanImageUrl}
          alt={title}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
        />
        {isDraft && !compact && (
          <span className="absolute top-3 left-3 border border-[var(--color-border-strong)] bg-[var(--color-white)]/90 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-muted)]">
            À valider
          </span>
        )}
      </div>
    );
  }

  const bgSurface = THEME_SURFACES[theme] || 'bg-[#F4F1EA]';

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden ${
        compact ? 'p-2' : 'p-6'
      } ${bgSurface} ${className}`}
      role="img"
      aria-label={`Emaüs Skin Care — ${title}`}
    >
      {isDraft && !compact && (
        <span className="absolute top-3 left-3 border border-[var(--color-border-strong)] bg-[var(--color-white)]/90 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-muted)]">
          À valider
        </span>
      )}

      <img
        src={EMAUS_DEFAULT_LOGO_URL}
        alt={`Emaüs Skin Care — ${title}`}
        className={`${
          compact ? 'max-h-[78%] max-w-[78%]' : 'max-h-[60%] max-w-[60%]'
        } object-contain opacity-95 drop-shadow-[0_2px_8px_rgba(32,61,50,0.08)] transition-transform duration-500 ease-out group-hover:scale-105`}
      />

      {subtitle && !compact && (
        <span className="mt-3 text-[11px] font-medium tracking-[0.06em] text-[var(--color-ink-muted)]">
          {subtitle}
        </span>
      )}
    </div>
  );
}
