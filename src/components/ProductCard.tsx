import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Heart, Plus } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORY_LABELS, formatXaf, tLoc, UI_STRINGS } from '../i18n/translations';
import type { Product } from '../types/ecommerce';
import { BotanicalVisual } from './BotanicalVisual';
import { PRODUCT_CARD_VARIANTS } from './MotionSection';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product }: ProductCardProps) {
  const { lang, navigate, addToCart, favorites, toggleFavorite } = useStore();
  const str = UI_STRINGS[lang];
  const reduceMotion = useReducedMotion();
  const isFav = favorites.includes(product.slug);

  const primaryVariant = product.variants[0];
  const hasSingleSellableVariant =
    product.status === 'published' &&
    product.safetyValidated &&
    product.variants.length === 1 &&
    primaryVariant?.sellable &&
    primaryVariant.availableQty > 0 &&
    primaryVariant.priceXaf !== null;

  const totalAvailable = product.variants.reduce((sum, v) => sum + (v.sellable ? v.availableQty : 0), 0);
  const lowestPrice =
    product.variants
      .map((v) => v.priceXaf)
      .filter((p): p is number => p !== null)
      .sort((a, b) => a - b)[0] ?? null;

  return (
    <motion.article
      variants={reduceMotion ? undefined : PRODUCT_CARD_VARIANTS}
      whileHover={reduceMotion ? undefined : { y: -5, scale: 1.012 }}
      className="product-neon-card group flex flex-col border bg-[var(--color-white)]"
    >
      <div className="relative overflow-hidden">
        <a
          href={`/produits/${product.slug}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/produits/${product.slug}`);
          }}
          className="block focus-visible:outline-offset-[-2px]"
        >
          <BotanicalVisual
            theme={product.visualTheme}
            title={tLoc(product.name, lang)}
            subtitle={primaryVariant?.format !== 'À confirmer' ? primaryVariant?.format : undefined}
            isDraft={product.status === 'draft_pending_validation'}
            imageUrl={product.imageUrl}
            className="aspect-[4/3] w-full"
          />
        </a>
        <motion.button
          type="button"
          whileHover={reduceMotion ? undefined : { scale: 1.08 }}
          whileTap={reduceMotion ? undefined : { scale: 0.88 }}
          onClick={() => toggleFavorite(product.slug)}
          aria-label={
            isFav
              ? lang === 'fr'
                ? 'Retirer des favoris'
                : 'Remove from favorites'
              : lang === 'fr'
              ? 'Ajouter aux favoris'
              : 'Add to favorites'
          }
          aria-pressed={isFav}
          className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-ivory)]/90 text-[var(--color-forest)] transition-colors hover:bg-[var(--color-white)]"
        >
          <Heart className={`h-4 w-4 transition-transform duration-200 ${isFav ? 'scale-110 fill-[var(--color-forest)]' : ''}`} />
        </motion.button>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
          <span>{tLoc(CATEGORY_LABELS[product.category], lang)}</span>
          <span aria-hidden="true">·</span>
          <span>{primaryVariant?.format || '—'}</span>
        </div>

        <h3 className="mt-1.5 text-[16px] font-semibold leading-snug text-[var(--color-ink)]">
          <a
            href={`/produits/${product.slug}`}
            onClick={(e) => {
              e.preventDefault();
              navigate(`/produits/${product.slug}`);
            }}
            className="transition-colors hover:text-[var(--color-forest)] hover:underline"
          >
            {tLoc(product.name, lang)}
          </a>
        </h3>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <div>
            <p className="tabular-nums text-[15px] font-medium text-[var(--color-forest)]">
              {lowestPrice !== null
                ? product.variants.length > 1
                  ? `${lang === 'fr' ? 'Dès ' : 'From '}${formatXaf(lowestPrice, lang)}`
                  : formatXaf(lowestPrice, lang)
                : str.product.draftPending}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
              {product.status === 'draft_pending_validation'
                ? str.product.draftPending
                : totalAvailable > 0
                ? `${totalAvailable} ${str.product.unitsLeft}`
                : str.product.outOfStock}
            </p>
          </div>

          {hasSingleSellableVariant ? (
            <motion.button
              type="button"
              whileHover={reduceMotion ? undefined : { scale: 1.03 }}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              onClick={() => addToCart(primaryVariant.id, product.id, product.slug, 1)}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[var(--color-forest)] px-4 text-xs font-medium text-white transition-colors hover:bg-[var(--color-forest-hover)] whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{str.product.quickAdd}</span>
            </motion.button>
          ) : (
            <motion.button
              type="button"
              whileHover={reduceMotion ? undefined : { scale: 1.03 }}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              onClick={() => navigate(`/produits/${product.slug}`)}
              className="inline-flex h-10 shrink-0 items-center rounded-full border border-[var(--color-border-strong)] px-4 text-xs font-medium text-[var(--color-forest)] transition-colors hover:bg-[var(--color-beige)]/40 whitespace-nowrap"
            >
              {lang === 'fr' ? 'Consulter' : 'View'}
            </motion.button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
