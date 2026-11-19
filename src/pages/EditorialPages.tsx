import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, CheckCircle2, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { tLoc } from '../i18n/translations';
import { ProductCard } from '../components/ProductCard';
import { EMAUS_DEFAULT_LOGO_URL } from '../components/BotanicalVisual';
import {
  EDITORIAL_EASE,
  MotionGrid,
  MotionGridItem,
  MotionItem,
  MotionProductGrid,
  MotionSection,
} from '../components/MotionSection';

export function AboutPage() {
  const { lang, bootstrap, navigate } = useStore();
  const reduceMotion = useReducedMotion();
  if (!bootstrap) return null;
  const { settings } = bootstrap;

  const pillars = [
    {
      index: '01',
      title: lang === 'fr' ? 'Écoute de chaque carnation' : 'Respecting every complexion',
      text:
        lang === 'fr'
          ? 'Notre ligne éditoriale s’adresse aux besoins quotidiens du visage, du corps et des cheveux — avec une attention particulière portée aux peaux noires et métissées, sans jamais promettre de modification de carnation.'
          : 'Our cosmetic approach focuses on daily care for face, body, and hair—paying close attention to melanin-rich complexions without ever making bleaching promises.',
    },
    {
      index: '02',
      title: lang === 'fr' ? 'Transparence des formules' : 'Formula transparency',
      text:
        lang === 'fr'
          ? 'Aucune référence n’est ouverte à la vente sans liste INCI vérifiée, format exact, mode d’emploi clair, précautions d’utilisation et suivi de lot FIFO avec date de péremption.'
          : 'No formulation is enabled for sale without verified INCI disclosure, confirmed sizing, clear usage guidance, precautions, and FIFO batch tracking.',
    },
    {
      index: '03',
      title: lang === 'fr' ? 'Ancrage local à Douala' : 'Rooted in Douala',
      text:
        lang === 'fr'
          ? 'Implantés à Douala (Makepe — Rhône Polen), nous accompagnons nos clients particuliers et partenaires professionnels avec un conseil humain direct et des modalités de réception vérifiées.'
          : 'Based in Douala (Makepe — Rhône Polen), we support individual customers and retail partners with direct guidance and transparent delivery options.',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16 space-y-16">
      {/* 1. Hero / Brand Statement */}
      <section className="grid items-center gap-10 border-b border-[var(--color-border)] pb-12 lg:grid-cols-12">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EDITORIAL_EASE }}
          className="lg:col-span-7"
        >
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-champagne)]">
            {lang === 'fr' ? 'À propos de la marque' : 'About the brand'} · {settings.legalEntityName}
          </p>
          <h1 className="font-editorial mt-3 text-[clamp(2.2rem,4vw,3.5rem)] font-medium leading-[1.08] text-[var(--color-forest)]">
            {lang === 'fr'
              ? 'Emaüs Skin Care : la cosmétique qui écoute votre peau.'
              : 'Emaüs Skin Care: cosmetics that listen to your skin.'}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--color-ink-muted)]">
            {lang === 'fr'
              ? 'Portée par Les Laboratoires Emaüs au Cameroun, notre maison conçoit et distribue des soins quotidiens avec une règle simple : la clarté des compositions, la mesure du discours et le respect sincère de votre peau.'
              : 'Operated by Les Laboratoires Emaüs in Cameroon, we formulate and distribute daily skincare guided by ingredient clarity, measured language, and genuine care.'}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <motion.button
              type="button"
              whileHover={reduceMotion ? undefined : { scale: 1.02 }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              onClick={() => navigate('/boutique')}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--color-forest)] px-6 text-xs font-medium text-white transition-colors hover:bg-[var(--color-forest-hover)]"
            >
              <span>{lang === 'fr' ? 'Découvrir la boutique' : 'Explore the shop'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </motion.button>
            <motion.button
              type="button"
              whileHover={reduceMotion ? undefined : { scale: 1.02 }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              onClick={() => navigate('/routines')}
              className="inline-flex h-11 items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-white)] px-6 text-xs font-medium text-[var(--color-forest)] transition-colors hover:bg-[var(--color-beige)]/40"
            >
              {lang === 'fr' ? 'Explorer les routines' : 'Explore routines'}
            </motion.button>
          </div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: EDITORIAL_EASE }}
          className="lg:col-span-5"
        >
          <div className="overflow-hidden border border-[var(--color-border)] bg-[var(--color-white)]">
            <img
              src="/assets/aistudio/images__10__f6a62b32.jpg"
              alt="Gamme authentique Emaüs Skin Care : Hydra Éclat 72H, Savon Dermatologique, Crème Visage et Max"
              className="aspect-[4/3] w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
            />
            <div className="flex items-center gap-4 border-t border-[var(--color-border)] p-5">
              <img
                src={EMAUS_DEFAULT_LOGO_URL}
                alt="Emblème officiel Emaüs Skin Care"
                className="h-12 w-auto shrink-0 object-contain"
              />
              <div>
                <p className="font-editorial text-xl font-medium text-[var(--color-forest)]">
                  {settings.brandName}
                </p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-champagne)]">
                  {settings.legalEntityName}
                </p>
                <p className="mt-1 text-xs italic text-[var(--color-ink-muted)]">
                  « {tLoc(settings.signature, lang)} »
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 2. Three Pillars (Staggered Grid) */}
      <MotionSection>
        <div className="mb-8 max-w-2xl">
          <h2 className="font-editorial text-3xl font-medium text-[var(--color-forest)]">
            {lang === 'fr' ? 'Nos principes fondateurs' : 'Our guiding principles'}
          </h2>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            {lang === 'fr'
              ? 'Chaque décision éditoriale, logistique et cosmétique s’appuie sur des faits vérifiables.'
              : 'Every editorial, logistics, and formulation decision rests on verifiable facts.'}
          </p>
        </div>

        <MotionGrid className="grid gap-6 md:grid-cols-3">
          {pillars.map((pillar) => (
            <MotionGridItem key={pillar.index}>
              <article className="flex h-full flex-col border border-[var(--color-border)] bg-[var(--color-white)] p-6 transition-shadow duration-300 hover:shadow-[0_12px_28px_rgba(32,61,50,0.06)]">
                <span className="tabular-nums text-xs font-semibold text-[var(--color-champagne)]">
                  {pillar.index}.
                </span>
                <h3 className="font-editorial mt-2 text-2xl font-medium text-[var(--color-forest)]">
                  {pillar.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">{pillar.text}</p>
              </article>
            </MotionGridItem>
          ))}
        </MotionGrid>
      </MotionSection>

      {/* 3. Standards & Location Split */}
      <MotionSection className="grid gap-8 lg:grid-cols-12">
        <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-7 lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-forest)]">
            <ShieldCheck className="h-4 w-4 text-[var(--color-champagne)]" />
            <span>{lang === 'fr' ? 'Engagements de publication & traçabilité' : 'Publication & traceability standards'}</span>
          </div>
          <ul className="space-y-3 pt-2 text-sm leading-relaxed text-[var(--color-ink)]">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-forest)]" />
              <span>
                {lang === 'fr'
                  ? 'Aucune fiche produit activée à la vente sans liste INCI complète, format vérifié, mode d’emploi et précautions.'
                  : 'No item sold without full INCI list, verified size, clear directions, and usage precautions.'}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-forest)]" />
              <span>
                {lang === 'fr'
                  ? 'La dénomination « Les Laboratoires Emaüs » identifie l’entreprise commerciale et ne constitue pas une accréditation médicale.'
                  : 'The trade name “Les Laboratoires Emaüs” identifies our business entity and does not claim medical accreditation.'}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-forest)]" />
              <span>
                {lang === 'fr'
                  ? 'Gestion des stocks par numéros de lot et dates de péremption, avec mise en quarantaine stricte de tout produit retourné ouvert.'
                  : 'Batch-tracked inventory with expiry monitoring and strict quarantine of any opened return.'}
              </span>
            </li>
          </ul>
        </div>

        <div className="border border-[var(--color-border)] bg-[var(--color-beige)]/35 p-7 lg:col-span-5 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
              {lang === 'fr' ? 'Nous trouver à Douala' : 'Find us in Douala'}
            </h2>
            <p className="flex items-start gap-2 text-sm text-[var(--color-ink)]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-forest)]" />
              <span>{settings.headquartersAddress}</span>
            </p>
            <p className="flex items-center gap-2 text-sm tabular-nums text-[var(--color-forest)] font-medium">
              <Phone className="h-4 w-4 shrink-0" />
              <span>
                {settings.primaryPhone} · {settings.secondaryPhone}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/rendez-vous')}
              className="rounded-full bg-[var(--color-forest)] px-5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-forest-hover)]"
            >
              {lang === 'fr' ? 'Prendre rendez-vous' : 'Book appointment'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/points-de-vente')}
              className="rounded-full border border-[var(--color-border-strong)] bg-[var(--color-white)] px-5 py-2.5 text-xs font-medium text-[var(--color-forest)] transition-colors hover:bg-[var(--color-ivory)]"
            >
              {lang === 'fr' ? 'Points de vente' : 'Points of sale'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="rounded-full border border-[var(--color-border-strong)] bg-[var(--color-white)] px-5 py-2.5 text-xs font-medium text-[var(--color-forest)] transition-colors hover:bg-[var(--color-ivory)]"
            >
              {lang === 'fr' ? 'Nous contacter' : 'Contact us'}
            </button>
          </div>
        </div>
      </MotionSection>
    </div>
  );
}

export function BrandPage() {
  return <AboutPage />;
}

export function IngredientsPage({ slug }: { slug?: string }) {
  const { lang, bootstrap, navigate } = useStore();
  if (!bootstrap) return null;

  if (slug) {
    const ing = bootstrap.ingredients.find((i) => i.slug === slug);
    if (!ing) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="font-editorial text-4xl text-[var(--color-forest)]">
            {lang === 'fr' ? 'Ingrédient introuvable' : 'Ingredient not found'}
          </h1>
          <button
            type="button"
            onClick={() => navigate('/ingredients')}
            className="mt-6 rounded-full bg-[var(--color-forest)] px-6 py-3 text-xs font-medium text-white"
          >
            {lang === 'fr' ? 'Bibliothèque des ingrédients' : 'Ingredient glossary'}
          </button>
        </div>
      );
    }

    const relatedProducts = bootstrap.products.filter(
      (p) => p.status === 'published' && p.ingredientSlugs.includes(ing.slug)
    );

    return (
      <MotionSection className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <button
          type="button"
          onClick={() => navigate('/ingredients')}
          className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-forest)] hover:underline"
        >
          ← {lang === 'fr' ? 'Tous les ingrédients' : 'All ingredients'}
        </button>

        <div className="mt-6 border-b border-[var(--color-border)] pb-8">
          <p className="text-xs italic text-[var(--color-champagne)]">{ing.botanicalName}</p>
          <h1 className="font-editorial mt-2 text-4xl font-medium text-[var(--color-forest)]">
            {tLoc(ing.name, lang)}
          </h1>
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
            {lang === 'fr' ? 'Origine : ' : 'Origin: '}
            {tLoc(ing.origin, lang)}
          </p>
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-6">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-forest)]">
              {lang === 'fr' ? 'Rôle cosmétique documenté' : 'Documented cosmetic role'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink)]">{tLoc(ing.cosmeticRole, lang)}</p>
          </div>
          <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-6">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-forest)]">
              {lang === 'fr' ? 'Notes d’usage' : 'Usage notes'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink)]">{tLoc(ing.usageNotes, lang)}</p>
          </div>
        </div>

        <p className="mt-6 border border-[var(--color-border)] bg-[var(--color-beige)]/35 p-4 text-xs text-[var(--color-ink-muted)]">
          {tLoc(ing.disclaimer, lang)}
        </p>

        {relatedProducts.length > 0 && (
          <section className="mt-14">
            <h2 className="font-editorial text-3xl font-medium text-[var(--color-forest)]">
              {lang === 'fr' ? 'Soins mentionnant cet ingrédient' : 'Products featuring this ingredient'}
            </h2>
            <MotionProductGrid className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map((p, idx) => (
                <ProductCard key={p.id} product={p} index={idx} />
              ))}
            </MotionProductGrid>
          </section>
        )}
      </MotionSection>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="max-w-3xl border-b border-[var(--color-border)] pb-8">
        <h1 className="font-editorial text-4xl font-medium text-[var(--color-forest)]">
          {lang === 'fr' ? 'Bibliothèque des ingrédients' : 'Ingredient Library'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
          {lang === 'fr'
            ? 'Fiches pédagogiques sur les actifs végétaux et humectants utilisés en cosmétique. La présence d’un ingrédient ne suffit pas à extrapoler l’effet d’un produit fini.'
            : 'Educational monographs on botanicals and humectants used in skincare. Finished product effects depend on the full validated formula.'}
        </p>
      </div>

      <MotionGrid className="mt-10 grid gap-6 sm:grid-cols-2">
        {bootstrap.ingredients.map((ing) => (
          <MotionGridItem key={ing.id}>
            <article className="h-full border border-[var(--color-border)] bg-[var(--color-white)] p-6 transition-shadow duration-300 hover:shadow-[0_12px_26px_rgba(32,61,50,0.06)]">
              <p className="text-xs italic text-[var(--color-ink-muted)]">{ing.botanicalName}</p>
              <h2 className="font-editorial mt-1 text-2xl font-medium text-[var(--color-forest)]">
                <a
                  href={`/ingredients/${ing.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/ingredients/${ing.slug}`);
                  }}
                  className="hover:underline"
                >
                  {tLoc(ing.name, lang)}
                </a>
              </h2>
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{tLoc(ing.cosmeticRole, lang)}</p>
              <button
                type="button"
                onClick={() => navigate(`/ingredients/${ing.slug}`)}
                className="mt-4 text-xs font-medium text-[var(--color-forest)] hover:underline"
              >
                {lang === 'fr' ? 'Lire la fiche →' : 'Read monograph →'}
              </button>
            </article>
          </MotionGridItem>
        ))}
      </MotionGrid>
    </div>
  );
}

export function JournalPage({ slug }: { slug?: string }) {
  const { lang, bootstrap, navigate } = useStore();
  if (!bootstrap) return null;

  if (slug) {
    const art = bootstrap.articles.find((a) => a.slug === slug);
    if (!art) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="font-editorial text-4xl text-[var(--color-forest)]">
            {lang === 'fr' ? 'Article introuvable' : 'Article not found'}
          </h1>
          <button
            type="button"
            onClick={() => navigate('/journal')}
            className="mt-6 rounded-full bg-[var(--color-forest)] px-6 py-3 text-xs font-medium text-white"
          >
            {lang === 'fr' ? 'Retour au journal' : 'Back to journal'}
          </button>
        </div>
      );
    }

    return (
      <MotionSection className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        <button
          type="button"
          onClick={() => navigate('/journal')}
          className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-forest)] hover:underline"
        >
          ← {lang === 'fr' ? 'Tous les articles' : 'All articles'}
        </button>
        <div className="mt-6 border-b border-[var(--color-border)] pb-6">
          <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
            <span>{tLoc(art.category, lang)}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{art.publishedAt}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{art.readMinutes} min</span>
          </div>
          <h1 className="font-editorial mt-3 text-4xl font-medium leading-tight text-[var(--color-forest)]">
            {tLoc(art.title, lang)}
          </h1>
        </div>
        <div className="mt-8 space-y-5 text-base leading-relaxed text-[var(--color-ink)]">
          <p className="font-medium text-[var(--color-ink-muted)]">{tLoc(art.excerpt, lang)}</p>
          <p>{tLoc(art.body, lang)}</p>
        </div>
      </MotionSection>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="border-b border-[var(--color-border)] pb-8">
        <h1 className="font-editorial text-4xl font-medium text-[var(--color-forest)]">Journal Emaüs</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          {lang === 'fr'
            ? 'Articles éditoriaux sur l’écoute de la peau, la lecture des étiquettes et les routines responsables.'
            : 'Editorial notes on listening to your skin, reading labels, and balanced routines.'}
        </p>
      </div>
      <MotionGrid className="mt-10 grid gap-6 md:grid-cols-3">
        {bootstrap.articles.map((art) => (
          <MotionGridItem key={art.id}>
            <article className="flex h-full flex-col border border-[var(--color-border)] bg-[var(--color-white)] p-6 transition-shadow duration-300 hover:shadow-[0_12px_26px_rgba(32,61,50,0.06)]">
              <div className="text-xs text-[var(--color-ink-muted)]">
                {tLoc(art.category, lang)} · <span className="tabular-nums">{art.publishedAt}</span>
              </div>
              <h2 className="font-editorial mt-2 text-2xl font-medium text-[var(--color-forest)]">
                <a
                  href={`/journal/${art.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/journal/${art.slug}`);
                  }}
                  className="hover:underline"
                >
                  {tLoc(art.title, lang)}
                </a>
              </h2>
              <p className="mt-2 flex-1 text-sm text-[var(--color-ink-muted)]">{tLoc(art.excerpt, lang)}</p>
              <button
                type="button"
                onClick={() => navigate(`/journal/${art.slug}`)}
                className="mt-5 self-start text-xs font-medium text-[var(--color-forest)] hover:underline"
              >
                {lang === 'fr' ? 'Lire →' : 'Read →'}
              </button>
            </article>
          </MotionGridItem>
        ))}
      </MotionGrid>
    </div>
  );
}

export function OutletsPage() {
  const { lang, bootstrap } = useStore();
  if (!bootstrap) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="border-b border-[var(--color-border)] pb-8">
        <h1 className="font-editorial text-4xl font-medium text-[var(--color-forest)]">
          {lang === 'fr' ? 'Points de vente & Retrait' : 'Points of Sale & Pickup'}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
          {lang === 'fr'
            ? 'Chaque implantation indique explicitement son statut (siège, boutique ou revendeur) et son niveau de vérification.'
            : 'Each location explicitly states its type (headquarters, boutique, or reseller) and verification status.'}
        </p>
      </div>

      <MotionGrid className="mt-10 grid gap-6 md:grid-cols-2">
        {bootstrap.outlets.map((outlet) => (
          <MotionGridItem key={outlet.id}>
            <article className="h-full space-y-3 border border-[var(--color-border)] bg-[var(--color-white)] p-6 transition-shadow duration-300 hover:shadow-[0_12px_26px_rgba(32,61,50,0.06)]">
              <div className="text-xs text-[var(--color-champagne)]">
                {outlet.city} ·{' '}
                {outlet.verificationStatus === 'confirmed'
                  ? lang === 'fr'
                    ? 'Confirmé'
                    : 'Confirmed'
                  : outlet.verificationStatus === 'verifying'
                  ? lang === 'fr'
                    ? 'En cours de vérification'
                    : 'Under verification'
                  : lang === 'fr'
                  ? 'À confirmer par la marque'
                  : 'Pending brand confirmation'}
              </div>
              <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">{outlet.name}</h2>
              <p className="flex items-start gap-2 text-sm text-[var(--color-ink)]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-forest)]" />
                <span>{outlet.address}</span>
              </p>
              <p className="flex items-center gap-2 text-sm text-[var(--color-ink)] tabular-nums">
                <Phone className="h-4 w-4 shrink-0 text-[var(--color-forest)]" />
                <span>{outlet.phone}</span>
              </p>
              <p className="text-xs text-[var(--color-ink-muted)]">{outlet.hours}</p>
              <p className="border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-ink-muted)]">
                {tLoc(outlet.verificationNote, lang)}
              </p>
            </article>
          </MotionGridItem>
        ))}
      </MotionGrid>
    </div>
  );
}
