import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Calendar, Clock, MapPin, MessageCircle, PhoneCall } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { MotionSection } from './MotionSection';

export function AppointmentBookingSection({ standalone = false }: { standalone?: boolean }) {
  const { lang, bootstrap, showToast } = useStore();
  const reduceMotion = useReducedMotion();

  const [fullName, setFullName] = useState(bootstrap?.session.user?.fullName || '');
  const [phone, setPhone] = useState(bootstrap?.session.user?.phone || '');
  const [serviceType, setServiceType] = useState(
    lang === 'fr' ? 'Conseil routine personnalisée' : 'Personalized routine consultation'
  );
  const [channel, setChannel] = useState<'boutique' | 'whatsapp_call'>('boutique');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('10:00 – 12:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!bootstrap) return null;

  const { settings } = bootstrap;
  const waPhoneDisplay = settings.whatsappPhone || '+237 697 705 069';
  const waDigits = waPhoneDisplay.replace(/\D/g, '') || '237697705069';

  const serviceOptions =
    lang === 'fr'
      ? [
          'Conseil routine personnalisée',
          'Consultation soin visage / corps',
          'Retrait commande à Douala Makepe',
          'Demande partenariat revendeur B2B',
        ]
      : [
          'Personalized routine consultation',
          'Face & body skincare consultation',
          'Order pickup in Douala Makepe',
          'B2B reseller partnership inquiry',
        ];

  const timeSlots = ['09:00 – 10:30', '10:30 – 12:30', '14:00 – 16:00', '16:00 – 17:30'];

  const buildLocalWhatsappUrl = () => {
    const channelLabel =
      channel === 'boutique'
        ? `En boutique (${settings.headquartersAddress})`
        : 'Appel / Visio WhatsApp';
    const message = [
      'Bonjour Emaüs Skin Care, je souhaite prendre rendez-vous :',
      `• Nom complet : ${fullName.trim()}`,
      `• Téléphone / WhatsApp : ${phone.trim()}`,
      `• Objet du RDV : ${serviceType}`,
      `• Modalité : ${channelLabel}`,
      `• Date souhaitée : ${preferredDate}`,
      `• Créneau horaire : ${preferredTime}`,
      notes.trim() ? `• Précisions / Besoins : ${notes.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    return `https://wa.me/${waDigits}?text=${encodeURIComponent(message)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || !phone.trim() || !preferredDate) {
      setErrorMsg(
        lang === 'fr'
          ? 'Veuillez renseigner votre nom, numéro et date souhaitée.'
          : 'Please enter your name, phone number, and preferred date.'
      );
      return;
    }

    setSubmitting(true);
    let finalWhatsappUrl = buildLocalWhatsappUrl();

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          serviceType,
          channel,
          preferredDate,
          preferredTime,
          notes: notes.trim(),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { whatsappUrl?: string };
        if (data.whatsappUrl) {
          finalWhatsappUrl = data.whatsappUrl;
        }
      }
    } catch {
      // Fallback safely to the formatted wa.me URL built client-side
    } finally {
      setSubmitting(false);
    }

    setSubmittedUrl(finalWhatsappUrl);
    showToast(
      lang === 'fr'
        ? 'Rendez-vous préparé — redirection vers WhatsApp Emaüs…'
        : 'Appointment ready — redirecting to Emaüs WhatsApp…',
      'success'
    );

    window.setTimeout(() => {
      window.location.assign(finalWhatsappUrl);
    }, 350);
  };

  const todayMin = new Date().toISOString().split('T')[0];

  const innerContent = (
    <div
      className={`border border-[var(--color-border)] bg-[var(--color-white)] ${
        standalone ? 'p-6 sm:p-10' : 'p-6 sm:p-10 lg:p-12'
      }`}
    >
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-champagne)]">
            {lang === 'fr' ? 'Conseil personnalisé & Boutique' : 'Personal Consultation & Boutique'}
          </p>
          <h2 className="font-editorial text-3xl font-medium text-[var(--color-forest)] sm:text-4xl">
            {lang === 'fr' ? 'Prendre rendez-vous' : 'Book an appointment'}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
            {lang === 'fr'
              ? 'Réservez un créneau en boutique à Douala ou par appel WhatsApp pour bénéficier d’un accompagnement cosmétique adapté à votre peau. Toutes les informations saisies sont transmises directement sur notre ligne WhatsApp officielle.'
              : 'Schedule an in-boutique session in Douala or a WhatsApp call for tailored skincare guidance. Your booking details are sent directly to our official WhatsApp concierge.'}
          </p>

          <div className="space-y-3 border-t border-[var(--color-border)] pt-5 text-xs text-[var(--color-ink)]">
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-forest)]" aria-hidden="true" />
              <span>{settings.headquartersAddress}</span>
            </div>
            <div className="flex items-center gap-2.5 tabular-nums font-medium text-[var(--color-forest)]">
              <PhoneCall className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>WhatsApp officiel : {waPhoneDisplay}</span>
            </div>
            <div className="flex items-center gap-2.5 text-[var(--color-ink-muted)]">
              <Clock className="h-4 w-4 shrink-0 text-[var(--color-forest)]" aria-hidden="true" />
              <span>{lang === 'fr' ? 'Lundi – Samedi · 09h00 à 18h00' : 'Monday – Saturday · 9:00 AM to 6:00 PM'}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <p role="alert" className="border border-red-300 bg-red-50 px-4 py-2.5 text-xs text-red-800">
                {errorMsg}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rdv-fullname" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'Nom complet *' : 'Full name *'}
                </label>
                <input
                  id="rdv-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nadine Mbarga"
                  className="mt-1 h-11 w-full border border-[var(--color-border-strong)] bg-[var(--color-ivory)] px-3.5 text-sm text-[var(--color-ink)]"
                />
              </div>

              <div>
                <label htmlFor="rdv-phone" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'Téléphone / WhatsApp *' : 'Phone / WhatsApp *'}
                </label>
                <input
                  id="rdv-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+237 6XX XXX XXX"
                  className="mt-1 h-11 w-full border border-[var(--color-border-strong)] bg-[var(--color-ivory)] px-3.5 text-sm text-[var(--color-ink)] tabular-nums"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rdv-service" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'Motif du rendez-vous *' : 'Appointment reason *'}
                </label>
                <select
                  id="rdv-service"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="mt-1 h-11 w-full border border-[var(--color-border-strong)] bg-[var(--color-ivory)] px-3 text-sm text-[var(--color-ink)]"
                >
                  {serviceOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'Format souhaité *' : 'Preferred format *'}
                </span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChannel('boutique')}
                    className={`h-11 border px-3 text-xs font-medium transition-colors ${
                      channel === 'boutique'
                        ? 'border-[var(--color-forest)] bg-[var(--color-forest)] text-white'
                        : 'border-[var(--color-border-strong)] bg-[var(--color-ivory)] text-[var(--color-ink)] hover:border-[var(--color-forest)]'
                    }`}
                  >
                    {lang === 'fr' ? 'En boutique' : 'In boutique'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('whatsapp_call')}
                    className={`h-11 border px-3 text-xs font-medium transition-colors ${
                      channel === 'whatsapp_call'
                        ? 'border-[var(--color-forest)] bg-[var(--color-forest)] text-white'
                        : 'border-[var(--color-border-strong)] bg-[var(--color-ivory)] text-[var(--color-ink)] hover:border-[var(--color-forest)]'
                    }`}
                  >
                    {lang === 'fr' ? 'Appel WhatsApp' : 'WhatsApp Call'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rdv-date" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'Date souhaitée *' : 'Preferred date *'}
                </label>
                <div className="relative mt-1">
                  <input
                    id="rdv-date"
                    type="date"
                    required
                    min={todayMin}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="h-11 w-full border border-[var(--color-border-strong)] bg-[var(--color-ivory)] px-3.5 text-sm text-[var(--color-ink)] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="rdv-time" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'Créneau horaire *' : 'Time slot *'}
                </label>
                <select
                  id="rdv-time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="mt-1 h-11 w-full border border-[var(--color-border-strong)] bg-[var(--color-ivory)] px-3 text-sm text-[var(--color-ink)] tabular-nums"
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="rdv-notes" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                {lang === 'fr' ? 'Vos besoins ou précisions (optionnel)' : 'Your skincare goals or notes (optional)'}
              </label>
              <textarea
                id="rdv-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  lang === 'fr'
                    ? 'Ex : type de peau, produits souhaités, questions…'
                    : 'E.g., skin preferences, products of interest, questions…'
                }
                className="mt-1 w-full border border-[var(--color-border-strong)] bg-[var(--color-ivory)] p-3 text-sm text-[var(--color-ink)]"
              />
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
              <motion.button
                type="submit"
                whileHover={reduceMotion ? undefined : { scale: 1.015 }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                disabled={submitting}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-forest)] px-7 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-forest-hover)] disabled:opacity-50"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>
                  {submitting
                    ? lang === 'fr'
                      ? 'Préparation…'
                      : 'Preparing…'
                    : lang === 'fr'
                    ? 'Prendre RDV sur WhatsApp'
                    : 'Confirm Appointment on WhatsApp'}
                </span>
              </motion.button>

              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
                <Calendar className="h-3.5 w-3.5 text-[var(--color-champagne)]" aria-hidden="true" />
                <span>
                  {lang === 'fr' ? `Redirection vers ${waPhoneDisplay}` : `Redirects to ${waPhoneDisplay}`}
                </span>
              </span>
            </div>

            {submittedUrl && (
              <div className="border border-[var(--color-forest)]/30 bg-[var(--color-ivory)] p-4 text-xs text-[var(--color-forest)]">
                <p className="font-medium">
                  {lang === 'fr'
                    ? 'Votre demande de rendez-vous a été générée avec tout le contenu du formulaire.'
                    : 'Your appointment summary has been prepared with all form details.'}
                </p>
                <a
                  href={submittedUrl}
                  className="mt-2 inline-flex items-center gap-1.5 font-semibold underline underline-offset-4"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {lang === 'fr'
                      ? 'Ouvrir WhatsApp si la redirection ne démarre pas automatiquement'
                      : 'Open WhatsApp if automatic redirect does not start'}
                  </span>
                </a>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );

  if (standalone) {
    return innerContent;
  }

  return (
    <MotionSection id="rendez-vous" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {innerContent}
    </MotionSection>
  );
}
