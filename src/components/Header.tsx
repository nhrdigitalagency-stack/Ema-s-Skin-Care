import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Heart, Home, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { UI_STRINGS } from '../i18n/translations';

export function Header() {
  const { lang, setLang, path, navigate, cartCount, setCartOpen, setSearchOpen, bootstrap } = useStore();
  const str = UI_STRINGS[lang];
  const reduceMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isHomeTop = path === '/' && !scrolled;

  const navItems = [
    { href: '/boutique', label: str.nav.shop },
    { href: '/routines', label: str.nav.routines },
    { href: '/ingredients', label: str.nav.ingredients },
    { href: '/a-propos', label: str.nav.about },
    { href: '/journal', label: str.nav.journal },
  ];

  const handleNav = (href: string) => {
    setMobileMenuOpen(false);
    navigate(href);
  };

  return (
    <>
      <div className="sticky top-0 z-40">
        <header
          className={`transition-all duration-300 ${
            isHomeTop
              ? 'border-b border-transparent bg-[var(--color-ivory)]/85 backdrop-blur-sm'
              : 'border-b border-[var(--color-border)] bg-[var(--color-ivory)]/95 shadow-[0_4px_20px_rgba(32,61,50,0.04)] backdrop-blur-md'
          }`}
        >
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:gap-8 lg:px-8">
            {/* Zone 1: Brand Wordmark + Official Logo */}
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                handleNav('/');
              }}
              className="group flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5 whitespace-nowrap"
            >
              <img
                src="/assets/aistudio/emaus_transparent_5faf7a4d.png"
                alt="Logo Emaüs Skin Care"
                className="h-8 w-auto shrink-0 object-contain transition-transform duration-300 group-hover:scale-105 sm:h-9"
              />
              <span className="font-editorial truncate text-lg font-semibold tracking-tight text-[var(--color-forest)] sm:text-xl">
                {bootstrap?.settings.brandName || 'Emaüs Skin Care'}
              </span>
            </a>

            {/* Zone 2: 5 concise single-line text links */}
            <nav aria-label="Navigation principale" className="hidden items-center gap-6 lg:flex xl:gap-8">
              {navItems.map((item) => {
                const active =
                  path === item.href ||
                  path.startsWith(item.href + '/') ||
                  (item.href === '/a-propos' && path === '/la-marque');
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNav(item.href);
                    }}
                    className={`relative shrink-0 whitespace-nowrap py-1 text-sm transition-colors ${
                      active
                        ? 'font-medium text-[var(--color-forest)]'
                        : 'text-[var(--color-ink)] hover:text-[var(--color-forest)]'
                    }`}
                  >
                    {item.label}
                    {active && (
                      <motion.span
                        layoutId={reduceMotion ? undefined : 'header-active-underline'}
                        className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[var(--color-champagne)]"
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      />
                    )}
                  </a>
                );
              })}
            </nav>

            {/* Zone 3: Responsive action cluster */}
            <div className="flex shrink-0 items-center gap-1 sm:gap-2.5">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label={str.nav.search}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink)] transition-colors hover:bg-[var(--color-beige)]/50 sm:h-10 sm:w-10"
              >
                <Search className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
                aria-label={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
                className="hidden h-10 shrink-0 items-center px-2 text-xs font-medium tracking-wide text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-forest)] sm:inline-flex whitespace-nowrap"
              >
                {lang === 'fr' ? 'EN' : 'FR'}
              </button>

              <a
                href={bootstrap?.session.authenticated ? '/mon-compte' : '/connexion'}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(bootstrap?.session.authenticated ? '/mon-compte' : '/connexion');
                }}
                aria-label={str.nav.account}
                className="hidden h-10 w-10 items-center justify-center rounded-full text-[var(--color-ink)] transition-colors hover:bg-[var(--color-beige)]/50 sm:flex"
              >
                <User className="h-4 w-4" />
              </a>

              <motion.button
                type="button"
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                onClick={() => setCartOpen(true)}
                aria-label={`${str.nav.cart} (${cartCount})`}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[var(--color-forest)] px-3 text-xs font-medium text-white transition-colors hover:bg-[var(--color-forest-hover)] sm:h-10 sm:gap-2 sm:px-4 whitespace-nowrap"
              >
                <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden xs:inline sm:inline">{str.nav.cart}</span>
                <span className="tabular-nums">({cartCount})</span>
              </motion.button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label={str.nav.menu}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink)] transition-colors hover:bg-[var(--color-beige)]/50 lg:hidden sm:h-10 sm:w-10"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* Mobile Full-Height Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu mobile">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={reduceMotion ? false : { x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative ml-auto flex h-full w-full max-w-xs flex-col overflow-y-auto bg-[var(--color-ivory)] p-6 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
                <div className="flex items-center gap-2">
                  <img
                    src="/assets/aistudio/emaus_transparent_5faf7a4d.png"
                    alt="Emaüs Skin Care"
                    className="h-7 w-auto object-contain"
                  />
                  <span className="font-editorial text-lg font-semibold text-[var(--color-forest)]">
                    Emaüs Skin Care
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label={str.common.close}
                  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--color-beige)]/50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-6 flex flex-col gap-1.5">
                {navItems.map((item) => {
                  const active = path === item.href || path.startsWith(item.href + '/');
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNav(item.href);
                      }}
                      className={`flex h-11 items-center justify-between border-b border-[var(--color-border)]/60 text-base ${
                        active ? 'font-semibold text-[var(--color-forest)]' : 'font-medium text-[var(--color-ink)]'
                      }`}
                    >
                      <span>{item.label}</span>
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-champagne)]" />}
                    </a>
                  );
                })}
                <a
                  href="/points-de-vente"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNav('/points-de-vente');
                  }}
                  className="flex h-11 items-center border-b border-[var(--color-border)]/60 text-sm text-[var(--color-ink-muted)]"
                >
                  {lang === 'fr' ? 'Points de vente' : 'Points of sale'}
                </a>
                <a
                  href="/professionnels"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNav('/professionnels');
                  }}
                  className="flex h-11 items-center border-b border-[var(--color-border)]/60 text-sm text-[var(--color-ink-muted)]"
                >
                  {lang === 'fr' ? 'Espace professionnels' : 'Professionals'}
                </a>
                <a
                  href="/rendez-vous"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNav('/rendez-vous');
                  }}
                  className="flex h-11 items-center border-b border-[var(--color-border)]/60 text-sm font-medium text-[var(--color-forest)]"
                >
                  {lang === 'fr' ? 'Prendre rendez-vous' : 'Book appointment'}
                </a>
                <a
                  href="/contact"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNav('/contact');
                  }}
                  className="flex h-11 items-center border-b border-[var(--color-border)]/60 text-sm text-[var(--color-ink-muted)]"
                >
                  Contact
                </a>
              </nav>

              <div className="mt-auto flex items-center justify-between gap-2 pt-6">
                <button
                  type="button"
                  onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
                  className="rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-xs font-medium text-[var(--color-forest)]"
                >
                  {lang === 'fr' ? 'English (EN)' : 'Français (FR)'}
                </button>
                <button
                  type="button"
                  onClick={() => handleNav(bootstrap?.session.authenticated ? '/mon-compte' : '/connexion')}
                  className="rounded-full bg-[var(--color-forest)] px-4 py-2 text-xs font-medium text-white"
                >
                  {bootstrap?.session.authenticated
                    ? lang === 'fr'
                      ? 'Mon compte'
                      : 'My account'
                    : lang === 'fr'
                    ? 'Connexion'
                    : 'Sign in'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Compact Mobile Bottom Navigation */}
      <nav
        aria-label="Navigation rapide mobile"
        className="safe-bottom-pad fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-ivory)]/95 backdrop-blur-md lg:hidden"
      >
        <div className="grid grid-cols-5 pt-1.5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className={`flex flex-col items-center gap-0.5 py-1 text-[10px] ${
              path === '/' ? 'font-semibold text-[var(--color-forest)]' : 'text-[var(--color-ink-muted)]'
            }`}
          >
            <Home className="h-4 w-4" />
            <span>{str.nav.home}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/boutique')}
            className={`flex flex-col items-center gap-0.5 py-1 text-[10px] ${
              path.startsWith('/boutique') ? 'font-semibold text-[var(--color-forest)]' : 'text-[var(--color-ink-muted)]'
            }`}
          >
            <Search className="h-4 w-4" />
            <span>{str.nav.shop}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/favoris')}
            className={`flex flex-col items-center gap-0.5 py-1 text-[10px] ${
              path === '/favoris' ? 'font-semibold text-[var(--color-forest)]' : 'text-[var(--color-ink-muted)]'
            }`}
          >
            <Heart className="h-4 w-4" />
            <span>{str.nav.favorites}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/panier')}
            className={`flex flex-col items-center gap-0.5 py-1 text-[10px] ${
              path === '/panier' ? 'font-semibold text-[var(--color-forest)]' : 'text-[var(--color-ink-muted)]'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="tabular-nums">
              {str.nav.cart} ({cartCount})
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate(bootstrap?.session.authenticated ? '/mon-compte' : '/connexion')}
            className={`flex flex-col items-center gap-0.5 py-1 text-[10px] ${
              path === '/mon-compte' || path === '/connexion'
                ? 'font-semibold text-[var(--color-forest)]'
                : 'text-[var(--color-ink-muted)]'
            }`}
          >
            <User className="h-4 w-4" />
            <span>{str.nav.account}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
