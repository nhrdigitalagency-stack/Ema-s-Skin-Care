import React, { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORY_LABELS, normalizeSearch, tLoc, UI_STRINGS } from '../i18n/translations';
import type { CategorySlug } from '../types/ecommerce';
import { ProductCard } from '../components/ProductCard';
import { MotionProductGrid, MotionSection } from '../components/MotionSection';

interface CatalogPageProps {
  collectionSlug?: CategorySlug;
}

const PAGE_SIZE = 9;

export function CatalogPage({ collectionSlug }: CatalogPageProps) {
  const { lang, bootstrap, searchParams, navigate } = useStore();
  const str = UI_STRINGS[lang];

  const [queryInput, setQueryInput] = useState(searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(queryInput);
  const [categoryFilter, setCategoryFilter] = useState<string>(collectionSlug || searchParams.get('cat') || 'all');
  const [zoneFilter, setZoneFilter] = useState<string>(searchParams.get('zone') || 'all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>(searchParams.get('stock') || 'all');
  const [skinTypeFilter, setSkinTypeFilter] = useState<string>(searchParams.get('skin') || 'all');
  const [needFilter, setNeedFilter] = useState<string>(searchParams.get('need') || 'all');
  const [maxPrice, setMaxPrice] = useState<string>(searchParams.get('maxPrice') || '');
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort') || 'featured');
  const [showDrafts, setShowDrafts] = useState<boolean>(searchParams.get('drafts') === '1');
  const [page, setPage] = useState<number>(Math.max(1, Number(searchParams.get('page')) || 1));
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (collectionSlug) setCategoryFilter(collectionSlug);
  }, [collectionSlug]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(queryInput), 180);
    return () => window.clearTimeout(id);
  }, [queryInput]);

  // Persist filters in URL without full reload
  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedQuery.trim()) next.set('q', debouncedQuery.trim());
    if (!collectionSlug && categoryFilter !== 'all') next.set('cat', categoryFilter);
    if (zoneFilter !== 'all') next.set('zone', zoneFilter);
    if (availabilityFilter !== 'all') next.set('stock', availabilityFilter);
    if (skinTypeFilter !== 'all') next.set('skin', skinTypeFilter);
    if (needFilter !== 'all') next.set('need', needFilter);
    if (maxPrice) next.set('maxPrice', maxPrice);
    if (sortBy !== 'featured') next.set('sort', sortBy);
    if (showDrafts) next.set('drafts', '1');
    if (page > 1) next.set('page', String(page));

    const qs = next.toString();
    const base = collectionSlug ? `/collections/${collectionSlug}` : '/boutique';
    window.history.replaceState({}, '', qs ? `${base}?${qs}` : base);
  }, [
    debouncedQuery,
    categoryFilter,
    zoneFilter,
    availabilityFilter,
    skinTypeFilter,
    needFilter,
    maxPrice,
    sortBy,
    showDrafts,
    page,
    collectionSlug,
  ]);

  const products = bootstrap?.products || [];

  const availableCategories = useMemo(() => {
    const relevant = showDrafts ? products : products.filter((p) => p.status === 'published');
    return Array.from(new Set(relevant.map((p) => p.category))) as CategorySlug[];
  }, [products, showDrafts]);

  const allSkinTypes = useMemo(() => {
    return Array.from(new Set(products.flatMap((p) => p.skinTypes))).filter(Boolean);
  }, [products]);

  const allNeeds = useMemo(() => {
    return Array.from(new Set(products.flatMap((p) => p.cosmeticNeeds))).filter(Boolean);
  }, [products]);

  const filtered = useMemo(() => {
    const normQ = normalizeSearch(debouncedQuery);
    const maxP = maxPrice ? Number(maxPrice) : null;

    const list = products.filter((p) => {
      if (!showDrafts && p.status !== 'published') return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (zoneFilter !== 'all' && p.applicationZone !== zoneFilter) return false;
      if (skinTypeFilter !== 'all' && !p.skinTypes.includes(skinTypeFilter)) return false;
      if (needFilter !== 'all' && !p.cosmeticNeeds.includes(needFilter)) return false;

      const totalAvail = p.variants.reduce((sum, v) => sum + (v.sellable ? v.availableQty : 0), 0);
      if (availabilityFilter === 'in_stock' && totalAvail <= 0) return false;

      if (maxP && Number.isFinite(maxP)) {
        const minVarPrice = p.variants
          .map((v) => v.priceXaf)
          .filter((x): x is number => x !== null)
          .sort((a, b) => a - b)[0];
        if (minVarPrice === undefined || minVarPrice > maxP) return false;
      }

      if (normQ) {
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
        if (!hay.includes(normQ)) return false;
      }

      return true;
    });

    if (sortBy === 'price_asc' || sortBy === 'price_desc') {
      return [...list].sort((a, b) => {
        const pa = a.variants[0]?.priceXaf ?? Number.MAX_SAFE_INTEGER;
        const pb = b.variants[0]?.priceXaf ?? Number.MAX_SAFE_INTEGER;
        return sortBy === 'price_asc' ? pa - pb : pb - pa;
      });
    }
    return list;
  }, [
    products,
    showDrafts,
    categoryFilter,
    zoneFilter,
    skinTypeFilter,
    needFilter,
    availabilityFilter,
    maxPrice,
    debouncedQuery,
    sortBy,
    lang,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetFilters = () => {
    setQueryInput('');
    setDebouncedQuery('');
    if (!collectionSlug) setCategoryFilter('all');
    setZoneFilter('all');
    setAvailabilityFilter('all');
    setSkinTypeFilter('all');
    setNeedFilter('all');
    setMaxPrice('');
    setSortBy('featured');
    setShowDrafts(false);
    setPage(1);
  };

  const pageTitle = collectionSlug
    ? tLoc(CATEGORY_LABELS[collectionSlug], lang)
    : lang === 'fr'
    ? 'Catalogue des soins'
    : 'Skincare Catalog';

  const filterControls = (
    <div className="space-y-6 text-sm">
      <div>
        <label htmlFor="catalog-search" className="block text-xs font-medium text-[var(--color-ink-muted)]">
          {lang === 'fr' ? 'Recherche (nom, SKU, ingrédient)' : 'Search (name, SKU, ingredient)'}
        </label>
        <input
          id="catalog-search"
          type="search"
          value={queryInput}
          onChange={(e) => {
            setQueryInput(e.target.value);
            setPage(1);
          }}
          placeholder={lang === 'fr' ? 'Ex. karité, EMS-NET-200…' : 'e.g. shea, EMS-NET-200…'}
          className="mt-1.5 h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-white)] px-3 text-sm"
        />
      </div>

      {!collectionSlug && (
        <div>
          <label htmlFor="filter-cat" className="block text-xs font-medium text-[var(--color-ink-muted)]">
            {lang === 'fr' ? 'Catégorie' : 'Category'}
          </label>
          <select
            id="filter-cat"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="mt-1.5 h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-white)] px-3 text-sm"
          >
            <option value="all">{lang === 'fr' ? 'Toutes les catégories' : 'All categories'}</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {tLoc(CATEGORY_LABELS[c], lang)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="filter-zone" className="block text-xs font-medium text-[var(--color-ink-muted)]">
          {lang === 'fr' ? 'Zone d’application' : 'Application area'}
        </label>
        <select
          id="filter-zone"
          value={zoneFilter}
          onChange={(e) => {
            setZoneFilter(e.target.value);
            setPage(1);
          }}
          className="mt-1.5 h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-white)] px-3 text-sm"
        >
          <option value="all">{lang === 'fr' ? 'Toutes zones' : 'All areas'}</option>
          <option value="face">{lang === 'fr' ? 'Visage' : 'Face'}</option>
          <option value="body">{lang === 'fr' ? 'Corps' : 'Body'}</option>
          <option value="hair">{lang === 'fr' ? 'Cheveux' : 'Hair'}</option>
          <option value="cleansing">{lang === 'fr' ? 'Nettoyage' : 'Cleansing'}</option>
        </select>
      </div>

      {allSkinTypes.length > 0 && (
        <div>
          <label htmlFor="filter-skin" className="block text-xs font-medium text-[var(--color-ink-muted)]">
            {lang === 'fr' ? 'Type de peau renseigné' : 'Skin type'}
          </label>
          <select
            id="filter-skin"
            value={skinTypeFilter}
            onChange={(e) => {
              setSkinTypeFilter(e.target.value);
              setPage(1);
            }}
            className="mt-1.5 h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-white)] px-3 text-sm"
          >
            <option value="all">{lang === 'fr' ? 'Tous types renseignés' : 'All skin types'}</option>
            {allSkinTypes.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      )}

      {allNeeds.length > 0 && (
        <div>
          <label htmlFor="filter-need" className="block text-xs font-medium text-[var(--color-ink-muted)]">
            {lang === 'fr' ? 'Besoin cosmétique' : 'Cosmetic need'}
          </label>
          <select
            id="filter-need"
            value={needFilter}
            onChange={(e) => {
              setNeedFilter(e.target.value);
              setPage(1);
            }}
            className="mt-1.5 h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-white)] px-3 text-sm"
          >
            <option value="all">{lang === 'fr' ? 'Tous besoins' : 'All needs'}</option>
            {allNeeds.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="filter-stock" className="block text-xs font-medium text-[var(--color-ink-muted)]">
          {lang === 'fr' ? 'Disponibilité' : 'Availability'}
        </label>
        <select
          id="filter-stock"
          value={availabilityFilter}
          onChange={(e) => {
            setAvailabilityFilter(e.target.value);
            setPage(1);
          }}
          className="mt-1.5 h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-white)] px-3 text-sm"
        >
          <option value="all">{lang === 'fr' ? 'Tous' : 'All'}</option>
          <option value="in_stock">{lang === 'fr' ? 'En stock uniquement' : 'In stock only'}</option>
        </select>
      </div>

      <div>
        <label htmlFor="filter-max-price" className="block text-xs font-medium text-[var(--color-ink-muted)]">
          {lang === 'fr' ? 'Budget maximum (XAF)' : 'Max price (XAF)'}
        </label>
        <input
          id="filter-max-price"
          type="number"
          min={0}
          step={500}
          value={maxPrice}
          onChange={(e) => {
            setMaxPrice(e.target.value);
            setPage(1);
          }}
          placeholder="15000"
          className="mt-1.5 h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-white)] px-3 text-sm tabular-nums"
        />
      </div>

      <label className="flex items-start gap-2.5 pt-2 text-xs text-[var(--color-ink-muted)]">
        <input
          type="checkbox"
          checked={showDrafts}
          onChange={(e) => {
            setShowDrafts(e.target.checked);
            setPage(1);
          }}
          className="mt-0.5 h-4 w-4 accent-[var(--color-forest)]"
        />
        <span>
          {lang === 'fr'
            ? 'Inclure les références historiques en brouillon (non vendables)'
            : 'Include historical draft references (not yet purchasable)'}
        </span>
      </label>

      <button
        type="button"
        onClick={resetFilters}
        className="w-full rounded-full border border-[var(--color-border-strong)] py-2.5 text-xs font-medium text-[var(--color-forest)] hover:bg-[var(--color-white)]"
      >
        {str.common.reset}
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <MotionSection className="border-b border-[var(--color-border)] pb-6">
        {collectionSlug && (
          <button
            type="button"
            onClick={() => navigate('/boutique')}
            className="mb-2 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-forest)] hover:underline"
          >
            ← {lang === 'fr' ? 'Tout le catalogue' : 'Full catalog'}
          </button>
        )}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-editorial text-4xl font-medium text-[var(--color-forest)]">{pageTitle}</h1>
            <p className="mt-1.5 text-sm text-[var(--color-ink-muted)] tabular-nums">
              {filtered.length}{' '}
              {lang === 'fr'
                ? filtered.length > 1
                  ? 'références affichées'
                  : 'référence affichée'
                : filtered.length === 1
                ? 'item shown'
                : 'items shown'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-white)] px-4 text-xs font-medium text-[var(--color-forest)] lg:hidden"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>{lang === 'fr' ? 'Filtres' : 'Filters'}</span>
            </button>

            <label htmlFor="catalog-sort" className="sr-only">
              Trier
            </label>
            <select
              id="catalog-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 border border-[var(--color-border-strong)] bg-[var(--color-white)] px-3 text-xs font-medium text-[var(--color-ink)]"
            >
              <option value="featured">{lang === 'fr' ? 'Tri : sélection' : 'Sort: featured'}</option>
              <option value="price_asc">{lang === 'fr' ? 'Prix croissant' : 'Price: low to high'}</option>
              <option value="price_desc">{lang === 'fr' ? 'Prix décroissant' : 'Price: high to low'}</option>
            </select>
          </div>
        </div>
      </MotionSection>

      <MotionSection className="mt-8 grid gap-10 lg:grid-cols-12">
        <aside className="hidden lg:col-span-3 lg:block">{filterControls}</aside>

        <div className="lg:col-span-9">
          {paginated.length === 0 ? (
            <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-10 text-center">
              <p className="font-editorial text-2xl text-[var(--color-forest)]">
                {lang === 'fr' ? 'Aucun soin ne correspond à ces critères.' : 'No items match your current filters.'}
              </p>
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                {lang === 'fr'
                  ? 'Essayez d’élargir votre recherche ou réinitialisez les filtres actifs.'
                  : 'Try broadening your search terms or resetting active filters.'}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 rounded-full bg-[var(--color-forest)] px-6 py-2.5 text-xs font-medium text-white"
              >
                {str.common.reset}
              </button>
            </div>
          ) : (
            <>
              <MotionProductGrid
                key={`${categoryFilter}-${zoneFilter}-${availabilityFilter}-${skinTypeFilter}-${needFilter}-${sortBy}-${safePage}-${showDrafts}-${debouncedQuery}`}
                animateOnMount
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {paginated.map((product, idx) => (
                  <ProductCard key={product.id} product={product} index={idx} />
                ))}
              </MotionProductGrid>

              {totalPages > 1 && (
                <nav
                  aria-label="Pagination catalogue"
                  className="mt-10 flex items-center justify-center gap-2 border-t border-[var(--color-border)] pt-6"
                >
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pNum) => (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setPage(pNum)}
                      aria-current={pNum === safePage ? 'page' : undefined}
                      className={`h-10 w-10 rounded-full text-xs font-medium tabular-nums ${
                        pNum === safePage
                          ? 'bg-[var(--color-forest)] text-white'
                          : 'border border-[var(--color-border-strong)] bg-[var(--color-white)] text-[var(--color-ink)]'
                      }`}
                    >
                      {pNum}
                    </button>
                  ))}
                </nav>
              )}
            </>
          )}
        </div>
      </MotionSection>

      {/* Mobile Filters Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Filtres catalogue">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative ml-auto h-full w-full max-w-xs overflow-y-auto bg-[var(--color-ivory)] p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h2 className="font-editorial text-2xl text-[var(--color-forest)]">
                {lang === 'fr' ? 'Filtres' : 'Filters'}
              </h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label={str.common.close}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--color-beige)]/50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {filterControls}
          </div>
        </div>
      )}
    </div>
  );
}
