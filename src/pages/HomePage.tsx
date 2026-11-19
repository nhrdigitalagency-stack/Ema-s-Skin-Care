import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ImagePlus,
  MessageCircle,
  Star,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORY_LABELS, formatXaf, tLoc, UI_STRINGS } from '../i18n/translations';
import type { CategorySlug } from '../types/ecommerce';
import { BotanicalVisual, EMAUS_DEFAULT_LOGO_URL } from '../components/BotanicalVisual';
import { ProductCard } from '../components/ProductCard';
import { AppointmentBookingSection } from '../components/AppointmentBookingSection';
import { EDITORIAL_EASE, MotionItem, MotionProductGrid, MotionSection } from '../components/MotionSection';

const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/FsrAdXceHfaBjfcLawQGPx';

const HERO_SLIDES = [
  {
    id: 'botanical-hero',
    desktop: '/src/assets/images/hero_desktop_botanical_1794910151121.jpg',
    tablet: '/src/assets/images/hero_tablet_botanical_1794910152885.jpg',
    mobile: '/src/assets/images/hero_mobile_botanical_1794910152301.jpg',
    alt: 'Soins botaniques Emaüs Skin Care — Les Laboratoires Emaüs',
  },
  {
    id: 'atelier-ritual',
    desktop: '/src/assets/images/product_face_cream_1794910698132.jpg',
    tablet: '/src/assets/images/product_body_milk_1794910696545.jpg',
    mobile: '/src/assets/images/product_radiance_serum_1794910697007.jpg',
    alt: 'Gamme de soins quotidiens Emaüs Skin Care à Douala',
  },
];

interface DraftUploadImage {
  id: string;
  dataUrl: string;
  name: string;
}

async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.onload = () => {
      const rawUrl = typeof reader.result === 'string' ? reader.result : '';
      const img = new Image();
      img.onerror = () => reject(new Error('Image invalide.'));
      img.onload = () => {
        const maxDim = 1400;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(outputType, 0.84));
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function HomePage() {
  const { lang, bootstrap, navigate, refreshBootstrap, showToast } = useStore();
  const str = UI_STRINGS[lang];
  const reduceMotion = useReducedMotion();

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterDone, setNewsletterDone] = useState(false);

  // Community WhatsApp state
  const [communityPhone, setCommunityPhone] = useState('');
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityJoined, setCommunityJoined] = useState(false);

  // FAQ accordion state
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  // Visitor testimonial submission state
  const [testiAuthor, setTestiAuthor] = useState(bootstrap?.session.user?.fullName || '');
  const [testiCity, setTestiCity] = useState('');
  const [testiProduct, setTestiProduct] = useState('');
  const [testiRating, setTestiRating] = useState(5);
  const [testiComment, setTestiComment] = useState('');
  const [testiImages, setTestiImages] = useState<DraftUploadImage[]>([]);
  const [testiConsent, setTestiConsent] = useState(false);
  const [testiLoading, setTestiLoading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null);
  const [deletingImgKey, setDeletingImgKey] = useState<string | null>(null);
  const [heroSlideIdx, setHeroSlideIdx] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setHeroSlideIdx((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6800);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  if (!bootstrap) return null;

  const { settings, products, routines, ingredients, articles, faqs, testimonials, session } = bootstrap;
  const publishedProducts = products.filter((p) => p.status === 'published');
  const draftProducts = products.filter((p) => p.status === 'draft_pending_validation');
  const activeCategories = Array.from(new Set(publishedProducts.map((p) => p.category))) as CategorySlug[];
  const featuredRoutine = routines[0];
  const isOwnerOrStaff =
    Boolean(session.user) && !['customer', 'b2b_partner'].includes(session.user!.role);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterConsent) return;
    setNewsletterLoading(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail, consentMarketing: newsletterConsent }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || str.common.error);
      setNewsletterDone(true);
      setNewsletterEmail('');
      showToast(lang === 'fr' ? 'Inscription enregistrée.' : 'Subscription saved.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : str.common.error, 'error');
    } finally {
      setNewsletterLoading(false);
    }
  };

  const handleCommunityJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityPhone.trim()) return;
    setCommunityLoading(true);
    try {
      const res = await fetch('/api/community/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: communityPhone }),
      });
      const data = (await res.json()) as { error?: string; redirectUrl?: string };
      if (!res.ok) throw new Error(data.error || str.common.error);
      setCommunityJoined(true);
      setCommunityPhone('');
      showToast(
        lang === 'fr'
          ? 'Redirection vers la communauté WhatsApp Emaüs…'
          : 'Redirecting to the Emaüs WhatsApp community…',
        'success'
      );
      const targetUrl = data.redirectUrl || WHATSAPP_COMMUNITY_URL;
      window.setTimeout(() => {
        window.location.assign(targetUrl);
      }, 450);
    } catch (err) {
      showToast(err instanceof Error ? err.message : str.common.error, 'error');
    } finally {
      setCommunityLoading(false);
    }
  };

  const handleSelectTestimonialFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, Math.max(0, 3 - testiImages.length));
    e.target.value = '';
    if (files.length === 0) return;

    for (const file of files) {
      if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
        showToast(
          lang === 'fr' ? 'Formats acceptés : JPG, PNG ou WebP.' : 'Supported formats: JPG, PNG or WebP.',
          'error'
        );
        continue;
      }
      try {
        const compressed = await compressImageFile(file);
        setTestiImages((prev) =>
          prev.length >= 3
            ? prev
            : [
                ...prev,
                {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  dataUrl: compressed,
                  name: file.name,
                },
              ]
        );
      } catch {
        showToast(lang === 'fr' ? 'Impossible de charger une des images.' : 'Could not load image.', 'error');
      }
    }
  };

  const handleTestimonialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testiAuthor.trim() || !testiComment.trim() || !testiConsent) return;
    setTestiLoading(true);
    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: testiAuthor,
          city: testiCity,
          productName: testiProduct,
          rating: testiRating,
          comment: testiComment,
          images: testiImages.map((img) => ({ dataUrl: img.dataUrl, alt: testiAuthor })),
          consentGiven: testiConsent,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || str.common.error);
      setTestiComment('');
      setTestiCity('');
      setTestiProduct('');
      setTestiImages([]);
      setTestiConsent(false);
      await refreshBootstrap();
      showToast(
        lang === 'fr'
          ? 'Merci ! Votre témoignage est maintenant visible par tous les visiteurs.'
          : 'Thank you! Your testimonial is now visible to all visitors.',
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : str.common.error, 'error');
    } finally {
      setTestiLoading(false);
    }
  };

  const handleOwnerDeleteTestimonialImage = async (testimonialId: string, imageId: string) => {
    const key = `${testimonialId}-${imageId}`;
    setDeletingImgKey(key);
    try {
      const res = await fetch(`/api/admin/testimonials/${testimonialId}/images/${imageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || str.common.error);
      await refreshBootstrap();
      showToast(lang === 'fr' ? 'Image supprimée du témoignage.' : 'Image removed from testimonial.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : str.common.error, 'error');
    } finally {
      setDeletingImgKey(null);
    }
  };

  return (
    <div className="space-y-20 pb-20 lg:space-y-28 lg:pb-28">
      {/* 1. HERO PLEIN ÉCRAN ADAPTATIF (ZOOM + SLIDE + CALQUE NOIR-VERT ALLÉGÉ) */}
      <section className="relative flex min-h-[calc(100svh-4.5rem)] w-full items-center overflow-hidden bg-[#081d14] text-white">
        <AnimatePresence mode="sync" initial={false}>
          <motion.picture
            key={HERO_SLIDES[heroSlideIdx].id}
            initial={reduceMotion ? false : { opacity: 0, scale: 1.09, x: '3.5%' }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1.0, x: '-1.5%' }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.0, x: '-3.5%' }}
            transition={{
              opacity: { duration: 0.9, ease: 'easeInOut' },
              scale: { duration: 7.2, ease: 'easeOut' },
              x: { duration: 7.2, ease: 'linear' },
            }}
            className="pointer-events-none absolute inset-0 h-full w-full will-change-transform"
          >
            <source media="(min-width: 1024px)" srcSet={HERO_SLIDES[heroSlideIdx].desktop} />
            <source media="(min-width: 640px)" srcSet={HERO_SLIDES[heroSlideIdx].tablet} />
            <img
              src={HERO_SLIDES[heroSlideIdx].mobile}
              alt={HERO_SLIDES[heroSlideIdx].alt}
              className="h-full w-full object-cover object-center"
              referrerPolicy="no-referrer"
            />
          </motion.picture>
        </AnimatePresence>

        {/* Calque noir-vert allégé laissant voir la richesse visuelle en arrière-plan */}
        <div aria-hidden="true" className="absolute inset-0 bg-[#071a12]/32" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#05130d]/55 via-[#071a12]/16 to-[#05130d]/28"
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EDITORIAL_EASE }}
              className="lg:col-span-8"
            >
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#e6d2ad] drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)]">
                {tLoc(settings.heroLabel, lang)} · {settings.legalEntityName}
              </p>
              <h1 className="font-editorial mt-4 max-w-3xl text-balance text-[clamp(2.35rem,5vw,4.35rem)] font-medium leading-[1.06] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
                {tLoc(settings.heroTitle, lang)}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#f0f5f2] drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)] sm:text-lg">
                {tLoc(settings.heroSubtitle, lang)}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
                <motion.button
                  type="button"
                  whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                  onClick={() => navigate('/boutique')}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-medium text-[#11271e] shadow-md transition-colors hover:bg-[#f4f1ea] whitespace-nowrap"
                >
                  <span>{str.hero.ctaPrimary}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                  onClick={() => navigate('/routines')}
                  className="inline-flex h-12 items-center rounded-full border border-white/60 bg-[#071a12]/35 px-7 text-sm font-medium text-white backdrop-blur-[2px] transition-colors hover:bg-white/20 whitespace-nowrap"
                >
                  {str.hero.ctaSecondary}
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                  onClick={() => {
                    const el = document.getElementById('rendez-vous');
                    if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
                    else navigate('/rendez-vous');
                  }}
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-[#d9c39b]/80 bg-[#0d281d]/55 px-6 text-sm font-medium text-[#f5e7cb] transition-colors hover:bg-[#143c2c]/80 whitespace-nowrap"
                >
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <span>{lang === 'fr' ? 'Prendre RDV' : 'Book Appointment'}</span>
                </motion.button>
              </div>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.65, delay: 0.14, ease: EDITORIAL_EASE }}
              className="hidden lg:col-span-4 lg:flex lg:justify-end"
            >
              <div className="w-full max-w-xs border border-white/25 bg-[#071a12]/65 p-7 text-white shadow-xl">
                <img
                  src={EMAUS_DEFAULT_LOGO_URL}
                  alt="Emblème Emaüs Skin Care"
                  className="h-24 w-auto object-contain brightness-0 invert"
                />
                <p className="mt-6 text-xs uppercase tracking-[0.14em] text-[#d9c39b]">
                  {lang === 'fr' ? 'Douala, Cameroun' : 'Douala, Cameroon'}
                </p>
                <p className="font-editorial mt-2 text-2xl leading-snug text-white">
                  {tLoc(settings.signature, lang)}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Contrôle discret des visuels Hero */}
          <div className="mt-10 flex items-center gap-2">
            {HERO_SLIDES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                aria-label={lang === 'fr' ? `Visuel ${idx + 1}` : `Slide ${idx + 1}`}
                onClick={() => setHeroSlideIdx(idx)}
                className={`h-1.5 transition-all duration-300 ${
                  heroSlideIdx === idx ? 'w-10 bg-white' : 'w-4 bg-white/45 hover:bg-white/75'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 2. CATÉGORIES DISPONIBLES */}
      {activeCategories.length > 0 && (
        <MotionSection className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-editorial text-3xl font-medium text-[var(--color-forest)]">
                {str.sections.categories}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{str.sections.categoriesSub}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/boutique')}
              className="self-start text-sm font-medium text-[var(--color-forest)] underline-offset-4 hover:underline sm:self-auto"
            >
              {str.common.viewAll} →
            </button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {activeCategories.map((cat, idx) => {
              const count = publishedProducts.filter((p) => p.category === cat).length;
              return (
                <MotionItem key={cat} index={idx}>
                  <a
                    href={`/collections/${cat}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/collections/${cat}`);
                    }}
                    className="group flex h-full flex-col justify-between border border-[var(--color-border)] bg-[var(--color-white)] p-5 transition-all duration-300 hover:border-[var(--color-forest)] hover:shadow-[0_12px_26px_rgba(32,61,50,0.06)]"
                  >
                    <span className="tabular-nums text-xs text-[var(--color-ink-muted)]">
                      {count} {lang === 'fr' ? (count > 1 ? 'références' : 'référence') : count > 1 ? 'items' : 'item'}
                    </span>
                    <div className="mt-6 flex items-center justify-between gap-2">
                      <span className="font-editorial text-xl font-medium text-[var(--color-forest)]">
                        {tLoc(CATEGORY_LABELS[cat], lang)}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-champagne)] transition-transform duration-300 group-hover:translate-x-1.5" />
                    </div>
                  </a>
                </MotionItem>
              );
            })}
          </div>
        </MotionSection>
      )}

      {/* 3. SÉLECTION DU CATALOGUE (GRILLE STAGGER VARIANTS) */}
      <MotionSection className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-editorial text-3xl font-medium text-[var(--color-forest)]">
              {str.sections.selection}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{str.sections.selectionSub}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/boutique')}
            className="self-start text-sm font-medium text-[var(--color-forest)] underline-offset-4 hover:underline sm:self-auto"
          >
            {str.hero.ctaPrimary} →
          </button>
        </div>

        <MotionProductGrid className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {publishedProducts.slice(0, 6).map((product, idx) => (
            <ProductCard key={product.id} product={product} index={idx} />
          ))}
        </MotionProductGrid>

        {draftProducts.length > 0 && (
          <MotionItem hoverLift={false} className="mt-8 border border-[var(--color-border)] bg-[var(--color-white)] p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-forest)]">
                  {lang === 'fr'
                    ? `${draftProducts.length} références Emaüs en cours de finalisation`
                    : `${draftProducts.length} Emaüs formulations currently finalizing`}
                </h3>
                <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                  {draftProducts.map((d) => tLoc(d.name, lang)).join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/boutique?drafts=1')}
                className="shrink-0 rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-xs font-medium text-[var(--color-forest)] transition-colors hover:bg-[var(--color-ivory)]"
              >
                {lang === 'fr' ? 'Consulter ces fiches' : 'View draft sheets'}
              </button>
            </div>
          </MotionItem>
        )}
      </MotionSection>

      {/* 4. ROUTINE ÉDITORIALE MISE EN AVANT */}
      {featuredRoutine && (
        <MotionSection className="border-y border-[var(--color-border)] bg-[var(--color-white)] py-16 lg:py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
            <div className="group lg:col-span-5">
              <BotanicalVisual
                theme="forest-balm"
                title={tLoc(featuredRoutine.title, lang)}
                subtitle={`${featuredRoutine.steps.length} ${lang === 'fr' ? 'étapes essentielles' : 'essential steps'}`}
                imageUrl={
                  products.find((p) => p.slug === featuredRoutine.steps[0]?.productSlug)?.imageUrl ||
                  '/src/assets/images/product_face_cream_1794910698132.jpg'
                }
                className="aspect-[4/3] border border-[var(--color-border)]"
              />
            </div>
            <div className="lg:col-span-7">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-champagne)]">
                {str.sections.routineSpotlight}
              </p>
              <h2 className="font-editorial mt-2 text-3xl font-medium text-[var(--color-forest)]">
                {tLoc(featuredRoutine.title, lang)}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                {tLoc(featuredRoutine.objective, lang)}
              </p>

              <ol className="mt-6 space-y-3 border-t border-[var(--color-border)] pt-5">
                {featuredRoutine.steps.map((step) => {
                  const prod = products.find((p) => p.slug === step.productSlug);
                  const price = prod?.variants[0]?.priceXaf ?? null;
                  return (
                    <li
                      key={step.order}
                      className="flex flex-wrap items-baseline justify-between gap-2 text-sm transition-transform duration-200 hover:translate-x-1"
                    >
                      <span>
                        <span className="tabular-nums font-medium text-[var(--color-forest)]">0{step.order}.</span>{' '}
                        <span className="font-medium text-[var(--color-ink)]">{tLoc(step.stepTitle, lang)}</span>
                        <span className="text-[var(--color-ink-muted)]"> — {tLoc(step.frequency, lang)}</span>
                      </span>
                      <span className="tabular-nums text-xs text-[var(--color-ink-muted)]">
                        {formatXaf(price, lang)}
                      </span>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-7 flex flex-wrap gap-3">
                <motion.button
                  type="button"
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                  onClick={() => navigate(`/routines/${featuredRoutine.slug}`)}
                  className="inline-flex h-11 items-center rounded-full bg-[var(--color-forest)] px-6 text-xs font-medium text-white transition-colors hover:bg-[var(--color-forest-hover)]"
                >
                  {lang === 'fr' ? 'Voir la routine complète' : 'View full routine'}
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                  onClick={() => navigate('/routines')}
                  className="inline-flex h-11 items-center rounded-full border border-[var(--color-border-strong)] px-6 text-xs font-medium text-[var(--color-forest)] transition-colors hover:bg-[var(--color-ivory)]"
                >
                  {lang === 'fr' ? 'Questionnaire de découverte' : 'Routine discovery guide'}
                </motion.button>
              </div>
            </div>
          </div>
        </MotionSection>
      )}

      {/* 5. INGRÉDIENTS DOCUMENTÉS & PRÉSENTATION DE LA MARQUE */}
      {ingredients.length > 0 && (
        <MotionSection className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-champagne)]">
                {settings.legalEntityName}
              </p>
              <h2 className="font-editorial mt-2 text-3xl font-medium text-[var(--color-forest)]">
                {str.sections.brandTitle}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                {lang === 'fr'
                  ? 'Implantée à Douala, Emaüs Skin Care place l’écoute de la peau et la transparence des formules au cœur de son approche. Chaque produit publié comporte son mode d’emploi, ses précautions et sa liste INCI vérifiée.'
                  : 'Based in Douala, Emaüs Skin Care centers transparent cosmetic communication and careful routines. Every published product carries verified directions, precautions, and full INCI disclosure.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <motion.button
                  type="button"
                  whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                  onClick={() => navigate('/a-propos')}
                  className="rounded-full border border-[var(--color-border-strong)] px-5 py-2.5 text-xs font-medium text-[var(--color-forest)] transition-colors hover:bg-[var(--color-white)]"
                >
                  {lang === 'fr' ? 'À propos de la marque' : 'About the brand'}
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                  onClick={() => navigate('/points-de-vente')}
                  className="rounded-full border border-[var(--color-border-strong)] px-5 py-2.5 text-xs font-medium text-[var(--color-forest)] transition-colors hover:bg-[var(--color-white)]"
                >
                  {lang === 'fr' ? 'Points de vente' : 'Points of sale'}
                </motion.button>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <h3 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
                  {str.sections.ingredients}
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/ingredients')}
                  className="text-xs font-medium text-[var(--color-forest)] hover:underline"
                >
                  {str.common.viewAll} →
                </button>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {ingredients.slice(0, 4).map((ing, idx) => (
                  <MotionItem key={ing.id} index={idx}>
                    <a
                      href={`/ingredients/${ing.slug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/ingredients/${ing.slug}`);
                      }}
                      className="block h-full border border-[var(--color-border)] bg-[var(--color-white)] p-5 transition-all duration-300 hover:border-[var(--color-forest)] hover:shadow-[0_10px_24px_rgba(32,61,50,0.06)]"
                    >
                      <p className="text-xs italic text-[var(--color-ink-muted)]">{ing.botanicalName}</p>
                      <p className="mt-1 text-base font-medium text-[var(--color-forest)]">{tLoc(ing.name, lang)}</p>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                        {tLoc(ing.cosmeticRole, lang)}
                      </p>
                    </a>
                  </MotionItem>
                ))}
              </div>
            </div>
          </div>
        </MotionSection>
      )}

      {/* 6. TÉMOIGNAGES VISITEURS & PARTAGE DE PHOTOS */}
      <MotionSection id="temoignages" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-champagne)]">
              {lang === 'fr' ? 'Retours d’expérience' : 'Community stories'}
            </p>
            <h2 className="font-editorial mt-1 text-3xl font-medium text-[var(--color-forest)]">
              {lang === 'fr' ? 'Témoignages de nos visiteurs' : 'Visitor Testimonials'}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              {lang === 'fr'
                ? 'Partagez votre expérience avec nos soins et joignez vos propres photos visibles par toute la communauté.'
                : 'Share your skincare experience and upload photos visible to the entire community.'}
            </p>
          </div>
          {isOwnerOrStaff && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="self-start text-xs font-medium text-[var(--color-forest)] underline underline-offset-4 sm:self-auto"
            >
              {lang === 'fr' ? 'Gérer les images dans l’administration' : 'Manage images in admin'}
            </button>
          )}
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-12">
          {/* Liste publique des témoignages */}
          <div className="space-y-4 lg:col-span-7">
            {testimonials.length === 0 ? (
              <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-8">
                <p className="font-editorial text-2xl text-[var(--color-forest)]">
                  {lang === 'fr' ? 'Aucun témoignage publié pour l’instant.' : 'No visitor testimonials yet.'}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                  {lang === 'fr'
                    ? 'Aucun avis ni photo n’est inventé sur ce site. Soyez le premier visiteur à partager votre retour d’utilisation réel avec le formulaire ci-contre.'
                    : 'No reviews or photos are fabricated on this site. Be the first visitor to share your genuine skincare feedback using the form.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {testimonials.map((t, idx) => (
                  <MotionItem key={t.id} index={idx} hoverLift={false}>
                    <article className="flex h-full flex-col justify-between border border-[var(--color-border)] bg-[var(--color-white)] p-5">
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-ink-muted)]">
                          <span className="inline-flex items-center gap-1 tabular-nums font-medium text-[var(--color-forest)]">
                            <Star className="h-3.5 w-3.5 fill-[var(--color-champagne)] text-[var(--color-champagne)]" />
                            {t.rating}/5
                          </span>
                          <span className="tabular-nums">{t.createdAt.slice(0, 10)}</span>
                        </div>
                        {t.productName && (
                          <p className="mt-2 text-xs font-medium text-[var(--color-champagne)]">{t.productName}</p>
                        )}
                        <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink)]">« {t.comment} »</p>

                        {t.images.length > 0 && (
                          <div className="mt-4 grid grid-cols-3 gap-2">
                            {t.images.map((img) => {
                              const imgKey = `${t.id}-${img.id}`;
                              return (
                                <div key={img.id} className="group relative aspect-square overflow-hidden border border-[var(--color-border)] bg-[var(--color-ivory)]">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setLightboxImage({
                                        url: img.url,
                                        alt: img.alt || `Photo témoignage de ${t.authorName}`,
                                      })
                                    }
                                    className="block h-full w-full"
                                  >
                                    <img
                                      src={img.url}
                                      alt={img.alt || `Photo témoignage de ${t.authorName}`}
                                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                  </button>
                                  {isOwnerOrStaff && (
                                    <button
                                      type="button"
                                      disabled={deletingImgKey === imgKey}
                                      onClick={() => void handleOwnerDeleteTestimonialImage(t.id, img.id)}
                                      title={lang === 'fr' ? 'Supprimer cette image' : 'Delete this image'}
                                      aria-label={lang === 'fr' ? 'Supprimer cette image' : 'Delete this image'}
                                      className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-700 text-white shadow hover:bg-red-800 disabled:opacity-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center gap-2 border-t border-[var(--color-border)] pt-3 text-xs">
                        <span className="font-semibold text-[var(--color-forest)]">{t.authorName}</span>
                        {t.city && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[var(--color-ink-muted)]">{t.city}</span>
                          </>
                        )}
                      </div>
                    </article>
                  </MotionItem>
                ))}
              </div>
            )}
          </div>

          {/* Formulaire visiteur pour témoigner & importer des images */}
          <div className="lg:col-span-5">
            <form
              onSubmit={handleTestimonialSubmit}
              className="space-y-4 border border-[var(--color-border)] bg-[var(--color-white)] p-6"
            >
              <h3 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
                {lang === 'fr' ? 'Laisser un témoignage' : 'Share your testimonial'}
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="testi-author" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    {lang === 'fr' ? 'Nom / Prénom *' : 'Full name *'}
                  </label>
                  <input
                    id="testi-author"
                    type="text"
                    required
                    value={testiAuthor}
                    onChange={(e) => setTestiAuthor(e.target.value)}
                    placeholder="Clarisse M."
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-ivory)] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="testi-city" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    {lang === 'fr' ? 'Ville (optionnel)' : 'City (optional)'}
                  </label>
                  <input
                    id="testi-city"
                    type="text"
                    value={testiCity}
                    onChange={(e) => setTestiCity(e.target.value)}
                    placeholder="Douala"
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-ivory)] px-3 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="testi-product" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    {lang === 'fr' ? 'Soin utilisé (optionnel)' : 'Product used (optional)'}
                  </label>
                  <select
                    id="testi-product"
                    value={testiProduct}
                    onChange={(e) => setTestiProduct(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-ivory)] px-3 text-xs"
                  >
                    <option value="">{lang === 'fr' ? 'Soin général / Routine' : 'General care / Routine'}</option>
                    {publishedProducts.map((p) => (
                      <option key={p.id} value={tLoc(p.name, lang)}>
                        {tLoc(p.name, lang)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="testi-rating" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    {lang === 'fr' ? 'Appréciation' : 'Rating'}
                  </label>
                  <select
                    id="testi-rating"
                    value={testiRating}
                    onChange={(e) => setTestiRating(Number(e.target.value))}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-ivory)] px-3 text-xs tabular-nums"
                  >
                    <option value={5}>5 / 5</option>
                    <option value={4}>4 / 5</option>
                    <option value={3}>3 / 5</option>
                    <option value={2}>2 / 5</option>
                    <option value={1}>1 / 5</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="testi-comment" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'Votre témoignage *' : 'Your testimonial *'}
                </label>
                <textarea
                  id="testi-comment"
                  rows={3}
                  required
                  value={testiComment}
                  onChange={(e) => setTestiComment(e.target.value)}
                  placeholder={
                    lang === 'fr'
                      ? 'Décrivez votre expérience avec nos soins…'
                      : 'Tell the community about your experience…'
                  }
                  className="mt-1 w-full border border-[var(--color-border-strong)] bg-[var(--color-ivory)] p-3 text-sm"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'Importer des photos (jusqu’à 3 images)' : 'Upload photos (up to 3 images)'}
                </span>
                <label
                  htmlFor="testi-images-input"
                  className="mt-1.5 flex cursor-pointer items-center justify-center gap-2 border border-dashed border-[var(--color-border-strong)] bg-[var(--color-ivory)]/70 px-4 py-3 text-xs font-medium text-[var(--color-forest)] transition-colors hover:bg-[var(--color-beige)]/35"
                >
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {lang === 'fr'
                      ? `Choisir des images (${testiImages.length}/3)`
                      : `Select images (${testiImages.length}/3)`}
                  </span>
                  <input
                    id="testi-images-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    disabled={testiImages.length >= 3}
                    onChange={(e) => void handleSelectTestimonialFiles(e)}
                    className="sr-only"
                  />
                </label>

                {testiImages.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {testiImages.map((img) => (
                      <div key={img.id} className="relative aspect-square border border-[var(--color-border)]">
                        <img src={img.dataUrl} alt={img.name} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setTestiImages((prev) => prev.filter((item) => item.id !== img.id))}
                          aria-label={lang === 'fr' ? 'Retirer l’image' : 'Remove image'}
                          className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-start gap-2 text-xs text-[var(--color-ink-muted)]">
                <input
                  type="checkbox"
                  checked={testiConsent}
                  onChange={(e) => setTestiConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--color-forest)]"
                />
                <span>
                  {lang === 'fr'
                    ? 'J’accepte que mon témoignage et les photos importées soient visibles par tous les visiteurs du site.'
                    : 'I agree that my testimonial and uploaded photos will be publicly visible on this website.'}
                </span>
              </label>

              <motion.button
                type="submit"
                whileHover={reduceMotion ? undefined : { scale: 1.01 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                disabled={testiLoading || !testiConsent}
                className="h-11 w-full rounded-full bg-[var(--color-forest)] px-6 text-xs font-medium text-white transition-colors hover:bg-[var(--color-forest-hover)] disabled:opacity-50"
              >
                {testiLoading
                  ? lang === 'fr'
                    ? 'Publication…'
                    : 'Publishing…'
                  : lang === 'fr'
                  ? 'Publier mon témoignage'
                  : 'Publish testimonial'}
              </motion.button>
            </form>
          </div>
        </div>
      </MotionSection>

      {/* 7. FAQ QUESTIONS FRÉQUENTES */}
      {faqs.length > 0 && (
        <MotionSection className="border-y border-[var(--color-border)] bg-[var(--color-white)] py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-champagne)]">
                  {lang === 'fr' ? 'Informations pratiques' : 'Helpful answers'}
                </p>
                <h2 className="font-editorial mt-1 text-3xl font-medium text-[var(--color-forest)]">
                  {lang === 'fr' ? 'Questions fréquentes (FAQ)' : 'Frequently Asked Questions'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/faq')}
                className="self-start text-xs font-medium text-[var(--color-forest)] hover:underline sm:self-auto"
              >
                {str.common.viewAll} →
              </button>
            </div>

            <div className="mt-6 divide-y divide-[var(--color-border)]">
              {faqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id} className="py-4">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="flex w-full items-center justify-between gap-4 text-left"
                    >
                      <span className="font-editorial text-xl font-medium text-[var(--color-forest)]">
                        {tLoc(faq.question, lang)}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-[var(--color-forest)] transition-transform duration-300 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                          transition={{ duration: 0.28, ease: EDITORIAL_EASE }}
                          className="overflow-hidden"
                        >
                          <p className="pt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                            {tLoc(faq.answer, lang)}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </MotionSection>
      )}

      {/* 7B. PRISE DE RENDEZ-VOUS EN BOUTIQUE OU WHATSAPP */}
      <AppointmentBookingSection />

      {/* 8. REJOINDRE NOTRE COMMUNAUTÉ (WHATSAPP) */}
      <MotionSection id="communaute" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border border-[var(--color-forest)]/25 bg-[#0f241b] p-7 text-white sm:p-10 lg:p-14">
          <div className="grid items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#d9c39b]">
                <Users className="h-4 w-4" aria-hidden="true" />
                <span>{lang === 'fr' ? 'Communauté Emaüs Skin Care' : 'Emaüs Skin Care Community'}</span>
              </div>
              <h2 className="font-editorial mt-3 text-3xl font-medium text-white sm:text-4xl">
                {lang === 'fr' ? 'Rejoindre notre communauté' : 'Join our community'}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#dbe5df]">
                {lang === 'fr'
                  ? 'Échangez directement avec notre communauté sur WhatsApp, suivez l’arrivée des nouvelles formulations validées et partagez vos routines.'
                  : 'Connect directly with our community on WhatsApp, follow validated formulation launches, and share your daily routines.'}
              </p>
            </div>

            <div className="lg:col-span-6">
              <form onSubmit={handleCommunityJoin} className="space-y-3">
                <label htmlFor="community-phone" className="block text-xs font-medium text-[#d9c39b]">
                  {lang === 'fr' ? 'Votre numéro WhatsApp / Téléphone' : 'Your WhatsApp / Phone number'}
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="community-phone"
                    type="tel"
                    required
                    value={communityPhone}
                    onChange={(e) => setCommunityPhone(e.target.value)}
                    placeholder="+237 6XX XXX XXX"
                    className="h-12 flex-1 border border-white/25 bg-white/10 px-4 text-sm text-white placeholder:text-white/55 focus:border-[#d9c39b] focus:outline-none"
                  />
                  <motion.button
                    type="submit"
                    whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                    disabled={communityLoading}
                    className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-7 text-xs font-semibold text-[#11271e] transition-colors hover:bg-[#f4f1ea] disabled:opacity-50 whitespace-nowrap"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {communityLoading
                        ? lang === 'fr'
                          ? 'Connexion…'
                          : 'Joining…'
                        : lang === 'fr'
                        ? 'Rejoindre'
                        : 'Join now'}
                    </span>
                  </motion.button>
                </div>
                {communityJoined && (
                  <p className="pt-1 text-xs text-[#d9c39b]">
                    {lang === 'fr' ? 'Redirection en cours. Si rien ne s’ouvre, ' : 'Redirecting now. If not redirected, '}
                    <a
                      href={WHATSAPP_COMMUNITY_URL}
                      className="underline hover:text-white"
                    >
                      {lang === 'fr' ? 'cliquez ici pour accéder au groupe WhatsApp' : 'click here to open the WhatsApp group'}
                    </a>
                    .
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </MotionSection>

      {/* 9. JOURNAL & NEWSLETTER */}
      <MotionSection className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between border-b border-[var(--color-border)] pb-4">
          <h2 className="font-editorial text-3xl font-medium text-[var(--color-forest)]">{str.sections.journal}</h2>
          <button
            type="button"
            onClick={() => navigate('/journal')}
            className="text-sm font-medium text-[var(--color-forest)] hover:underline"
          >
            {str.common.viewAll} →
          </button>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {articles.slice(0, 3).map((art, idx) => (
            <MotionItem key={art.id} index={idx}>
              <article className="flex h-full flex-col border border-[var(--color-border)] bg-[var(--color-white)] p-6 transition-shadow duration-300 hover:shadow-[0_12px_28px_rgba(32,61,50,0.06)]">
                <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
                  <span>{tLoc(art.category, lang)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{art.readMinutes} min</span>
                </div>
                <h3 className="font-editorial mt-3 text-2xl font-medium leading-snug text-[var(--color-forest)]">
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
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                  {tLoc(art.excerpt, lang)}
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/journal/${art.slug}`)}
                  className="mt-5 self-start text-xs font-medium text-[var(--color-forest)] hover:underline"
                >
                  {lang === 'fr' ? 'Lire l’article →' : 'Read article →'}
                </button>
              </article>
            </MotionItem>
          ))}
        </div>

        <MotionItem
          hoverLift={false}
          className="mt-16 border border-[var(--color-border)] bg-[var(--color-beige)]/45 p-6 sm:p-10"
        >
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
                {str.sections.newsletterTitle}
              </h2>
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{str.sections.newsletterDesc}</p>
            </div>
            <div className="lg:col-span-6">
              {newsletterDone ? (
                <p className="border border-[var(--color-forest)]/25 bg-[var(--color-white)] p-4 text-sm text-[var(--color-forest)]">
                  {lang === 'fr'
                    ? 'Merci. Votre inscription aux actualités Emaüs Skin Care est enregistrée.'
                    : 'Thank you. Your Emaüs Skin Care newsletter preference has been saved.'}
                </p>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <label htmlFor="newsletter-email" className="sr-only">
                      Adresse e-mail
                    </label>
                    <input
                      id="newsletter-email"
                      type="email"
                      required
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="vous@exemple.com"
                      className="h-11 flex-1 border border-[var(--color-border-strong)] bg-[var(--color-white)] px-4 text-sm text-[var(--color-ink)]"
                    />
                    <button
                      type="submit"
                      disabled={newsletterLoading || !newsletterConsent}
                      className="h-11 rounded-full bg-[var(--color-forest)] px-6 text-xs font-medium text-white transition-colors hover:bg-[var(--color-forest-hover)] disabled:opacity-50"
                    >
                      {newsletterLoading ? '…' : str.sections.newsletterCta}
                    </button>
                  </div>
                  <label className="flex items-start gap-2.5 text-xs text-[var(--color-ink-muted)]">
                    <input
                      type="checkbox"
                      checked={newsletterConsent}
                      onChange={(e) => setNewsletterConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[var(--color-forest)]"
                    />
                    <span>{str.sections.newsletterConsent}</span>
                  </label>
                </form>
              )}
            </div>
          </div>
        </MotionItem>
      </MotionSection>

      {/* Lightbox photo témoignage */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={lightboxImage.alt}
          >
            <div className="relative max-h-[88vh] max-w-3xl" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                aria-label={str.common.close}
                className="absolute -top-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--color-forest)] shadow-lg"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={lightboxImage.url}
                alt={lightboxImage.alt}
                className="max-h-[85vh] w-auto border border-white/20 object-contain"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
