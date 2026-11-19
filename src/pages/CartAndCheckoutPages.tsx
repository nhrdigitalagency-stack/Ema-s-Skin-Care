import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, Minus, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatXaf, tLoc, UI_STRINGS } from '../i18n/translations';
import type { Order, PaymentMethod } from '../types/ecommerce';
import { BotanicalVisual } from '../components/BotanicalVisual';

export function CartPage() {
  const { lang, cart, bootstrap, updateCartQty, removeFromCart, navigate } = useStore();
  const str = UI_STRINGS[lang];
  const [promoInput, setPromoInput] = useState('');
  const [promoResult, setPromoResult] = useState<{ code: string; discountXaf: number } | null>(null);
  const [promoError, setPromoError] = useState('');

  if (!bootstrap) return null;

  const lines = cart
    .map((item) => {
      const product = bootstrap.products.find((p) => p.id === item.productId);
      const variant = product?.variants.find((v) => v.id === item.variantId);
      if (!product || !variant) return null;
      return {
        ...item,
        product,
        variant,
        unitPrice: variant.priceXaf ?? 0,
        lineTotal: (variant.priceXaf ?? 0) * item.quantity,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  const handleCheckPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');
    setPromoResult(null);
    if (!promoInput.trim()) return;
    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput.trim(), subtotalXaf: subtotal }),
      });
      const data = (await res.json()) as { valid?: boolean; code?: string; discountXaf?: number; error?: string };
      if (!res.ok || !data.valid) {
        setPromoError(data.error || 'Code invalide.');
        return;
      }
      setPromoResult({ code: data.code!, discountXaf: data.discountXaf || 0 });
    } catch {
      setPromoError('Impossible de vérifier le code.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <h1 className="font-editorial text-4xl font-medium text-[var(--color-forest)]">{str.cart.title}</h1>

      {lines.length === 0 ? (
        <div className="mt-8 border border-[var(--color-border)] bg-[var(--color-white)] p-12 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">{str.cart.empty}</p>
          <button
            type="button"
            onClick={() => navigate('/boutique')}
            className="mt-5 rounded-full bg-[var(--color-forest)] px-7 py-3 text-xs font-medium text-white"
          >
            {str.cart.browse}
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)] bg-[var(--color-white)] px-6">
              {lines.map((l) => (
                <li key={l.variantId} className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center">
                  <div className="h-24 w-28 shrink-0 overflow-hidden border border-[var(--color-border)]">
                    <BotanicalVisual
                      theme={l.product.visualTheme}
                      title={tLoc(l.product.name, lang)}
                      imageUrl={l.product.imageUrl}
                      className="h-full w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <a
                      href={`/produits/${l.productSlug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/produits/${l.productSlug}`);
                      }}
                      className="text-base font-medium text-[var(--color-ink)] hover:underline"
                    >
                      {tLoc(l.product.name, lang)}
                    </a>
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      {l.variant.format} · SKU {l.variant.sku}
                    </p>
                    <p className="mt-1 tabular-nums text-xs text-[var(--color-ink-muted)]">
                      {formatXaf(l.unitPrice, lang)} / unité
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="inline-flex items-center rounded-full border border-[var(--color-border-strong)]">
                      <button
                        type="button"
                        onClick={() => updateCartQty(l.variantId, l.quantity - 1)}
                        aria-label="Diminuer"
                        className="flex h-9 w-9 items-center justify-center"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="tabular-nums px-3 text-sm">{l.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateCartQty(l.variantId, Math.min(l.variant.availableQty, l.quantity + 1))
                        }
                        aria-label="Augmenter"
                        className="flex h-9 w-9 items-center justify-center"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="tabular-nums min-w-[95px] text-right text-sm font-semibold text-[var(--color-forest)]">
                      {formatXaf(l.lineTotal, lang)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(l.variantId)}
                      aria-label="Supprimer"
                      className="p-2 text-[var(--color-ink-muted)] hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <aside className="lg:col-span-4">
            <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-6 space-y-5">
              <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
                {lang === 'fr' ? 'Récapitulatif' : 'Summary'}
              </h2>

              <form onSubmit={handleCheckPromo} className="space-y-2">
                <label htmlFor="cart-promo" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'Code promotionnel (optionnel)' : 'Promo code (optional)'}
                </label>
                <div className="flex gap-2">
                  <input
                    id="cart-promo"
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="EMAUS10"
                    className="h-10 flex-1 border border-[var(--color-border-strong)] px-3 text-xs uppercase"
                  />
                  <button
                    type="submit"
                    className="h-10 rounded-full border border-[var(--color-border-strong)] px-4 text-xs font-medium text-[var(--color-forest)]"
                  >
                    {lang === 'fr' ? 'Vérifier' : 'Apply'}
                  </button>
                </div>
                {promoError && <p className="text-xs text-red-700">{promoError}</p>}
                {promoResult && (
                  <p className="text-xs text-[var(--color-forest)] tabular-nums">
                    {promoResult.code} : -{formatXaf(promoResult.discountXaf, lang)}
                  </p>
                )}
              </form>

              <div className="space-y-2 border-t border-[var(--color-border)] pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--color-ink-muted)]">{str.cart.subtotal}</span>
                  <span className="tabular-nums font-medium">{formatXaf(subtotal, lang)}</span>
                </div>
                {promoResult && (
                  <div className="flex justify-between text-[var(--color-forest)]">
                    <span>{str.cart.discount}</span>
                    <span className="tabular-nums">-{formatXaf(promoResult.discountXaf, lang)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-[var(--color-ink-muted)]">
                  <span>{str.cart.delivery}</span>
                  <span>{lang === 'fr' ? 'Calculée à l’étape suivante' : 'Calculated at checkout'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(promoResult ? `/commande?promo=${encodeURIComponent(promoResult.code)}` : '/commande')
                }
                className="h-12 w-full rounded-full bg-[var(--color-forest)] text-xs font-medium text-white hover:bg-[var(--color-forest-hover)]"
              >
                {str.cart.checkout}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export function CheckoutPage() {
  const { lang, cart, bootstrap, searchParams, clearCart, navigate, showToast, refreshBootstrap } = useStore();
  const str = UI_STRINGS[lang];

  const user = bootstrap?.session.user;
  const zones = bootstrap?.deliveryZones || [];

  const [idempotencyKey] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idem-${Date.now()}-${Math.random()}`
  );

  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [deliveryZoneId, setDeliveryZoneId] = useState(zones[0]?.id || '');
  const [receptionMode, setReceptionMode] = useState<'delivery' | 'pickup'>('delivery');
  const [city, setCity] = useState('Douala');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [instructions, setInstructions] = useState('');
  const [promoCode, setPromoCode] = useState(searchParams.get('promo') || '');
  const [promoDiscountXaf, setPromoDiscountXaf] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_on_delivery_or_pickup');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);

  useEffect(() => {
    if (!deliveryZoneId && zones[0]) {
      setDeliveryZoneId(zones[0].id);
      setCity(zones[0].city);
    }
  }, [zones, deliveryZoneId]);

  if (!bootstrap) return null;

  const lines = cart
    .map((item) => {
      const product = bootstrap.products.find((p) => p.id === item.productId);
      const variant = product?.variants.find((v) => v.id === item.variantId);
      if (!product || !variant) return null;
      return {
        ...item,
        product,
        variant,
        lineTotal: (variant.priceXaf ?? 0) * item.quantity,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const activeZone = zones.find((z) => z.id === deliveryZoneId);
  const feeKnown = receptionMode === 'pickup' && activeZone?.pickupAvailable ? true : Boolean(activeZone?.feeKnown);
  const deliveryFeeXaf =
    receptionMode === 'pickup' && activeZone?.pickupAvailable ? 0 : activeZone?.feeKnown ? activeZone.feeXaf : null;
  const knownTotal =
    feeKnown && deliveryFeeXaf !== null ? Math.max(0, subtotal - promoDiscountXaf + deliveryFeeXaf) : null;

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setPromoDiscountXaf(0);
      return;
    }
    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim(), subtotalXaf: subtotal }),
      });
      const data = (await res.json()) as { valid?: boolean; discountXaf?: number; error?: string };
      if (!res.ok || !data.valid) {
        setPromoDiscountXaf(0);
        showToast(data.error || 'Code invalide', 'error');
        return;
      }
      setPromoDiscountXaf(data.discountXaf || 0);
      showToast(lang === 'fr' ? 'Remise appliquée.' : 'Discount applied.', 'success');
    } catch {
      showToast('Erreur validation code', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          idempotencyKey,
          customerName,
          customerPhone,
          customerEmail: customerEmail || undefined,
          city,
          neighborhood,
          receptionMode,
          address: receptionMode === 'delivery' ? address : undefined,
          landmark: landmark || undefined,
          instructions: instructions || undefined,
          deliveryZoneId,
          promoCode: promoCode.trim() || undefined,
          paymentMethod,
          items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        }),
      });
      const data = (await res.json()) as { order?: Order; error?: string };
      if (!res.ok || !data.order) {
        throw new Error(data.error || 'Erreur lors de la commande.');
      }
      setCreatedOrder(data.order);
      clearCart();
      await refreshBootstrap();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur serveur');
    } finally {
      setSubmitting(false);
    }
  };

  const buildWhatsappMessage = (order: Order) => {
    const itemsList = order.items
      .map((i) => `- ${i.productName} (${i.variantLabel}) x${i.quantity} : ${i.lineTotalXaf} XAF`)
      .join('\n');
    const totalLine =
      order.estimatedTotalXaf !== null
        ? `Total estimé : ${order.estimatedTotalXaf} XAF`
        : `Sous-total : ${order.subtotalXaf} XAF (Livraison à confirmer)`;
    return [
      `Bonjour Emaüs Skin Care,`,
      `Je souhaite confirmer ma commande enregistrée : ${order.reference}`,
      `Client : ${order.customerName} (${order.customerPhone})`,
      `Réception : ${order.receptionMode === 'pickup' ? 'Retrait' : 'Livraison'} — ${order.city}, ${order.neighborhood}`,
      itemsList,
      totalLine,
    ].join('\n');
  };

  if (createdOrder) {
    const waMessage = buildWhatsappMessage(createdOrder);
    const waDigits = bootstrap.settings.whatsappPhone.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${waDigits}?text=${encodeURIComponent(waMessage)}`;

    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="border border-[var(--color-forest)]/25 bg-[var(--color-white)] p-8">
          <div className="flex items-center gap-3 text-[var(--color-forest)]">
            <CheckCircle2 className="h-6 w-6" />
            <h1 className="font-editorial text-3xl font-medium">
              {lang === 'fr' ? 'Commande enregistrée' : 'Order recorded'}
            </h1>
          </div>

          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            {lang === 'fr'
              ? 'Votre demande a été enregistrée côté serveur et le stock correspondant est réservé.'
              : 'Your order has been saved on the server and stock has been reserved.'}
          </p>

          <div className="mt-6 grid gap-4 border-y border-[var(--color-border)] py-5 sm:grid-cols-3 text-sm">
            <div>
              <span className="text-xs text-[var(--color-ink-muted)]">Référence</span>
              <p className="font-mono font-semibold text-[var(--color-forest)]">{createdOrder.reference}</p>
            </div>
            <div>
              <span className="text-xs text-[var(--color-ink-muted)]">Statut commande</span>
              <p className="font-medium">
                {createdOrder.status === 'whatsapp_prepared'
                  ? lang === 'fr'
                    ? 'Enregistrée — WhatsApp prêt'
                    : 'Recorded — WhatsApp ready'
                  : lang === 'fr'
                  ? 'Enregistrée (en attente d’acceptation)'
                  : 'Recorded (awaiting acceptance)'}
              </p>
            </div>
            <div>
              <span className="text-xs text-[var(--color-ink-muted)]">Paiement</span>
              <p className="font-medium">{lang === 'fr' ? 'Non payé / À confirmer' : 'Unpaid / To confirm'}</p>
            </div>
          </div>

          {createdOrder.paymentMethod === 'whatsapp_assisted' && bootstrap.settings.whatsappConfirmed && (
            <div className="mt-6 border border-[var(--color-champagne)]/40 bg-[var(--color-ivory)] p-5 space-y-3">
              <p className="text-sm font-semibold text-[var(--color-forest)]">
                {lang === 'fr'
                  ? 'Étape suivante : envoyez votre message sur WhatsApp'
                  : 'Next step: send your prepared message on WhatsApp'}
              </p>
              <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
                {lang === 'fr'
                  ? 'L’ouverture de WhatsApp ne vaut pas envoi automatique : appuyez sur « Envoyer » dans l’application WhatsApp. La commande reste enregistrée même sans envoi immédiat.'
                  : 'Opening WhatsApp does not send the message automatically—please tap Send inside WhatsApp.'}
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--color-forest)] px-6 text-xs font-medium text-white"
                >
                  <span>{lang === 'fr' ? 'Ouvrir WhatsApp' : 'Open WhatsApp'}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(waMessage);
                    setCopiedMsg(true);
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-white px-5 text-xs font-medium text-[var(--color-forest)]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copiedMsg ? (lang === 'fr' ? 'Message copié' : 'Copied') : lang === 'fr' ? 'Copier le récapitulatif' : 'Copy summary'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(`/commandes/${createdOrder.reference}?phone=${encodeURIComponent(createdOrder.customerPhone)}`)
              }
              className="h-11 rounded-full border border-[var(--color-border-strong)] px-6 text-xs font-medium text-[var(--color-forest)]"
            >
              {lang === 'fr' ? 'Suivre cette commande' : 'Track this order'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/boutique')}
              className="h-11 rounded-full bg-[var(--color-forest)] px-6 text-xs font-medium text-white"
            >
              {lang === 'fr' ? 'Retour à la boutique' : 'Continue shopping'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-editorial text-4xl text-[var(--color-forest)]">{str.cart.empty}</h1>
        <button
          type="button"
          onClick={() => navigate('/boutique')}
          className="mt-6 rounded-full bg-[var(--color-forest)] px-7 py-3 text-xs font-medium text-white"
        >
          {str.cart.browse}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="border-b border-[var(--color-border)] pb-6">
        <h1 className="font-editorial text-4xl font-medium text-[var(--color-forest)]">
          {lang === 'fr' ? 'Validation de commande' : 'Checkout'}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {lang === 'fr'
            ? 'Commande possible en invité, sans obligation de créer un compte.'
            : 'Guest checkout available—no account required.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-10 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-7">
          {submitError && (
            <div className="border border-red-300 bg-red-50 p-4 text-sm text-red-800">{submitError}</div>
          )}

          <section className="border border-[var(--color-border)] bg-[var(--color-white)] p-6 space-y-4">
            <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
              01. {lang === 'fr' ? 'Coordonnées' : 'Contact details'}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <label htmlFor="chk-name" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'Nom complet' : 'Full name'} *
                </label>
                <input
                  id="chk-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                />
              </div>
              <div>
                <label htmlFor="chk-phone" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'Téléphone (Cameroun / WhatsApp)' : 'Phone number'} *
                </label>
                <input
                  id="chk-phone"
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+237 6XX XXX XXX"
                  className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="chk-email" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'E-mail (facultatif)' : 'Email (optional)'}
                </label>
                <input
                  id="chk-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                />
              </div>
            </div>
          </section>

          <section className="border border-[var(--color-border)] bg-[var(--color-white)] p-6 space-y-4">
            <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
              02. {lang === 'fr' ? 'Réception & Zone' : 'Delivery & Zone'}
            </h2>

            <div className="space-y-3 text-sm">
              <div>
                <label htmlFor="chk-zone" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'Zone / Ville' : 'Zone / City'} *
                </label>
                <select
                  id="chk-zone"
                  value={deliveryZoneId}
                  onChange={(e) => {
                    const z = zones.find((item) => item.id === e.target.value);
                    setDeliveryZoneId(e.target.value);
                    if (z) {
                      setCity(z.city);
                      if (!z.pickupAvailable && receptionMode === 'pickup') setReceptionMode('delivery');
                    }
                  }}
                  className="mt-1 h-10 w-full border border-[var(--color-border-strong)] bg-white px-3"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {tLoc(z.label, lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="radio"
                    name="receptionMode"
                    checked={receptionMode === 'delivery'}
                    onChange={() => setReceptionMode('delivery')}
                    className="accent-[var(--color-forest)]"
                  />
                  <span>{lang === 'fr' ? 'Livraison à l’adresse' : 'Delivery to address'}</span>
                </label>
                {activeZone?.pickupAvailable && (
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <input
                      type="radio"
                      name="receptionMode"
                      checked={receptionMode === 'pickup'}
                      onChange={() => setReceptionMode('pickup')}
                      className="accent-[var(--color-forest)]"
                    />
                    <span>{lang === 'fr' ? 'Retrait (Douala Makepe)' : 'Pickup (Douala Makepe)'}</span>
                  </label>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="chk-hood" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    {lang === 'fr' ? 'Quartier' : 'Neighborhood'} *
                  </label>
                  <input
                    id="chk-hood"
                    type="text"
                    required
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder={lang === 'fr' ? 'Ex. Makepe, Bonapriso, Bastos…' : 'Neighborhood'}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                  />
                </div>
                <div>
                  <label htmlFor="chk-landmark" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    {lang === 'fr' ? 'Repère (facultatif)' : 'Landmark (optional)'}
                  </label>
                  <input
                    id="chk-landmark"
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                  />
                </div>
              </div>

              {receptionMode === 'delivery' && (
                <div>
                  <label htmlFor="chk-addr" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    {lang === 'fr' ? 'Adresse / précisions d’accès' : 'Street address'} *
                  </label>
                  <input
                    id="chk-addr"
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                  />
                </div>
              )}

              <div>
                <label htmlFor="chk-inst" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'Instructions de livraison (facultatif)' : 'Instructions (optional)'}
                </label>
                <textarea
                  id="chk-inst"
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="mt-1 w-full border border-[var(--color-border-strong)] p-3"
                />
              </div>
            </div>
          </section>

          <section className="border border-[var(--color-border)] bg-[var(--color-white)] p-6 space-y-3">
            <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
              03. {lang === 'fr' ? 'Mode de règlement' : 'Payment option'}
            </h2>

            {bootstrap.settings.cashOnDeliveryEnabled && (
              <label className="flex items-start gap-3 border border-[var(--color-border)] p-4 text-sm">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'cash_on_delivery_or_pickup'}
                  onChange={() => setPaymentMethod('cash_on_delivery_or_pickup')}
                  className="mt-1 accent-[var(--color-forest)]"
                />
                <div>
                  <p className="font-medium text-[var(--color-ink)]">
                    {lang === 'fr' ? 'Paiement à la réception ou au retrait' : 'Pay on delivery or pickup'}
                  </p>
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    {lang === 'fr'
                      ? 'Votre commande est enregistrée immédiatement et confirmée par l’équipe.'
                      : 'Your order is recorded immediately and confirmed by our team.'}
                  </p>
                </div>
              </label>
            )}

            <label
              className={`flex items-start gap-3 border border-[var(--color-border)] p-4 text-sm ${
                !bootstrap.settings.whatsappConfirmed ? 'opacity-60' : ''
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                disabled={!bootstrap.settings.whatsappConfirmed}
                checked={paymentMethod === 'whatsapp_assisted'}
                onChange={() => setPaymentMethod('whatsapp_assisted')}
                className="mt-1 accent-[var(--color-forest)]"
              />
              <div>
                <p className="font-medium text-[var(--color-ink)]">
                  {lang === 'fr' ? 'Finaliser avec l’assistance WhatsApp' : 'Continue via WhatsApp'}
                </p>
                <p className="text-xs text-[var(--color-ink-muted)]">
                  {bootstrap.settings.whatsappConfirmed
                    ? lang === 'fr'
                      ? 'Enregistre d’abord votre commande puis prépare un message récapitulatif vers le numéro validé.'
                      : 'Saves your order first and prepares a summary message for the confirmed number.'
                    : lang === 'fr'
                    ? 'Option désactivée tant que le numéro WhatsApp n’est pas confirmé par la marque dans l’administration.'
                    : 'Disabled until the brand confirms its WhatsApp number in Admin.'}
                </p>
              </div>
            </label>

            <p className="text-xs text-[var(--color-ink-muted)]">
              {lang === 'fr'
                ? 'Sécurité : nous ne demandons jamais votre code PIN Mobile Money sur ce site.'
                : 'Security: we never ask for any Mobile Money PIN on this website.'}
            </p>
          </section>
        </div>

        {/* Summary Column */}
        <aside className="lg:col-span-5">
          <div className="sticky top-24 border border-[var(--color-border)] bg-[var(--color-white)] p-6 space-y-5">
            <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
              {lang === 'fr' ? 'Votre commande' : 'Order summary'}
            </h2>

            <ul className="divide-y divide-[var(--color-border)] text-sm">
              {lines.map((l) => (
                <li key={l.variantId} className="flex justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium text-[var(--color-ink)]">{tLoc(l.product.name, lang)}</p>
                    <p className="text-xs text-[var(--color-ink-muted)] tabular-nums">
                      {l.variant.format} × {l.quantity}
                    </p>
                  </div>
                  <span className="tabular-nums font-medium">{formatXaf(l.lineTotal, lang)}</span>
                </li>
              ))}
            </ul>

            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder={lang === 'fr' ? 'Code promo (ex. EMAUS10)' : 'Promo code'}
                className="h-10 flex-1 border border-[var(--color-border-strong)] px-3 text-xs uppercase"
              />
              <button
                type="button"
                onClick={handleApplyPromo}
                className="h-10 rounded-full border border-[var(--color-border-strong)] px-4 text-xs font-medium text-[var(--color-forest)]"
              >
                {lang === 'fr' ? 'Appliquer' : 'Apply'}
              </button>
            </div>

            <div className="space-y-2 border-t border-[var(--color-border)] pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-ink-muted)]">{str.cart.subtotal}</span>
                <span className="tabular-nums">{formatXaf(subtotal, lang)}</span>
              </div>
              {promoDiscountXaf > 0 && (
                <div className="flex justify-between text-[var(--color-forest)]">
                  <span>{str.cart.discount}</span>
                  <span className="tabular-nums">-{formatXaf(promoDiscountXaf, lang)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--color-ink-muted)]">{str.cart.delivery}</span>
                <span className="tabular-nums text-right">
                  {feeKnown && deliveryFeeXaf !== null ? formatXaf(deliveryFeeXaf, lang) : str.cart.deliveryUnknown}
                </span>
              </div>

              <div className="flex justify-between border-t border-[var(--color-border)] pt-3 text-base font-semibold text-[var(--color-forest)]">
                <span>{knownTotal !== null ? str.cart.total : str.cart.subtotal}</span>
                <span className="tabular-nums">
                  {knownTotal !== null ? formatXaf(knownTotal, lang) : `${formatXaf(Math.max(0, subtotal - promoDiscountXaf), lang)} + livraison`}
                </span>
              </div>
              {knownTotal === null && (
                <p className="text-xs text-[var(--color-ink-muted)]">
                  {lang === 'fr'
                    ? 'Aucun total définitif trompeur n’est affiché : les frais exacts seront confirmés par le service client.'
                    : 'Exact shipping fee will be confirmed by customer service before final payment.'}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-full bg-[var(--color-forest)] text-xs font-medium text-white hover:bg-[var(--color-forest-hover)] disabled:opacity-50"
            >
              {submitting
                ? lang === 'fr'
                  ? 'Enregistrement…'
                  : 'Submitting…'
                : lang === 'fr'
                ? 'Confirmer l’enregistrement de la commande'
                : 'Submit order'}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}

export function OrderTrackingPage({ reference }: { reference: string }) {
  const { lang, searchParams, navigate } = useStore();
  const [refInput, setRefInput] = useState(reference === 'suivi' ? '' : reference);
  const [phoneInput, setPhoneInput] = useState(searchParams.get('phone') || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchOrder = async (refToLoad: string, phone: string) => {
    if (!refToLoad.trim()) return;
    setLoading(true);
    setError('');
    try {
      const qs = phone.trim() ? `?phone=${encodeURIComponent(phone.trim())}` : '';
      const res = await fetch(`/api/orders/${encodeURIComponent(refToLoad.trim())}${qs}`, { credentials: 'include' });
      const data = (await res.json()) as { order?: Order; error?: string };
      if (!res.ok || !data.order) throw new Error(data.error || 'Introuvable');
      setOrder(data.order);
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : 'Erreur de vérification.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reference && reference !== 'suivi') {
      void fetchOrder(reference, searchParams.get('phone') || '');
    }
  }, [reference]);

  const statusLabels = useMemo(
    () => ({
      registered: lang === 'fr' ? 'Enregistrée' : 'Registered',
      whatsapp_prepared: lang === 'fr' ? 'Message WhatsApp préparé' : 'WhatsApp prepared',
      accepted: lang === 'fr' ? 'Acceptée' : 'Accepted',
      preparing: lang === 'fr' ? 'En préparation' : 'Preparing',
      shipped: lang === 'fr' ? 'Expédiée' : 'Shipped',
      delivered: lang === 'fr' ? 'Livrée' : 'Delivered',
      cancelled: lang === 'fr' ? 'Annulée' : 'Cancelled',
    }),
    [lang]
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      <h1 className="font-editorial text-4xl font-medium text-[var(--color-forest)]">
        {lang === 'fr' ? 'Suivi de commande protégé' : 'Protected Order Tracking'}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
        {lang === 'fr'
          ? 'Par confidentialité, saisissez votre référence et le numéro de téléphone utilisé lors de la commande.'
          : 'For privacy, enter your order reference and checkout phone number.'}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void fetchOrder(refInput, phoneInput);
        }}
        className="mt-6 grid gap-3 border border-[var(--color-border)] bg-[var(--color-white)] p-5 sm:grid-cols-12"
      >
        <input
          type="text"
          required
          value={refInput}
          onChange={(e) => setRefInput(e.target.value)}
          placeholder="EMS-20261117-XXXX"
          className="h-10 border border-[var(--color-border-strong)] px-3 text-sm sm:col-span-5"
        />
        <input
          type="tel"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          placeholder="+237 6XX XXX XXX"
          className="h-10 border border-[var(--color-border-strong)] px-3 text-sm sm:col-span-4"
        />
        <button
          type="submit"
          disabled={loading}
          className="h-10 rounded-full bg-[var(--color-forest)] px-5 text-xs font-medium text-white sm:col-span-3"
        >
          {loading ? '…' : lang === 'fr' ? 'Consulter' : 'Track'}
        </button>
      </form>

      {error && <p className="mt-4 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}

      {order && (
        <div className="mt-8 space-y-6 border border-[var(--color-border)] bg-[var(--color-white)] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
            <div>
              <p className="font-mono text-lg font-semibold text-[var(--color-forest)]">{order.reference}</p>
              <p className="text-xs text-[var(--color-ink-muted)] tabular-nums">{order.createdAt.slice(0, 16).replace('T', ' ')}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium text-[var(--color-forest)]">{statusLabels[order.status]}</p>
              <p className="text-xs text-[var(--color-ink-muted)]">Paiement : {order.paymentStatus}</p>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
              {lang === 'fr' ? 'Articles commandés' : 'Items'}
            </h2>
            <ul className="mt-3 divide-y divide-[var(--color-border)] text-sm">
              {order.items.map((item) => (
                <li key={item.variantId} className="flex justify-between py-2.5">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-[var(--color-ink-muted)] tabular-nums">
                      {item.sku} · {item.variantLabel} × {item.quantity}
                      {item.assignedLots.length > 0 && ` · Lots: ${item.assignedLots.map((l) => l.lotCode).join(', ')}`}
                    </p>
                  </div>
                  <span className="tabular-nums font-medium">{formatXaf(item.lineTotalXaf, lang)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
              {lang === 'fr' ? 'Historique des statuts' : 'Status timeline'}
            </h2>
            <ul className="mt-3 space-y-2 text-xs">
              {order.statusHistory.map((h, i) => (
                <li key={i} className="flex justify-between gap-4 border-b border-[var(--color-border)]/50 pb-2">
                  <span>
                    <strong className="text-[var(--color-forest)]">{statusLabels[h.status]}</strong> — {h.note}
                  </span>
                  <span className="tabular-nums text-[var(--color-ink-muted)]">{h.at.slice(0, 16).replace('T', ' ')}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => navigate('/livraison-retours')}
            className="text-xs font-medium text-[var(--color-forest)] underline underline-offset-4"
          >
            {lang === 'fr' ? 'Déclarer un retour ou une réclamation →' : 'Request a return or claim →'}
          </button>
        </div>
      )}
    </div>
  );
}
