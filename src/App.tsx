import React from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { StoreProvider, useStore } from './context/StoreContext';
import type { CategorySlug } from './types/ecommerce';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { GiantBrandBanner } from './components/GiantBrandBanner';
import { CartDrawer } from './components/CartDrawer';
import { SearchModal } from './components/SearchModal';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { MotionPage } from './components/MotionSection';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { RoutinesPage } from './pages/RoutinesPage';
import { AboutPage, BrandPage, IngredientsPage, JournalPage, OutletsPage } from './pages/EditorialPages';
import { ResellersPage } from './pages/ResellersPage';
import { CartPage, CheckoutPage, OrderTrackingPage } from './pages/CartAndCheckoutPages';
import { AccountPage, AuthPage, FavoritesPage } from './pages/AccountAndAuthPages';
import {
  ContactPage,
  DeliveryReturnsPage,
  FaqPage,
  NotFoundPage,
  PrivacyPage,
  TermsPage,
} from './pages/InfoAndLegalPages';
import { AdminPage } from './pages/AdminPage';
import { AppointmentBookingSection } from './components/AppointmentBookingSection';

function ConsentBanner() {
  const { lang, consentDecision, setConsentDecision } = useStore();
  if (consentDecision !== 'unset') return null;

  return (
    <div
      role="region"
      aria-label={lang === 'fr' ? 'Gestion du consentement' : 'Consent preferences'}
      className="fixed bottom-16 left-4 right-4 z-30 mx-auto max-w-xl border border-[var(--color-border-strong)] bg-[var(--color-white)] p-4 shadow-lg lg:bottom-4 lg:left-auto lg:right-6"
    >
      <p className="text-xs leading-relaxed text-[var(--color-ink)]">
        {lang === 'fr'
          ? 'Nous utilisons uniquement des témoins essentiels au panier et à votre session. Aucun suivi publicitaire sans votre accord.'
          : 'We only use cookies essential for your shopping bag and session. No advertising tracking without consent.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setConsentDecision('essential_only')}
          className="rounded-full border border-[var(--color-border-strong)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-ink)]"
        >
          {lang === 'fr' ? 'Essentiels uniquement' : 'Essential only'}
        </button>
        <button
          type="button"
          onClick={() => setConsentDecision('accepted')}
          className="rounded-full bg-[var(--color-forest)] px-3.5 py-1.5 text-xs font-medium text-white"
        >
          {lang === 'fr' ? 'Tout accepter' : 'Accept'}
        </button>
      </div>
    </div>
  );
}

function RouterView() {
  const { path, loading, loadError, refreshBootstrap } = useStore();

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center text-sm text-[var(--color-ink-muted)]">
        Chargement de la boutique Emaüs Skin Care…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-sm text-red-700">{loadError}</p>
        <button
          type="button"
          onClick={() => void refreshBootstrap()}
          className="mt-4 rounded-full bg-[var(--color-forest)] px-6 py-2.5 text-xs font-medium text-white"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (path === '/') return <HomePage />;
  if (path === '/boutique') return <CatalogPage />;
  if (path.startsWith('/collections/')) {
    const slug = path.replace('/collections/', '').split('/')[0] as CategorySlug;
    return <CatalogPage collectionSlug={slug} />;
  }
  if (path.startsWith('/produits/')) {
    const slug = path.replace('/produits/', '').split('/')[0];
    return <ProductDetailPage slug={slug} />;
  }
  if (path === '/routines') return <RoutinesPage />;
  if (path.startsWith('/routines/')) {
    const slug = path.replace('/routines/', '').split('/')[0];
    return <RoutinesPage slug={slug} />;
  }
  if (path === '/ingredients') return <IngredientsPage />;
  if (path.startsWith('/ingredients/')) {
    const slug = path.replace('/ingredients/', '').split('/')[0];
    return <IngredientsPage slug={slug} />;
  }
  if (path === '/a-propos') return <AboutPage />;
  if (path === '/la-marque') return <BrandPage />;
  if (path === '/journal') return <JournalPage />;
  if (path.startsWith('/journal/')) {
    const slug = path.replace('/journal/', '').split('/')[0];
    return <JournalPage slug={slug} />;
  }
  if (path === '/points-de-vente') return <OutletsPage />;
  if (path === '/professionnels') return <ResellersPage />;
  if (path === '/panier') return <CartPage />;
  if (path === '/commande') return <CheckoutPage />;
  if (path.startsWith('/commandes/')) {
    const reference = path.replace('/commandes/', '').split('/')[0];
    return <OrderTrackingPage reference={reference} />;
  }
  if (path === '/connexion') return <AuthPage />;
  if (path === '/mon-compte') return <AccountPage />;
  if (path === '/favoris') return <FavoritesPage />;
  if (path === '/contact') return <ContactPage />;
  if (path === '/rendez-vous') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <AppointmentBookingSection standalone />
      </div>
    );
  }
  if (path === '/faq') return <FaqPage />;
  if (path === '/livraison-retours') return <DeliveryReturnsPage />;
  if (path === '/confidentialite') return <PrivacyPage />;
  if (path === '/conditions') return <TermsPage />;
  if (path === '/admin') return <AdminPage />;

  return <NotFoundPage />;
}

function AppShell() {
  const { toast, path } = useStore();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-ivory)] text-[var(--color-ink)]">
      <Header />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <MotionPage key={path}>
            <RouterView />
          </MotionPage>
        </AnimatePresence>
      </main>
      <GiantBrandBanner />
      <Footer />
      <CartDrawer />
      <SearchModal />
      <ConsentBanner />
      <WhatsAppFloatingButton />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-20 right-4 z-50 border px-4 py-3 text-xs font-medium shadow-lg ${
            toast.tone === 'error'
              ? 'border-red-300 bg-red-50 text-red-900'
              : 'border-[var(--color-forest)]/30 bg-[var(--color-white)] text-[var(--color-forest)]'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </MotionConfig>
  );
}
