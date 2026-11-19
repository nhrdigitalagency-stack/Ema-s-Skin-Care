import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatXaf, tLoc } from '../i18n/translations';
import { BotanicalVisual } from '../components/BotanicalVisual';
import { MotionItem, MotionSection } from '../components/MotionSection';

export function RoutinesPage({ slug }: { slug?: string }) {
  const { lang, bootstrap, navigate, addToCart, showToast } = useStore();

  // Discovery Questionnaire state (strictly preference-based, non-diagnostic)
  const [zonePref, setZonePref] = useState<'all' | 'face' | 'body' | 'hair'>('all');
  const [texturePref, setTexturePref] = useState<'all' | 'light' | 'rich'>('all');
  const [budgetPref, setBudgetPref] = useState<string>('all');

  if (!bootstrap) return null;

  const { routines, products } = bootstrap;

  // Helper to compute live price & availability for a routine
  const computeRoutineMetrics = (routineSlug: string) => {
    const routine = routines.find((r) => r.slug === routineSlug);
    if (!routine) return { totalXaf: 0, allAvailable: false, items: [] };

    const items = routine.steps.map((step) => {
      const prod = products.find((p) => p.slug === step.productSlug);
      const variant = prod?.variants[0];
      const available =
        Boolean(prod && prod.status === 'published' && prod.safetyValidated && variant?.sellable && variant.availableQty > 0);
      return {
        step,
        product: prod,
        variant,
        available,
        priceXaf: variant?.priceXaf ?? 0,
      };
    });

    return {
      totalXaf: items.reduce((s, i) => s + i.priceXaf, 0),
      allAvailable: items.length > 0 && items.every((i) => i.available),
      items,
    };
  };

  if (slug) {
    const routine = routines.find((r) => r.slug === slug);
    if (!routine) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="font-editorial text-4xl text-[var(--color-forest)]">
            {lang === 'fr' ? 'Routine introuvable' : 'Routine not found'}
          </h1>
          <button
            type="button"
            onClick={() => navigate('/routines')}
            className="mt-6 rounded-full bg-[var(--color-forest)] px-6 py-3 text-xs font-medium text-white"
          >
            {lang === 'fr' ? 'Retour aux routines' : 'Back to routines'}
          </button>
        </div>
      );
    }

    const metrics = computeRoutineMetrics(routine.slug);

    const handleAddRoutine = () => {
      let addedCount = 0;
      for (const row of metrics.items) {
        if (row.product && row.variant && row.available) {
          addToCart(row.variant.id, row.product.id, row.product.slug, 1);
          addedCount++;
        }
      }
      if (addedCount === 0) {
        showToast(lang === 'fr' ? 'Aucun soin disponible dans cette routine.' : 'No items available in this routine.', 'error');
      }
    };

    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <button
          type="button"
          onClick={() => navigate('/routines')}
          className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-forest)] hover:underline"
        >
          ← {lang === 'fr' ? 'Toutes les routines' : 'All routines'}
        </button>

        <div className="mt-6 grid gap-10 lg:grid-cols-12">
          <div className="group lg:col-span-5">
            <BotanicalVisual
              theme="forest-balm"
              title={tLoc(routine.title, lang)}
              subtitle={`${routine.steps.length} ${lang === 'fr' ? 'étapes' : 'steps'}`}
              imageUrl={
                metrics.items[0]?.product?.imageUrl || '/src/assets/images/product_radiance_serum_1794910697007.jpg'
              }
              className="aspect-[4/3] border border-[var(--color-border)]"
            />
          </div>

          <div className="lg:col-span-7">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-champagne)]">
              {bootstrap.settings.brandName}
            </p>
            <h1 className="font-editorial mt-2 text-4xl font-medium text-[var(--color-forest)]">
              {tLoc(routine.title, lang)}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
              {tLoc(routine.objective, lang)}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-[var(--color-border)] py-4">
              <div>
                <p className="text-xs text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'Montant cumulé des soins' : 'Combined routine price'}
                </p>
                <p className="tabular-nums text-2xl font-semibold text-[var(--color-forest)]">
                  {formatXaf(metrics.totalXaf, lang)}
                </p>
              </div>
              <button
                type="button"
                disabled={!metrics.allAvailable}
                onClick={handleAddRoutine}
                className="h-11 rounded-full bg-[var(--color-forest)] px-6 text-xs font-medium text-white hover:bg-[var(--color-forest-hover)] disabled:opacity-45"
              >
                {metrics.allAvailable
                  ? lang === 'fr'
                    ? 'Ajouter la routine au panier'
                    : 'Add full routine to bag'
                  : lang === 'fr'
                  ? 'Certains soins sont en rupture'
                  : 'Some items out of stock'}
              </button>
            </div>

            <div className="mt-6 border border-[var(--color-border)] bg-[var(--color-white)] p-5 text-xs leading-relaxed text-[var(--color-ink)]">
              <p className="font-semibold text-[var(--color-forest)]">
                {lang === 'fr' ? 'Précautions d’emploi' : 'Precautions'}
              </p>
              <p className="mt-1">{tLoc(routine.precautions, lang)}</p>
            </div>
          </div>
        </div>

        <section className="mt-12 border-t border-[var(--color-border)] pt-10">
          <h2 className="font-editorial text-3xl font-medium text-[var(--color-forest)]">
            {lang === 'fr' ? 'Ordre d’application et fréquence' : 'Step order & frequency'}
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {metrics.items.map(({ step, product, variant, available }) => (
              <div key={step.order} className="flex flex-col justify-between border border-[var(--color-border)] bg-[var(--color-white)] p-6">
                <div>
                  <p className="text-xs font-semibold text-[var(--color-champagne)] tabular-nums">
                    {lang === 'fr' ? `Étape 0${step.order}` : `Step 0${step.order}`} · {tLoc(step.frequency, lang)}
                  </p>
                  <h3 className="font-editorial mt-2 text-2xl font-medium text-[var(--color-forest)]">
                    {tLoc(step.stepTitle, lang)}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                    {tLoc(step.instruction, lang)}
                  </p>
                </div>

                {product && (
                  <div className="mt-5 border-t border-[var(--color-border)] pt-4">
                    <a
                      href={`/produits/${product.slug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/produits/${product.slug}`);
                      }}
                      className="text-sm font-medium text-[var(--color-forest)] hover:underline"
                    >
                      {tLoc(product.name, lang)}
                    </a>
                    <div className="mt-1 flex items-center justify-between text-xs text-[var(--color-ink-muted)] tabular-nums">
                      <span>{formatXaf(variant?.priceXaf, lang)}</span>
                      <span>{available ? `${variant?.availableQty} disp.` : 'Rupture'}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // Routines Index + Non-Diagnostic Discovery Questionnaire
  const matchingRoutines = useMemo(() => {
    return routines.filter((r) => {
      if (zonePref !== 'all' && r.zone !== zonePref) return false;
      if (texturePref === 'light' && !r.preferredTexture.toLowerCase().includes('fluide')) return false;
      if (texturePref === 'rich' && !r.preferredTexture.toLowerCase().includes('lait')) return false;
      if (budgetPref !== 'all') {
        const total = computeRoutineMetrics(r.slug).totalXaf;
        if (budgetPref === 'under_20k' && total > 20000) return false;
        if (budgetPref === 'under_30k' && total > 30000) return false;
      }
      return true;
    });
  }, [routines, zonePref, texturePref, budgetPref, products]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="max-w-3xl border-b border-[var(--color-border)] pb-8">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-champagne)]">
          {lang === 'fr' ? 'Découverte guidée' : 'Guided discovery'}
        </p>
        <h1 className="font-editorial mt-2 text-4xl font-medium text-[var(--color-forest)]">
          {lang === 'fr' ? 'Routines éditoriales validées' : 'Validated Editorial Routines'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
          {lang === 'fr'
            ? 'Chaque routine réunit exclusivement des soins cohérents, avec leur ordre d’utilisation, leur fréquence et leurs précautions.'
            : 'Each routine pairs compatible care steps with clear application order, frequency, and usage precautions.'}
        </p>
      </div>

      {/* Non-diagnostic Preference Questionnaire */}
      <section className="mt-10 border border-[var(--color-border)] bg-[var(--color-white)] p-6 sm:p-8">
        <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
          {lang === 'fr'
            ? 'Outil d’orientation selon vos préférences cosmétiques'
            : 'Cosmetic preference discovery guide'}
        </h2>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          {lang === 'fr'
            ? 'Aide à l’orientation uniquement — ne constitue en aucun cas un diagnostic médical ou dermatologique.'
            : 'Discovery aid only — does not replace medical or dermatological evaluation.'}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="q-zone" className="block text-xs font-medium text-[var(--color-ink-muted)]">
              {lang === 'fr' ? 'Zone prioritaire' : 'Focus area'}
            </label>
            <select
              id="q-zone"
              value={zonePref}
              onChange={(e) => setZonePref(e.target.value as typeof zonePref)}
              className="mt-1.5 h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-ivory)] px-3 text-sm"
            >
              <option value="all">{lang === 'fr' ? 'Toutes les zones' : 'All areas'}</option>
              <option value="face">{lang === 'fr' ? 'Visage' : 'Face'}</option>
              <option value="body">{lang === 'fr' ? 'Corps & Cheveux' : 'Body & Hair'}</option>
            </select>
          </div>
          <div>
            <label htmlFor="q-texture" className="block text-xs font-medium text-[var(--color-ink-muted)]">
              {lang === 'fr' ? 'Texture souhaitée' : 'Preferred texture'}
            </label>
            <select
              id="q-texture"
              value={texturePref}
              onChange={(e) => setTexturePref(e.target.value as typeof texturePref)}
              className="mt-1.5 h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-ivory)] px-3 text-sm"
            >
              <option value="all">{lang === 'fr' ? 'Indifférent' : 'Any'}</option>
              <option value="light">{lang === 'fr' ? 'Fluide & légère' : 'Fluid & light'}</option>
              <option value="rich">{lang === 'fr' ? 'Lait & huile satinée' : 'Milk & satin oil'}</option>
            </select>
          </div>
          <div>
            <label htmlFor="q-budget" className="block text-xs font-medium text-[var(--color-ink-muted)]">
              {lang === 'fr' ? 'Budget indicatif' : 'Indicative budget'}
            </label>
            <select
              id="q-budget"
              value={budgetPref}
              onChange={(e) => setBudgetPref(e.target.value)}
              className="mt-1.5 h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-ivory)] px-3 text-sm"
            >
              <option value="all">{lang === 'fr' ? 'Tous budgets' : 'Any budget'}</option>
              <option value="under_20k">{lang === 'fr' ? 'Jusqu’à 20 000 XAF' : 'Up to 20,000 XAF'}</option>
              <option value="under_30k">{lang === 'fr' ? 'Jusqu’à 30 000 XAF' : 'Up to 30,000 XAF'}</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-2.5 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-ink-muted)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-forest)]" />
          <p>
            {lang === 'fr'
              ? 'En cas d’irritation, de réaction cutanée ou de problème persistant, interrompez l’application et adressez-vous à un professionnel de santé qualifié.'
              : 'If you experience irritation or persistent skin concerns, discontinue use and consult a qualified healthcare professional.'}
          </p>
        </div>
      </section>

      {/* Routines Grid */}
      <MotionSection className="mt-10 grid gap-8 md:grid-cols-2">
        {matchingRoutines.length === 0 ? (
          <div className="col-span-full border border-[var(--color-border)] bg-[var(--color-white)] p-8 text-center">
            <p className="text-sm text-[var(--color-ink-muted)]">
              {lang === 'fr'
                ? 'Aucune routine ne correspond exactement à ces filtres.'
                : 'No routine matches these filters.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setZonePref('all');
                setTexturePref('all');
                setBudgetPref('all');
              }}
              className="mt-4 rounded-full border border-[var(--color-border-strong)] px-5 py-2 text-xs font-medium text-[var(--color-forest)]"
            >
              {lang === 'fr' ? 'Réinitialiser' : 'Reset'}
            </button>
          </div>
        ) : (
          matchingRoutines.map((routine, idx) => {
            const metrics = computeRoutineMetrics(routine.slug);
            return (
              <MotionItem key={routine.id} index={idx}>
                <article className="group flex h-full flex-col justify-between border border-[var(--color-border)] bg-[var(--color-white)] p-6 transition-shadow duration-300 hover:shadow-[0_12px_28px_rgba(32,61,50,0.06)]">
                  <div>
                    <BotanicalVisual
                      theme="forest-balm"
                      title={tLoc(routine.title, lang)}
                      imageUrl={
                        metrics.items[0]?.product?.imageUrl ||
                        '/src/assets/images/product_face_cream_1794910698132.jpg'
                      }
                      className="mb-5 aspect-[16/9] border border-[var(--color-border)]"
                    />
                    <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
                      <span>
                        {routine.steps.length} {lang === 'fr' ? 'étapes' : 'steps'} · {routine.preferredTexture}
                      </span>
                    </div>
                    <h3 className="font-editorial mt-2 text-3xl font-medium text-[var(--color-forest)]">
                      {tLoc(routine.title, lang)}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{tLoc(routine.objective, lang)}</p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
                    <div>
                      <p className="tabular-nums text-base font-semibold text-[var(--color-forest)]">
                        {formatXaf(metrics.totalXaf, lang)}
                      </p>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        {metrics.allAvailable
                          ? lang === 'fr'
                            ? 'Tous les soins disponibles'
                            : 'All items in stock'
                          : lang === 'fr'
                          ? 'Disponibilité partielle'
                          : 'Partial availability'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/routines/${routine.slug}`)}
                      className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--color-forest)] px-5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-forest-hover)]"
                    >
                      <span>{lang === 'fr' ? 'Découvrir' : 'Explore'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              </MotionItem>
            );
          })
        )}
      </MotionSection>
    </div>
  );
}
