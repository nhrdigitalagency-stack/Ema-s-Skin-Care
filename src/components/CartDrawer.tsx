import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatXaf, tLoc, UI_STRINGS } from '../i18n/translations';
import { BotanicalVisual } from './BotanicalVisual';
import { EDITORIAL_EASE } from './MotionSection';

export function CartDrawer() {
  const { lang, cart, cartOpen, setCartOpen, updateCartQty, removeFromCart, bootstrap, navigate } = useStore();
  const str = UI_STRINGS[lang];
  const reduceMotion = useReducedMotion();

  const resolvedLines = cart
    .map((item) => {
      const product = bootstrap?.products.find((p) => p.id === item.productId);
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

  const subtotal = resolvedLines.reduce((sum, l) => sum + l.lineTotal, 0);

  return (
    <AnimatePresence>
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={str.cart.title}>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setCartOpen(false)}
            aria-hidden="true"
          />
          <motion.aside
            initial={reduceMotion ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.32, ease: EDITORIAL_EASE }}
            className="relative flex h-full w-full max-w-md flex-col bg-[var(--color-ivory)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
              <h2 className="font-editorial text-2xl font-semibold text-[var(--color-forest)]">{str.cart.title}</h2>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                aria-label={str.common.close}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[var(--color-beige)]/50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {resolvedLines.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-[var(--color-ink-muted)]">{str.cart.empty}</p>
                  <motion.button
                    type="button"
                    whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                    onClick={() => {
                      setCartOpen(false);
                      navigate('/boutique');
                    }}
                    className="mt-5 rounded-full bg-[var(--color-forest)] px-6 py-2.5 text-xs font-medium text-white hover:bg-[var(--color-forest-hover)]"
                  >
                    {str.cart.browse}
                  </motion.button>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {resolvedLines.map((line) => (
                    <li key={line.variantId} className="group flex gap-4 py-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden border border-[var(--color-border)]">
                        <BotanicalVisual
                          theme={line.product.visualTheme}
                          title={tLoc(line.product.name, lang)}
                          imageUrl={line.product.imageUrl}
                          compact
                          className="h-full w-full"
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <a
                              href={`/produits/${line.productSlug}`}
                              onClick={(e) => {
                                e.preventDefault();
                                setCartOpen(false);
                                navigate(`/produits/${line.productSlug}`);
                              }}
                              className="text-sm font-medium text-[var(--color-ink)] hover:underline"
                            >
                              {tLoc(line.product.name, lang)}
                            </a>
                            <p className="text-xs text-[var(--color-ink-muted)]">{line.variant.format}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(line.variantId)}
                            aria-label={lang === 'fr' ? 'Supprimer' : 'Remove'}
                            className="p-1 text-[var(--color-ink-muted)] hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="inline-flex items-center rounded-full border border-[var(--color-border-strong)] bg-white">
                            <button
                              type="button"
                              onClick={() => updateCartQty(line.variantId, line.quantity - 1)}
                              aria-label="Diminuer"
                              className="flex h-8 w-8 items-center justify-center text-[var(--color-ink)]"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="tabular-nums px-2 text-xs font-medium">{line.quantity}</span>
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQty(line.variantId, Math.min(line.variant.availableQty, line.quantity + 1))
                              }
                              aria-label="Augmenter"
                              className="flex h-8 w-8 items-center justify-center text-[var(--color-ink)]"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="tabular-nums text-sm font-medium text-[var(--color-forest)]">
                            {formatXaf(line.lineTotal, lang)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {resolvedLines.length > 0 && (
              <div className="space-y-3 border-t border-[var(--color-border)] bg-[var(--color-white)] p-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-ink-muted)]">{str.cart.subtotal}</span>
                  <span className="tabular-nums font-semibold text-[var(--color-forest)]">{formatXaf(subtotal, lang)}</span>
                </div>
                <p className="text-xs text-[var(--color-ink-muted)]">
                  {lang === 'fr'
                    ? 'Frais de livraison calculés selon votre ville et mode de réception.'
                    : 'Delivery rates calculated based on your city and pickup/delivery option.'}
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <motion.button
                    type="button"
                    whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                    onClick={() => {
                      setCartOpen(false);
                      navigate('/panier');
                    }}
                    className="h-11 rounded-full border border-[var(--color-border-strong)] text-xs font-medium text-[var(--color-forest)] transition-colors hover:bg-[var(--color-ivory)]"
                  >
                    {str.cart.viewCart}
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                    onClick={() => {
                      setCartOpen(false);
                      navigate('/commande');
                    }}
                    className="h-11 rounded-full bg-[var(--color-forest)] text-xs font-medium text-white transition-colors hover:bg-[var(--color-forest-hover)]"
                  >
                    {str.cart.checkout}
                  </motion.button>
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
