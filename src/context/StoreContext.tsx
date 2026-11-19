import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Language, PublicBootstrapPayload } from '../types/ecommerce';
import { FALLBACK_BOOTSTRAP } from '../data/fallbackBootstrap';
import { tLoc } from '../i18n/translations';

export interface CartItem {
  variantId: string;
  productId: string;
  productSlug: string;
  quantity: number;
}

interface ToastState {
  id: string;
  message: string;
  tone: 'success' | 'error' | 'info';
}

interface StoreContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  path: string;
  searchParams: URLSearchParams;
  navigate: (to: string) => void;
  bootstrap: PublicBootstrapPayload | null;
  loading: boolean;
  loadError: string | null;
  refreshBootstrap: () => Promise<void>;
  cart: CartItem[];
  addToCart: (variantId: string, productId: string, productSlug: string, qty?: number) => void;
  updateCartQty: (variantId: string, qty: number) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  favorites: string[];
  toggleFavorite: (slug: string) => void;
  toast: ToastState | null;
  showToast: (message: string, tone?: 'success' | 'error' | 'info') => void;
  consentDecision: 'unset' | 'essential_only' | 'accepted';
  setConsentDecision: (d: 'essential_only' | 'accepted') => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const CART_KEY = 'emaus_cart_v1';
const FAV_KEY = 'emaus_favs_v1';
const LANG_KEY = 'emaus_lang_v1';
const CONSENT_KEY = 'emaus_consent_v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'en' ? 'en' : 'fr';
  });

  const [locationState, setLocationState] = useState(() => ({
    pathname: window.location.pathname || '/',
    search: window.location.search || '',
  }));

  const [bootstrap, setBootstrap] = useState<PublicBootstrapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [consentDecision, setConsentState] = useState<'unset' | 'essential_only' | 'accepted'>(() => {
    const saved = localStorage.getItem(CONSENT_KEY);
    if (saved === 'essential_only' || saved === 'accepted') return saved;
    return 'unset';
  });

  const showToast = useCallback((message: string, tone: 'success' | 'error' | 'info' = 'info') => {
    const id = String(Date.now());
    setToast({ id, message, tone });
    window.setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 3600);
  }, []);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    localStorage.setItem(LANG_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const setConsentDecision = useCallback((d: 'essential_only' | 'accepted') => {
    setConsentState(d);
    localStorage.setItem(CONSENT_KEY, d);
  }, []);

  const refreshBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap', { credentials: 'include' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = (await res.json()) as PublicBootstrapPayload;
      setBootstrap(data);
      setLoadError(null);
      if (data.session.user?.favorites?.length) {
        setFavorites((prev) => Array.from(new Set([...prev, ...data.session.user!.favorites])));
      }
    } catch {
      setBootstrap(FALLBACK_BOOTSTRAP);
      setLoadError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    void refreshBootstrap();
  }, [lang, refreshBootstrap]);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const onPop = () => {
      setLocationState({
        pathname: window.location.pathname || '/',
        search: window.location.search || '',
      });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Update document title & meta description per route
  useEffect(() => {
    const p = locationState.pathname;
    if (!bootstrap) return;
    let title = 'Emaüs Skin Care — Les Laboratoires Emaüs';
    if (p.startsWith('/boutique')) title = lang === 'fr' ? 'Boutique — Emaüs Skin Care' : 'Shop — Emaüs Skin Care';
    else if (p.startsWith('/routines')) title = lang === 'fr' ? 'Routines — Emaüs Skin Care' : 'Routines — Emaüs Skin Care';
    else if (p.startsWith('/ingredients')) title = lang === 'fr' ? 'Ingrédients — Emaüs Skin Care' : 'Ingredients — Emaüs Skin Care';
    else if (p.startsWith('/a-propos') || p.startsWith('/la-marque'))
      title = lang === 'fr' ? 'À propos — Les Laboratoires Emaüs' : 'About — Emaüs Skin Care';
    else if (p.startsWith('/journal')) title = 'Journal — Emaüs Skin Care';
    else if (p.startsWith('/produits/')) {
      const slug = p.replace('/produits/', '').split('/')[0];
      const prod = bootstrap.products.find((item) => item.slug === slug);
      if (prod) title = `${tLoc(prod.name, lang)} — Emaüs Skin Care`;
    } else if (p.startsWith('/rendez-vous')) {
      title = lang === 'fr' ? 'Prendre rendez-vous — Emaüs Skin Care' : 'Book Appointment — Emaüs Skin Care';
    } else if (p.startsWith('/admin')) {
      title = 'Administration — Emaüs Skin Care';
    }
    document.title = title;
  }, [locationState.pathname, bootstrap, lang]);

  const navigate = useCallback((to: string) => {
    const url = new URL(to, window.location.origin);
    window.history.pushState({}, '', url.pathname + url.search);
    setLocationState({ pathname: url.pathname || '/', search: url.search || '' });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const addToCart = useCallback(
    (variantId: string, productId: string, productSlug: string, qty = 1) => {
      setCart((prev) => {
        const idx = prev.findIndex((i) => i.variantId === variantId);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + qty };
          return copy;
        }
        return [...prev, { variantId, productId, productSlug, quantity: qty }];
      });
      setCartOpen(true);
      showToast(lang === 'fr' ? 'Produit ajouté au panier.' : 'Added to your bag.', 'success');
    },
    [lang, showToast]
  );

  const updateCartQty = useCallback((variantId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.variantId !== variantId));
      return;
    }
    setCart((prev) => prev.map((i) => (i.variantId === variantId ? { ...i, quantity: qty } : i)));
  }, []);

  const removeFromCart = useCallback((variantId: string) => {
    setCart((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const toggleFavorite = useCallback(
    (slug: string) => {
      setFavorites((prev) => {
        const exists = prev.includes(slug);
        const next = exists ? prev.filter((s) => s !== slug) : [...prev, slug];
        if (bootstrap?.session.authenticated) {
          fetch('/api/account/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ favorites: next }),
          }).catch(() => {});
        }
        return next;
      });
    },
    [bootstrap?.session.authenticated]
  );

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        lang,
        setLang,
        path: locationState.pathname,
        searchParams: new URLSearchParams(locationState.search),
        navigate,
        bootstrap,
        loading,
        loadError,
        refreshBootstrap,
        cart,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        cartCount,
        cartOpen,
        setCartOpen,
        searchOpen,
        setSearchOpen,
        favorites,
        toggleFavorite,
        toast,
        showToast,
        consentDecision,
        setConsentDecision,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
