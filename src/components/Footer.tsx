import React from 'react';
import { Settings } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { tLoc } from '../i18n/translations';

export function Footer() {
  const { lang, navigate, bootstrap } = useStore();
  const settings = bootstrap?.settings;
  const user = bootstrap?.session.user;
  const isStaff = Boolean(user && !['customer', 'b2b_partner'].includes(user.role));

  const link = (to: string, label: string) => (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
      className="text-sm text-[var(--color-ivory)]/80 transition-colors hover:text-white hover:underline underline-offset-4"
    >
      {label}
    </a>
  );

  const handleOwnerGearClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isStaff) {
      navigate('/admin');
    } else {
      navigate('/connexion?next=/admin');
    }
  };

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-forest)] pb-24 text-[var(--color-ivory)] lg:pb-12">
      <div className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 border-b border-white/15 pb-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[var(--color-ivory)] p-1.5">
                <img
                  src="/assets/aistudio/emaus_transparent_5faf7a4d.png"
                  alt="Emaüs Skin Care"
                  className="h-9 w-auto"
                />
              </div>
              <div>
                <p className="font-editorial text-xl font-semibold text-white">
                  {settings?.brandName || 'Emaüs Skin Care'}
                </p>
                <p className="text-xs text-[var(--color-sage)]">
                  {settings?.legalEntityName || 'Les Laboratoires Emaüs'}
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-ivory)]/80">
              {settings ? tLoc(settings.signature, lang) : 'La cosmétique qui écoute votre peau'}
            </p>
            <div className="pt-2 text-xs leading-relaxed text-[var(--color-sage)]">
              <p>
                {settings?.headquartersAddress ||
                  'Douala, Makepe — Rhône Polen, à côté de la paroisse Sainte-Monique'}
              </p>
              <p className="mt-1 tabular-nums">
                {settings?.primaryPhone || '+237 697 705 069'} · {settings?.secondaryPhone || '+237 652 032 055'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-champagne)]">
              {lang === 'fr' ? 'Découvrir' : 'Explore'}
            </h3>
            <ul className="space-y-2.5">
              <li>{link('/boutique', lang === 'fr' ? 'Boutique' : 'Shop')}</li>
              <li>{link('/routines', 'Routines')}</li>
              <li>{link('/ingredients', lang === 'fr' ? 'Ingrédients documentés' : 'Ingredients')}</li>
              <li>{link('/a-propos', lang === 'fr' ? 'À propos' : 'About')}</li>
              <li>{link('/journal', 'Journal')}</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-champagne)]">
              {lang === 'fr' ? 'Services & Réseau' : 'Services & Network'}
            </h3>
            <ul className="space-y-2.5">
              <li>{link('/rendez-vous', lang === 'fr' ? 'Prendre rendez-vous' : 'Book appointment')}</li>
              <li>{link('/points-de-vente', lang === 'fr' ? 'Points de vente' : 'Points of sale')}</li>
              <li>{link('/professionnels', lang === 'fr' ? 'Revendeurs & Professionnels' : 'Wholesale & Resellers')}</li>
              <li>{link('/commandes/suivi', lang === 'fr' ? 'Suivre une commande' : 'Track an order')}</li>
              <li>{link('/faq', 'FAQ')}</li>
              <li>{link('/contact', 'Contact')}</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-champagne)]">
              {lang === 'fr' ? 'Informations légales' : 'Legal'}
            </h3>
            <ul className="space-y-2.5">
              <li>{link('/livraison-retours', lang === 'fr' ? 'Livraison & Retours' : 'Shipping & Returns')}</li>
              <li>{link('/confidentialite', lang === 'fr' ? 'Confidentialité & Données' : 'Privacy Notice')}</li>
              <li>{link('/conditions', lang === 'fr' ? 'Conditions de vente' : 'Terms of Sale')}</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 text-xs text-[var(--color-sage)] sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {settings?.legalEntityName || 'Les Laboratoires Emaüs'} —{' '}
            {settings?.brandName || 'Emaüs Skin Care'}.
          </p>

          <div className="flex items-center gap-3">
            <span>Douala, Cameroun</span>
            <a
              href={isStaff ? '/admin' : '/connexion?next=/admin'}
              onClick={handleOwnerGearClick}
              aria-label={lang === 'fr' ? 'Accès propriétaire / Administration' : 'Owner access / Administration'}
              title={lang === 'fr' ? 'Administration du site' : 'Site administration'}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-[var(--color-sage)] transition-all duration-300 hover:rotate-90 hover:border-white/40 hover:bg-white/10 hover:text-white"
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
