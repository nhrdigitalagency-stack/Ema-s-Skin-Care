import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { formatXaf, tLoc } from '../i18n/translations';

interface B2bItem {
  id: string;
  slug: string;
  name: { fr: string; en: string };
  isDemoItem: boolean;
  variants: Array<{
    id: string;
    sku: string;
    format: string;
    publicPriceXaf: number | null;
    b2bPriceXaf: number | null;
    availableQty: number;
  }>;
}

export function ResellersPage() {
  const { lang, bootstrap, navigate, showToast } = useStore();
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [activityType, setActivityType] = useState('Parapharmacie / Boutique cosmétique');
  const [estimatedMonthlyVolume, setEstimatedMonthlyVolume] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [b2bItems, setB2bItems] = useState<B2bItem[] | null>(null);

  const user = bootstrap?.session.user;
  const canViewB2b =
    user &&
    ['b2b_partner', 'admin', 'catalog_manager', 'customer_service'].includes(user.role);

  useEffect(() => {
    if (!canViewB2b) {
      setB2bItems(null);
      return;
    }
    fetch('/api/b2b/pricing', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { items?: B2bItem[] } | null) => {
        if (d?.items) setB2bItems(d.items);
      })
      .catch(() => {});
  }, [canViewB2b]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/resellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          companyName,
          city,
          phone,
          email,
          activityType,
          estimatedMonthlyVolume,
          message,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Erreur envoi.');
      setSubmitted(true);
      showToast(lang === 'fr' ? 'Demande professionnelle enregistrée.' : 'Reseller inquiry submitted.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="max-w-3xl border-b border-[var(--color-border)] pb-8">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-champagne)]">
          {lang === 'fr' ? 'Distributeurs & Revendeurs' : 'Distributors & Resellers'}
        </p>
        <h1 className="font-editorial mt-2 text-4xl font-medium text-[var(--color-forest)]">
          {lang === 'fr' ? 'Espace Professionnels' : 'Wholesale & Trade Partners'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
          {lang === 'fr'
            ? 'Les conditions commerciales, grilles tarifaires et modalités d’approvisionnement sont communiquées uniquement après étude de votre dossier et validation par Les Laboratoires Emaüs.'
            : 'Trade terms and wholesale pricing tiers are shared exclusively after application review and approval by Les Laboratoires Emaüs.'}
        </p>
      </div>

      {/* Private B2B Pricing Grid (Server-Verified Access Only) */}
      {canViewB2b && b2bItems && (
        <section className="mt-10 border border-[var(--color-forest)]/30 bg-[var(--color-white)] p-6">
          <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
            {lang === 'fr' ? 'Grille tarifaire B2B privée (accès validé)' : 'Private B2B Price Grid (Verified Access)'}
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-border)] text-[var(--color-ink-muted)]">
                <tr>
                  <th className="py-2 pr-4">Produit</th>
                  <th className="py-2 pr-4">SKU</th>
                  <th className="py-2 pr-4">Format</th>
                  <th className="py-2 pr-4">Tarif public</th>
                  <th className="py-2 pr-4">Tarif B2B</th>
                  <th className="py-2">Stock disp.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {b2bItems.flatMap((item) =>
                  item.variants.map((v) => (
                    <tr key={v.id}>
                      <td className="py-2.5 pr-4 font-medium text-[var(--color-ink)]">{tLoc(item.name, lang)}</td>
                      <td className="py-2.5 pr-4 font-mono">{v.sku}</td>
                      <td className="py-2.5 pr-4">{v.format}</td>
                      <td className="py-2.5 pr-4 tabular-nums">{formatXaf(v.publicPriceXaf, lang)}</td>
                      <td className="py-2.5 pr-4 tabular-nums font-semibold text-[var(--color-forest)]">
                        {formatXaf(v.b2bPriceXaf, lang)}
                      </td>
                      <td className="py-2.5 tabular-nums">{v.availableQty}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-6">
            <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
              {lang === 'fr' ? 'Étapes de validation' : 'Onboarding process'}
            </h2>
            <ol className="mt-4 space-y-3 text-sm text-[var(--color-ink-muted)]">
              <li>01. {lang === 'fr' ? 'Dépôt de votre demande détaillée ci-contre.' : 'Submit your trade application.'}</li>
              <li>02. {lang === 'fr' ? 'Vérification de votre activité et zone géographique.' : 'Verification of your business and location.'}</li>
              <li>03. {lang === 'fr' ? 'Activation de votre accès privé B2B sur votre compte.' : 'Activation of private B2B pricing on your account.'}</li>
            </ol>
            {!user && (
              <div className="mt-6 border-t border-[var(--color-border)] pt-4">
                <p className="text-xs text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'Déjà partenaire validé ?' : 'Already an approved partner?'}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/connexion')}
                  className="mt-2 rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-xs font-medium text-[var(--color-forest)]"
                >
                  {lang === 'fr' ? 'Se connecter à l’espace privé' : 'Sign in to private portal'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-6 sm:p-8">
            <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
              {lang === 'fr' ? 'Demande d’ouverture de compte revendeur' : 'Reseller Application Form'}
            </h2>
            {submitted ? (
              <p className="mt-4 border border-[var(--color-forest)]/25 bg-[var(--color-ivory)] p-5 text-sm text-[var(--color-forest)]">
                {lang === 'fr'
                  ? 'Votre demande a bien été enregistrée. L’équipe commerciale Emaüs Skin Care vous contactera après examen.'
                  : 'Your trade inquiry has been logged. Our team will reach out following review.'}
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <label htmlFor="b2b-name" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    {lang === 'fr' ? 'Nom et prénom' : 'Full name'} *
                  </label>
                  <input
                    id="b2b-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                  />
                </div>
                <div>
                  <label htmlFor="b2b-company" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    {lang === 'fr' ? 'Entreprise / Enseigne' : 'Company name'} *
                  </label>
                  <input
                    id="b2b-company"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                  />
                </div>
                <div>
                  <label htmlFor="b2b-city" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    {lang === 'fr' ? 'Ville' : 'City'} *
                  </label>
                  <input
                    id="b2b-city"
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                  />
                </div>
                <div>
                  <label htmlFor="b2b-phone" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    {lang === 'fr' ? 'Téléphone' : 'Phone'} *
                  </label>
                  <input
                    id="b2b-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                  />
                </div>
                <div>
                  <label htmlFor="b2b-email" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    E-mail *
                  </label>
                  <input
                    id="b2b-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                  />
                </div>
                <div>
                  <label htmlFor="b2b-activity" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    {lang === 'fr' ? 'Type d’activité' : 'Activity'} *
                  </label>
                  <select
                    id="b2b-activity"
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                  >
                    <option value="Parapharmacie / Boutique cosmétique">Parapharmacie / Boutique cosmétique</option>
                    <option value="Institut de beauté / Spa">Institut de beauté / Spa</option>
                    <option value="Distributeur régional">Distributeur régional</option>
                    <option value="Autre activité commerciale">Autre activité commerciale</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="b2b-vol" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    {lang === 'fr' ? 'Volumes mensuels estimés' : 'Estimated monthly volume'} *
                  </label>
                  <input
                    id="b2b-vol"
                    type="text"
                    required
                    value={estimatedMonthlyVolume}
                    onChange={(e) => setEstimatedMonthlyVolume(e.target.value)}
                    placeholder={lang === 'fr' ? 'Ex. 30 à 50 unités / mois' : 'e.g. 30–50 units/month'}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="b2b-msg" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    {lang === 'fr' ? 'Précisions complémentaires' : 'Additional notes'}
                  </label>
                  <textarea
                    id="b2b-msg"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1 w-full border border-[var(--color-border-strong)] p-3"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-11 rounded-full bg-[var(--color-forest)] px-8 text-xs font-medium text-white hover:bg-[var(--color-forest-hover)] disabled:opacity-50"
                  >
                    {submitting ? '…' : lang === 'fr' ? 'Envoyer la demande' : 'Submit application'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
