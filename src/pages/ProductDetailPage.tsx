import React, { useEffect, useState } from 'react';
import { Heart, Minus, Plus, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORY_LABELS, formatXaf, tLoc, UI_STRINGS } from '../i18n/translations';
import { BotanicalVisual } from '../components/BotanicalVisual';
import { ProductCard } from '../components/ProductCard';
import { MotionProductGrid, MotionSection } from '../components/MotionSection';

export function ProductDetailPage({ slug }: { slug: string }) {
  const { lang, bootstrap, navigate, addToCart, favorites, toggleFavorite, showToast } = useStore();
  const str = UI_STRINGS[lang];

  const product = bootstrap?.products.find((p) => p.slug === slug);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [qty, setQty] = useState(1);

  // Review submission state
  const [reviewName, setReviewName] = useState(bootstrap?.session.user?.fullName || '');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewOrderRef, setReviewOrderRef] = useState('');
  const [reviewConsent, setReviewConsent] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    if (product?.variants[0]) {
      setSelectedVariantId(product.variants[0].id);
      setQty(1);
    }
  }, [product?.id]);

  if (!bootstrap) return null;

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-editorial text-4xl text-[var(--color-forest)]">
          {lang === 'fr' ? 'Produit introuvable' : 'Product not found'}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
          {lang === 'fr'
            ? 'Cette référence n’existe pas ou a été archivée.'
            : 'This product reference does not exist or has been archived.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/boutique')}
          className="mt-6 rounded-full bg-[var(--color-forest)] px-6 py-3 text-xs font-medium text-white"
        >
          {str.cart.browse}
        </button>
      </div>
    );
  }

  const activeVariant = product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];
  const isDraft = product.status === 'draft_pending_validation' || !product.safetyValidated;
  const canBuy =
    !isDraft &&
    Boolean(activeVariant?.sellable) &&
    activeVariant.priceXaf !== null &&
    activeVariant.availableQty > 0;
  const isFav = favorites.includes(product.slug);

  const productReviews = bootstrap.reviews.filter((r) => r.productSlug === product.slug);
  const relatedProducts = bootstrap.products.filter(
    (p) => product.relatedSlugs.includes(p.slug) && p.status === 'published'
  );
  const linkedIngredients = bootstrap.ingredients.filter((i) => product.ingredientSlugs.includes(i.slug));

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim() || !reviewConsent) return;
    setReviewSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productSlug: product.slug,
          authorName: reviewName,
          rating: reviewRating,
          comment: reviewComment,
          orderReference: reviewOrderRef || undefined,
          consentGiven: reviewConsent,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || str.common.error);
      setReviewSubmitted(true);
      setReviewComment('');
      showToast(
        lang === 'fr'
          ? 'Avis enregistré et transmis à la modération.'
          : 'Review submitted for moderation.',
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : str.common.error, 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 pb-28 sm:px-6 lg:px-8 lg:py-14 lg:pb-20">
      <nav aria-label="Fil d’Ariane" className="mb-6 flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
        <a
          href="/boutique"
          onClick={(e) => {
            e.preventDefault();
            navigate('/boutique');
          }}
          className="hover:text-[var(--color-forest)] hover:underline"
        >
          {str.nav.shop}
        </a>
        <span aria-hidden="true">/</span>
        <a
          href={`/collections/${product.category}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/collections/${product.category}`);
          }}
          className="hover:text-[var(--color-forest)] hover:underline"
        >
          {tLoc(CATEGORY_LABELS[product.category], lang)}
        </a>
        <span aria-hidden="true">/</span>
        <span className="text-[var(--color-ink)]">{tLoc(product.name, lang)}</span>
      </nav>

      {/* Main Split: Sticky Visual Left, Contiguous Purchase Module Right */}
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <div className="lg:sticky lg:top-24">
            <div className="product-neon-card group overflow-hidden border bg-[var(--color-white)]">
              <BotanicalVisual
                theme={product.visualTheme}
                title={tLoc(product.name, lang)}
                subtitle={activeVariant?.format}
                isDraft={isDraft}
                imageUrl={product.imageUrl}
                className="aspect-[4/3] w-full"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
            <span>{product.range}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">SKU : {activeVariant?.sku}</span>
          </div>

          <h1 className="font-editorial mt-2 text-4xl font-medium leading-tight text-[var(--color-forest)]">
            {tLoc(product.name, lang)}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
            {tLoc(product.shortSummary, lang)}
          </p>

          {/* Price & Availability */}
          <div className="mt-6 border-y border-[var(--color-border)] py-5">
            <div className="flex items-baseline justify-between gap-4">
              <p className="tabular-nums text-2xl font-semibold text-[var(--color-forest)]">
                {formatXaf(activeVariant?.priceXaf, lang)}
              </p>
              <p className="text-xs font-medium text-[var(--color-ink-muted)]">
                {isDraft
                  ? str.product.draftPending
                  : activeVariant.availableQty > 0
                  ? `${str.product.inStock} (${activeVariant.availableQty} ${str.product.unitsLeft})`
                  : str.product.outOfStock}
              </p>
            </div>

            {activeVariant?.b2bPriceXaf ? (
              <p className="mt-2 text-xs font-medium text-[var(--color-champagne)] tabular-nums">
                {lang === 'fr' ? 'Tarif partenaire B2B validé : ' : 'Approved B2B rate: '}
                {formatXaf(activeVariant.b2bPriceXaf, lang)}
              </p>
            ) : null}

            {/* Variants */}
            {product.variants.length > 1 && (
              <div className="mt-5">
                <span className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'Format' : 'Size'}
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.variants.map((v) => {
                    const selected = v.id === activeVariant?.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelectedVariantId(v.id);
                          setQty(1);
                        }}
                        className={`h-10 rounded-full border px-4 text-xs font-medium transition-colors ${
                          selected
                            ? 'border-[var(--color-forest)] bg-[var(--color-forest)] text-white'
                            : 'border-[var(--color-border-strong)] bg-[var(--color-white)] text-[var(--color-ink)]'
                        }`}
                      >
                        {v.format}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Purchase Controls or Validation Hold Notice */}
            {isDraft ? (
              <div className="mt-6 border border-[var(--color-champagne)]/40 bg-[var(--color-beige)]/40 p-4 text-xs leading-relaxed text-[var(--color-ink)]">
                <p className="font-semibold text-[var(--color-forest)]">
                  {lang === 'fr' ? 'Fiche en attente de validation fabricant' : 'Product sheet awaiting manufacturer validation'}
                </p>
                <p className="mt-1">
                  {product.validationNotes ||
                    (lang === 'fr'
                      ? 'La commande est désactivée tant que la composition INCI, le format, les précautions et le tarif officiel ne sont pas validés.'
                      : 'Purchasing remains disabled until INCI, size, precautions, and official pricing are validated.')}
                </p>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="inline-flex h-12 items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-white)] px-2">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Diminuer la quantité"
                    className="flex h-9 w-9 items-center justify-center text-[var(--color-ink)]"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="tabular-nums px-3 text-sm font-medium">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(Math.max(1, activeVariant.availableQty), q + 1))}
                    aria-label="Augmenter la quantité"
                    className="flex h-9 w-9 items-center justify-center text-[var(--color-ink)]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!canBuy}
                  onClick={() => addToCart(activeVariant.id, product.id, product.slug, qty)}
                  className="h-12 flex-1 rounded-full bg-[var(--color-forest)] px-8 text-sm font-medium text-white transition-colors hover:bg-[var(--color-forest-hover)] disabled:opacity-45"
                >
                  {canBuy ? str.product.addToCart : str.product.outOfStock}
                </button>

                <button
                  type="button"
                  onClick={() => toggleFavorite(product.slug)}
                  aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  aria-pressed={isFav}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-white)] text-[var(--color-forest)]"
                >
                  <Heart className={`h-4 w-4 ${isFav ? 'fill-[var(--color-forest)]' : ''}`} />
                </button>
              </div>
            )}
          </div>

          {/* Complete Factual Specification Blocks */}
          <div className="mt-8 space-y-6 text-sm leading-relaxed">
            <div>
              <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
                {lang === 'fr' ? 'Description & Texture' : 'Description & Texture'}
              </h2>
              <p className="mt-2 text-[var(--color-ink)]">{tLoc(product.description, lang)}</p>
              <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                {lang === 'fr' ? 'Texture : ' : 'Texture: '}
                {tLoc(product.texture, lang)}
              </p>
            </div>

            <div className="border-t border-[var(--color-border)] pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-forest)]">
                {str.product.benefits}
              </h3>
              <p className="mt-1.5 text-[var(--color-ink)]">{tLoc(product.cosmeticBenefits, lang)}</p>
            </div>

            <div className="border-t border-[var(--color-border)] pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-forest)]">
                {str.product.directions}
              </h3>
              <p className="mt-1.5 text-[var(--color-ink)]">{tLoc(product.directions, lang)}</p>
            </div>

            <div className="border-t border-[var(--color-border)] pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-forest)]">
                {str.product.inci}
              </h3>
              <p className="mt-1.5 font-mono text-xs leading-relaxed text-[var(--color-ink-muted)]">
                {product.inci}
              </p>
              {linkedIngredients.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {linkedIngredients.map((ing) => (
                    <button
                      key={ing.slug}
                      type="button"
                      onClick={() => navigate(`/ingredients/${ing.slug}`)}
                      className="text-xs font-medium text-[var(--color-forest)] underline underline-offset-4"
                    >
                      {tLoc(ing.name, lang)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-5 border-t border-[var(--color-border)] pt-5 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-forest)]">
                  {str.product.precautions}
                </h3>
                <p className="mt-1.5 text-xs text-[var(--color-ink)]">{tLoc(product.precautions, lang)}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-forest)]">
                  {str.product.storage}
                </h3>
                <p className="mt-1.5 text-xs text-[var(--color-ink)]">{tLoc(product.storage, lang)}</p>
                {product.paoMonths !== null && (
                  <p className="mt-1 text-xs font-medium text-[var(--color-ink-muted)] tabular-nums">
                    {str.product.pao} : {product.paoMonths}M
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-5 border-t border-[var(--color-border)] pt-5 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-forest)]">
                  {str.product.audience}
                </h3>
                <p className="mt-1.5 text-xs text-[var(--color-ink)]">{tLoc(product.audienceRestrictions, lang)}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-forest)]">
                  {str.product.delivery}
                </h3>
                <p className="mt-1.5 text-xs text-[var(--color-ink-muted)]">
                  {lang === 'fr'
                    ? 'Tarifs confirmés à Douala selon la zone. Autres villes du Cameroun : confirmation préalable par le service client.'
                    : 'Confirmed rates in Douala by zone. Other Cameroon cities: shipping confirmed by customer service.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Authentic Reviews + Public Moderation Policy */}
      <MotionSection className="mt-20 border-t border-[var(--color-border)] pt-12">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="font-editorial text-3xl font-medium text-[var(--color-forest)]">{str.product.reviews}</h2>
            <p className="mt-2 flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
              <ShieldCheck className="h-4 w-4 text-[var(--color-forest)]" />
              <span>
                {lang === 'fr'
                  ? 'Règles de modération : seuls les avis authentiques sont publiés ; aucun avis négatif sincère n’est supprimé pour sa note.'
                  : 'Moderation policy: only authentic reviews are published; sincere negative reviews are never hidden because of their rating.'}
              </span>
            </p>

            {productReviews.length === 0 ? (
              <p className="mt-6 border border-[var(--color-border)] bg-[var(--color-white)] p-6 text-sm text-[var(--color-ink-muted)]">
                {str.product.noReviews}
              </p>
            ) : (
              <ul className="mt-6 space-y-4">
                {productReviews.map((rev) => (
                  <li key={rev.id} className="border border-[var(--color-border)] bg-[var(--color-white)] p-5">
                    <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
                      <span className="font-medium text-[var(--color-forest)]">{rev.authorName}</span>
                      <span className="tabular-nums">
                        {rev.rating}/5 · {rev.createdAt.slice(0, 10)}
                        {rev.verifiedPurchase ? ` · ${lang === 'fr' ? 'Achat vérifié' : 'Verified purchase'}` : ''}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-ink)]">{rev.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="lg:col-span-5">
            <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-6">
              <h3 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
                {lang === 'fr' ? 'Partager votre retour' : 'Leave a review'}
              </h3>
              {reviewSubmitted ? (
                <p className="mt-4 text-sm text-[var(--color-forest)]">
                  {lang === 'fr'
                    ? 'Merci. Votre avis a été transmis à notre équipe de modération.'
                    : 'Thank you. Your review has been queued for moderation.'}
                </p>
              ) : (
                <form onSubmit={handleReviewSubmit} className="mt-4 space-y-3 text-sm">
                  <div>
                    <label htmlFor="rev-name" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                      {lang === 'fr' ? 'Votre nom' : 'Your name'} *
                    </label>
                    <input
                      id="rev-name"
                      type="text"
                      required
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                      className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="rev-rating" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                        {lang === 'fr' ? 'Note (1 à 5)' : 'Rating (1–5)'}
                      </label>
                      <select
                        id="rev-rating"
                        value={reviewRating}
                        onChange={(e) => setReviewRating(Number(e.target.value))}
                        className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-sm"
                      >
                        <option value={5}>5 / 5</option>
                        <option value={4}>4 / 5</option>
                        <option value={3}>3 / 5</option>
                        <option value={2}>2 / 5</option>
                        <option value={1}>1 / 5</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="rev-ref" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                        {lang === 'fr' ? 'Réf. commande (optionnel)' : 'Order ref (optional)'}
                      </label>
                      <input
                        id="rev-ref"
                        type="text"
                        value={reviewOrderRef}
                        onChange={(e) => setReviewOrderRef(e.target.value)}
                        placeholder="EMS-..."
                        className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="rev-comment" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                      {lang === 'fr' ? 'Votre avis' : 'Comment'} *
                    </label>
                    <textarea
                      id="rev-comment"
                      required
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="mt-1 w-full border border-[var(--color-border-strong)] p-3 text-sm"
                    />
                  </div>
                  <label className="flex items-start gap-2 text-xs text-[var(--color-ink-muted)]">
                    <input
                      type="checkbox"
                      required
                      checked={reviewConsent}
                      onChange={(e) => setReviewConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[var(--color-forest)]"
                    />
                    <span>
                      {lang === 'fr'
                        ? 'J’autorise la publication de mon avis selon les règles de modération.'
                        : 'I consent to publishing my review under the moderation rules.'}
                    </span>
                  </label>
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="h-11 w-full rounded-full bg-[var(--color-forest)] text-xs font-medium text-white hover:bg-[var(--color-forest-hover)] disabled:opacity-50"
                  >
                    {reviewSubmitting ? '…' : lang === 'fr' ? 'Soumettre mon avis' : 'Submit review'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </MotionSection>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <MotionSection className="mt-16 border-t border-[var(--color-border)] pt-12">
          <h2 className="font-editorial text-3xl font-medium text-[var(--color-forest)]">{str.product.related}</h2>
            <MotionProductGrid className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map((rel, idx) => (
                <ProductCard key={rel.id} product={rel} index={idx} />
              ))}
            </MotionProductGrid>
        </MotionSection>
      )}

      {/* Mobile Sticky Quick Purchase Bar (never obscures content above footer/bottom nav) */}
      {canBuy && (
        <div className="fixed bottom-[56px] left-0 right-0 z-20 flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-white)]/95 px-4 py-2.5 backdrop-blur-md lg:hidden">
          <div>
            <p className="text-xs font-medium text-[var(--color-ink)] truncate max-w-[165px]">
              {tLoc(product.name, lang)}
            </p>
            <p className="tabular-nums text-xs font-semibold text-[var(--color-forest)]">
              {formatXaf(activeVariant.priceXaf, lang)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => addToCart(activeVariant.id, product.id, product.slug, qty)}
            className="h-10 rounded-full bg-[var(--color-forest)] px-5 text-xs font-medium text-white"
          >
            {str.product.addToCart}
          </button>
        </div>
      )}
    </div>
  );
}
