import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { tLoc } from '../i18n/translations';

export function ContactPage() {
  const { lang, bootstrap, showToast } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, subject, message }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setSent(true);
      showToast(lang === 'fr' ? 'Message transmis.' : 'Message sent.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="border-b border-[var(--color-border)] pb-6">
        <h1 className="font-editorial text-4xl font-medium text-[var(--color-forest)]">Contact</h1>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <div className="space-y-4 text-sm lg:col-span-5">
          <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-6 space-y-3">
            <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
              {bootstrap?.settings.legalEntityName || 'Les Laboratoires Emaüs'}
            </h2>
            <p className="text-[var(--color-ink-muted)]">{bootstrap?.settings.headquartersAddress}</p>
            <p className="tabular-nums font-medium text-[var(--color-forest)]">
              {bootstrap?.settings.primaryPhone}
              <br />
              {bootstrap?.settings.secondaryPhone}
            </p>
            <p className="text-xs text-[var(--color-ink-muted)]">
              {lang === 'fr'
                ? 'Coordonnées publiques issues du dossier de référence — à confirmer avant mise en production.'
                : 'Public reference contact details — subject to final confirmation.'}
            </p>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-6 sm:p-8">
            {sent ? (
              <p className="text-sm text-[var(--color-forest)]">
                {lang === 'fr'
                  ? 'Merci. Votre message a bien été enregistré par notre équipe.'
                  : 'Thank you. Your message has been logged.'}
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cnt-name" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                      {lang === 'fr' ? 'Nom' : 'Name'} *
                    </label>
                    <input
                      id="cnt-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                    />
                  </div>
                  <div>
                    <label htmlFor="cnt-phone" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                      {lang === 'fr' ? 'Téléphone' : 'Phone'} *
                    </label>
                    <input
                      id="cnt-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="cnt-email" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    E-mail
                  </label>
                  <input
                    id="cnt-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                  />
                </div>
                <div>
                  <label htmlFor="cnt-sub" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    {lang === 'fr' ? 'Objet' : 'Subject'}
                  </label>
                  <input
                    id="cnt-sub"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                  />
                </div>
                <div>
                  <label htmlFor="cnt-msg" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    Message *
                  </label>
                  <textarea
                    id="cnt-msg"
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1 w-full border border-[var(--color-border-strong)] p-3"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="h-11 rounded-full bg-[var(--color-forest)] px-7 text-xs font-medium text-white"
                >
                  {sending ? '…' : lang === 'fr' ? 'Envoyer' : 'Send'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FaqPage() {
  const { lang, bootstrap } = useStore();
  if (!bootstrap) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      <h1 className="font-editorial text-4xl font-medium text-[var(--color-forest)]">
        {lang === 'fr' ? 'Questions fréquentes' : 'Frequently Asked Questions'}
      </h1>
      <div className="mt-8 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)] bg-[var(--color-white)] px-6">
        {bootstrap.faqs.map((faq) => (
          <details key={faq.id} className="py-5">
            <summary className="cursor-pointer list-none font-medium text-[var(--color-forest)]">
              {tLoc(faq.question, lang)}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">{tLoc(faq.answer, lang)}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

export function DeliveryReturnsPage() {
  const { lang, bootstrap, showToast } = useStore();
  const [orderReference, setOrderReference] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [kind, setKind] = useState<'return' | 'claim'>('return');
  const [sku, setSku] = useState('');
  const [lotCode, setLotCode] = useState('');
  const [openedOrSuspect, setOpenedOrSuspect] = useState(false);
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderReference, customerPhone, kind, sku, lotCode, openedOrSuspect, reason }),
    });
    if (res.ok) {
      setDone(true);
      showToast(lang === 'fr' ? 'Demande enregistrée.' : 'Request logged.', 'success');
    } else {
      showToast('Erreur lors de l’envoi.', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14 space-y-12">
      <div>
        <h1 className="font-editorial text-4xl font-medium text-[var(--color-forest)]">
          {lang === 'fr' ? 'Livraison, Retours & Réclamations' : 'Shipping, Returns & Claims'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
          {lang === 'fr'
            ? 'Aucune promesse de livraison nationale uniforme n’est affichée sans validation logistique préalable. Les frais inconnus sont confirmés avec vous avant expédition.'
            : 'Exact national shipping fees outside validated zones are confirmed with you prior to dispatch.'}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {bootstrap?.deliveryZones.map((z) => (
            <div key={z.id} className="border border-[var(--color-border)] bg-[var(--color-white)] p-5 text-sm">
              <p className="font-medium text-[var(--color-forest)]">{tLoc(z.label, lang)}</p>
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{tLoc(z.estimatedDelay, lang)}</p>
              <p className="mt-2 tabular-nums text-xs font-semibold">
                {z.feeKnown && z.feeXaf !== null
                  ? `${z.feeXaf} XAF`
                  : lang === 'fr'
                  ? 'À confirmer avec le service client'
                  : 'To confirm with customer service'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <section className="border border-[var(--color-border)] bg-[var(--color-white)] p-6 sm:p-8">
        <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
          {lang === 'fr' ? 'Déclarer un retour ou une réclamation' : 'Submit a return or claim'}
        </h2>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          {lang === 'fr'
            ? 'Conformément à nos règles de sécurité cosmétique, tout produit retourné ouvert ou suspect est placé en quarantaine et n’est jamais remis en stock vendable.'
            : 'Any opened or suspect returned item is placed in quarantine and never returned to sellable inventory.'}
        </p>

        {done ? (
          <p className="mt-4 text-sm text-[var(--color-forest)]">
            {lang === 'fr'
              ? 'Votre dossier a été enregistré et sera traité par le service client.'
              : 'Your request has been logged for customer service review.'}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
            <input
              type="text"
              required
              value={orderReference}
              onChange={(e) => setOrderReference(e.target.value)}
              placeholder="Référence commande (EMS-...)"
              className="h-10 border border-[var(--color-border-strong)] px-3"
            />
            <input
              type="tel"
              required
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Téléphone"
              className="h-10 border border-[var(--color-border-strong)] px-3"
            />
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as 'return' | 'claim')}
              className="h-10 border border-[var(--color-border-strong)] px-3"
            >
              <option value="return">{lang === 'fr' ? 'Demande de retour' : 'Return request'}</option>
              <option value="claim">{lang === 'fr' ? 'Réclamation qualité / lot' : 'Quality / batch claim'}</option>
            </select>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="SKU concerné (optionnel)"
              className="h-10 border border-[var(--color-border-strong)] px-3"
            />
            <input
              type="text"
              value={lotCode}
              onChange={(e) => setLotCode(e.target.value)}
              placeholder="Numéro de lot (si connu)"
              className="h-10 border border-[var(--color-border-strong)] px-3"
            />
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={openedOrSuspect}
                onChange={(e) => setOpenedOrSuspect(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-forest)]"
              />
              <span>{lang === 'fr' ? 'Produit ouvert, endommagé ou suspect' : 'Opened, damaged, or suspect item'}</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={lang === 'fr' ? 'Décrivez précisément le motif…' : 'Describe your issue…'}
              className="sm:col-span-2 border border-[var(--color-border-strong)] p-3"
            />
            <div className="sm:col-span-2">
              <button type="submit" className="h-11 rounded-full bg-[var(--color-forest)] px-6 text-xs font-medium text-white">
                {lang === 'fr' ? 'Envoyer la demande' : 'Submit request'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export function PrivacyPage() {
  const { lang, consentDecision, setConsentDecision, showToast } = useStore();
  const [unsubEmail, setUnsubEmail] = useState('');

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/newsletter/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: unsubEmail }),
    });
    if (res.ok) {
      setUnsubEmail('');
      showToast(lang === 'fr' ? 'Désinscription confirmée.' : 'Unsubscribed.', 'success');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14 space-y-6 text-sm leading-relaxed">
      <h1 className="font-editorial text-4xl font-medium text-[var(--color-forest)]">
        {lang === 'fr' ? 'Notice de confidentialité' : 'Privacy Notice'}
      </h1>
      <p>
        {lang === 'fr'
          ? 'Les données collectées lors des commandes (nom, téléphone, adresse, e-mail facultatif) servent exclusivement au traitement logistique, au suivi de lot et à la facturation. Aucune donnée de santé ni photographie médicale n’est collectée.'
          : 'Data collected during checkout is used strictly for order fulfillment, batch traceability, and invoicing. No health data or medical photos are collected.'}
      </p>
      <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-6 space-y-3">
        <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
          {lang === 'fr' ? 'Préférences de consentement' : 'Consent preferences'}
        </h2>
        <p className="text-xs text-[var(--color-ink-muted)]">
          Statut actuel : {consentDecision === 'accepted' ? 'Essentiels + mesure d’audience' : 'Essentiels uniquement'}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setConsentDecision('essential_only')}
            className="rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-xs font-medium"
          >
            {lang === 'fr' ? 'Cookies essentiels uniquement' : 'Essential only'}
          </button>
          <button
            type="button"
            onClick={() => setConsentDecision('accepted')}
            className="rounded-full bg-[var(--color-forest)] px-4 py-2 text-xs font-medium text-white"
          >
            {lang === 'fr' ? 'Accepter les préférences complètes' : 'Accept preferences'}
          </button>
        </div>
      </div>

      <form onSubmit={handleUnsubscribe} className="border border-[var(--color-border)] bg-[var(--color-white)] p-6 space-y-3">
        <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
          {lang === 'fr' ? 'Désinscription newsletter' : 'Newsletter unsubscribe'}
        </h2>
        <div className="flex flex-wrap gap-3">
          <input
            type="email"
            required
            value={unsubEmail}
            onChange={(e) => setUnsubEmail(e.target.value)}
            placeholder="vous@exemple.com"
            className="h-10 flex-1 border border-[var(--color-border-strong)] px-3 text-sm"
          />
          <button type="submit" className="h-10 rounded-full border border-[var(--color-border-strong)] px-5 text-xs font-medium">
            {lang === 'fr' ? 'Me désinscrire' : 'Unsubscribe'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function TermsPage() {
  const { lang } = useStore();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14 space-y-5 text-sm leading-relaxed">
      <h1 className="font-editorial text-4xl font-medium text-[var(--color-forest)]">
        {lang === 'fr' ? 'Conditions générales de vente' : 'Terms of Sale'}
      </h1>
      <p>
        {lang === 'fr'
          ? 'Les présentes conditions encadrent les commandes passées sur la boutique Emaüs Skin Care (Les Laboratoires Emaüs). Elles doivent être relues et validées par le conseil juridique de la marque avant ouverture commerciale définitive.'
          : 'These terms govern orders placed through Emaüs Skin Care and remain subject to legal review prior to commercial launch.'}
      </p>
      <ul className="list-disc pl-5 space-y-2 text-[var(--color-ink-muted)]">
        <li>
          {lang === 'fr'
            ? 'Les prix sont exprimés en Francs CFA (XAF). Les fiches en brouillon ne sont pas disponibles à la vente.'
            : 'Prices are expressed in XAF. Draft sheets cannot be purchased.'}
        </li>
        <li>
          {lang === 'fr'
            ? 'La validation d’une commande suppose la disponibilité réelle du lot actif au moment de la préparation.'
            : 'Order fulfillment depends on active non-expired batch availability.'}
        </li>
        <li>
          {lang === 'fr'
            ? 'Les frais de livraison hors zones tarifées sont confirmés avec le client avant expédition.'
            : 'Shipping fees outside fixed zones are confirmed with the customer before dispatch.'}
        </li>
      </ul>
    </div>
  );
}

export function NotFoundPage() {
  const { lang, navigate } = useStore();
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-champagne)]">404</p>
      <h1 className="font-editorial mt-2 text-5xl font-medium text-[var(--color-forest)]">
        {lang === 'fr' ? 'Page introuvable' : 'Page not found'}
      </h1>
      <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
        {lang === 'fr'
          ? 'L’adresse demandée n’existe pas ou a été déplacée.'
          : 'The requested page does not exist or has moved.'}
      </p>
      <div className="mt-7 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-full bg-[var(--color-forest)] px-6 py-2.5 text-xs font-medium text-white"
        >
          {lang === 'fr' ? 'Accueil' : 'Home'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/boutique')}
          className="rounded-full border border-[var(--color-border-strong)] px-6 py-2.5 text-xs font-medium text-[var(--color-forest)]"
        >
          {lang === 'fr' ? 'Boutique' : 'Shop'}
        </button>
      </div>
    </div>
  );
}
