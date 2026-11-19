import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Search, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORY_LABELS, formatXaf, normalizeSearch, tLoc, UI_STRINGS } from '../i18n/translations';
import { BotanicalVisual } from './BotanicalVisual';
import { EDITORIAL_EASE } from './MotionSection';

export function SearchModal() {
  const { lang, searchOpen, setSearchOpen, bootstrap, navigate } = useStore();
  const str = UI_STRINGS[lang];
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      } else if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen, setSearchOpen]);

  useEffect(() => {
    if (searchOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [searchOpen]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 180);
    return () => window.clearTimeout(id);
  }, [query]);

  const results = useMemo(() => {
    if (!bootstrap) return [];
    const norm = normalizeSearch(debounced);
    if (!norm) return bootstrap.products.filter((p) => p.status === 'published').slice(0, 4);
    return bootstrap.products.filter((p) => {
      const hay = normalizeSearch(
        [
          p.name.fr,
          p.name.en,
          p.range,
          tLoc(CATEGORY_LABELS[p.category], lang),
          p.inci,
          ...p.variants.map((v) => v.sku),
        ].join(' ')
      );
      return hay.includes(norm);
    });
  }, [bootstrap, debounced, lang]);

  return (
    <AnimatePresence>
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-16 sm:pt-24"
          role="dialog"
          aria-modal="true"
          aria-label={str.nav.search}
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => setSearchOpen(false)}
            aria-hidden="true"
          />
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.985 }}
            transition={{ duration: 0.26, ease: EDITORIAL_EASE }}
            className="relative w-full max-w-2xl border border-[var(--color-border)] bg-[var(--color-ivory)] shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-4">
              <Search className="h-4 w-4 text-[var(--color-ink-muted)]" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  lang === 'fr'
                    ? 'Rechercher un soin, une gamme, une référence SKU ou un ingrédient…'
                    : 'Search skincare, line, SKU, or ingredient…'
                }
                className="w-full bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label={str.common.close}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--color-beige)]/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-5">
              {results.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-[var(--color-ink-muted)]">
                    {lang === 'fr'
                      ? `Aucun produit ne correspond à « ${debounced} ».`
                      : `No product matches "${debounced}".`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      navigate('/boutique');
                    }}
                    className="mt-4 rounded-full border border-[var(--color-border-strong)] px-5 py-2 text-xs font-medium text-[var(--color-forest)]"
                  >
                    {lang === 'fr' ? 'Voir tout le catalogue' : 'Browse full catalog'}
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {results.map((prod) => (
                    <li key={prod.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          navigate(`/produits/${prod.slug}`);
                        }}
                        className="group flex w-full items-center justify-between gap-4 px-2 py-3 text-left transition-colors hover:bg-[var(--color-beige)]/30"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-12 w-12 shrink-0 overflow-hidden border border-[var(--color-border)]">
                            <BotanicalVisual
                              theme={prod.visualTheme}
                              title={tLoc(prod.name, lang)}
                              imageUrl={prod.imageUrl}
                              compact
                              className="h-full w-full"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--color-ink)]">{tLoc(prod.name, lang)}</p>
                            <p className="truncate text-xs text-[var(--color-ink-muted)]">
                              {prod.range} · {prod.variants[0]?.sku}
                              {prod.status === 'draft_pending_validation' ? ` · ${str.product.draftPending}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 tabular-nums text-sm font-medium text-[var(--color-forest)]">
                          {formatXaf(prod.variants[0]?.priceXaf, lang)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-white)] px-5 py-3 text-xs text-[var(--color-ink-muted)]">
              <span>{lang === 'fr' ? 'Recherche insensible aux accents' : 'Accent-insensitive search'}</span>
              <button
                type="button"
                onClick={() => {
                  const target = debounced.trim() ? `/boutique?q=${encodeURIComponent(debounced.trim())}` : '/boutique';
                  setSearchOpen(false);
                  navigate(target);
                }}
                className="font-medium text-[var(--color-forest)] hover:underline"
              >
                {lang === 'fr' ? 'Afficher dans la boutique →' : 'Open in shop →'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
