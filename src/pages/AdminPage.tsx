import React, { useCallback, useEffect, useState } from 'react';
import { CloudDownload, CloudUpload, Download, LogOut, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BotanicalVisual } from '../components/BotanicalVisual';
import { formatXaf } from '../i18n/translations';
import type {
  Appointment,
  AuditLogEntry,
  CommunityMember,
  ContactMessage,
  DeliveryZone,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  PromoCode,
  ResellerInquiry,
  ReturnOrClaim,
  Review,
  SiteSettings,
  StockLot,
  StockMovement,
  Testimonial,
  UserRole,
} from '../types/ecommerce';

interface AdminOverview {
  kpis: {
    totalOrders: number;
    completedSalesCount: number;
    completedRevenueXaf: number;
    collectedPaymentsXaf: number;
    cancelledCount: number;
    lowStockCount: number;
    lotsWatchCount: number;
  };
  lowStockVariants: Array<{
    productName: string;
    sku: string;
    format: string;
    availableQty: number;
    threshold: number;
  }>;
  lotsToWatch: StockLot[];
  products: Product[];
  lots: StockLot[];
  movements: StockMovement[];
  auditLogs: AuditLogEntry[];
  orders: Order[];
  reviews: Review[];
  testimonials?: Testimonial[];
  communityMembers?: CommunityMember[];
  appointments?: Appointment[];
  returnsClaims: ReturnOrClaim[];
  resellerInquiries: ResellerInquiry[];
  contacts: ContactMessage[];
  promoCodes: PromoCode[];
  deliveryZones: DeliveryZone[];
  settings: SiteSettings;
  users: Array<{ id: string; email: string; fullName: string; phone?: string; role: UserRole; createdAt: string }>;
  exportLogs: Array<{ id: string; actorEmail: string; filterSummary: string; rowCount: number; at: string }>;
}

interface SanityStatus {
  configured: boolean;
  projectId: string | null;
  dataset: string | null;
  orgId: string | null;
  lastSyncAt?: string | null;
  lastSyncDirection?: string | null;
  lastSyncedCount?: number | null;
  documentCount?: number | null;
}

type AdminTab = 'dashboard' | 'catalog' | 'stock' | 'orders' | 'community' | 'cms' | 'reports';

export function AdminPage() {
  const { lang, bootstrap, navigate, refreshBootstrap, showToast } = useStore();
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [data, setData] = useState<AdminOverview | null>(null);
  const [sanityStatus, setSanityStatus] = useState<SanityStatus | null>(null);
  const [sanityBusy, setSanityBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Product editor state (full fields)
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [editNameFr, setEditNameFr] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editSummaryFr, setEditSummaryFr] = useState('');
  const [editDescriptionFr, setEditDescriptionFr] = useState('');
  const [editBenefitsFr, setEditBenefitsFr] = useState('');
  const [editTextureFr, setEditTextureFr] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editB2bPrice, setEditB2bPrice] = useState('');
  const [editFormat, setEditFormat] = useState('');
  const [editInci, setEditInci] = useState('');
  const [editDirections, setEditDirections] = useState('');
  const [editPrecautions, setEditPrecautions] = useState('');
  const [editStatus, setEditStatus] = useState<Product['status']>('draft_pending_validation');

  // New draft product
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newSku, setNewSku] = useState('');

  // New lot reception
  const [lotVariantId, setLotVariantId] = useState('');
  const [lotCode, setLotCode] = useState('');
  const [lotQty, setLotQty] = useState('10');
  const [lotExpiry, setLotExpiry] = useState('');
  const [impactAlert, setImpactAlert] = useState<string>('');

  // Stock adjustment
  const [adjLotId, setAdjLotId] = useState('');
  const [adjType, setAdjType] = useState<'breakage' | 'loss' | 'quarantine' | 'correction'>('breakage');
  const [adjDelta, setAdjDelta] = useState('-1');
  const [adjReason, setAdjReason] = useState('');

  // General site & CMS settings
  const [brandName, setBrandName] = useState('');
  const [legalEntityName, setLegalEntityName] = useState('');
  const [heroLabelFr, setHeroLabelFr] = useState('');
  const [heroTitleFr, setHeroTitleFr] = useState('');
  const [heroSubtitleFr, setHeroSubtitleFr] = useState('');
  const [signatureFr, setSignatureFr] = useState('');
  const [headquartersAddress, setHeadquartersAddress] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [waPhone, setWaPhone] = useState('');
  const [waConfirmed, setWaConfirmed] = useState(true);
  const [codEnabled, setCodEnabled] = useState(true);

  // CSV report filters
  const [repFrom, setRepFrom] = useState('');
  const [repTo, setRepTo] = useState('');
  const [repStatus, setRepStatus] = useState('');

  const user = bootstrap?.session.user;
  const isStaff = user && !['customer', 'b2b_partner'].includes(user.role);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewRes, sanityRes] = await Promise.all([
        fetch('/api/admin/overview', { credentials: 'include' }),
        fetch('/api/admin/sanity/status', { credentials: 'include' }),
      ]);
      if (!overviewRes.ok) {
        const body = (await overviewRes.json()) as { error?: string };
        throw new Error(body.error || 'Accès refusé.');
      }
      const overview = (await overviewRes.json()) as AdminOverview;
      setData(overview);

      if (sanityRes.ok) {
        const sData = (await sanityRes.json()) as SanityStatus;
        setSanityStatus(sData);
      }

      setBrandName(overview.settings.brandName);
      setLegalEntityName(overview.settings.legalEntityName);
      setHeroLabelFr(overview.settings.heroLabel.fr);
      setHeroTitleFr(overview.settings.heroTitle.fr);
      setHeroSubtitleFr(overview.settings.heroSubtitle.fr);
      setSignatureFr(overview.settings.signature.fr);
      setHeadquartersAddress(overview.settings.headquartersAddress);
      setPrimaryPhone(overview.settings.primaryPhone);
      setSecondaryPhone(overview.settings.secondaryPhone);
      setWaPhone(overview.settings.whatsappPhone);
      setWaConfirmed(overview.settings.whatsappConfirmed);
      setCodEnabled(overview.settings.cashOnDeliveryEnabled);

      if (!lotVariantId && overview.products[0]?.variants[0]) {
        setLotVariantId(overview.products[0].variants[0].id);
      }
      if (!adjLotId && overview.lots[0]) {
        setAdjLotId(overview.lots[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement admin.');
    } finally {
      setLoading(false);
    }
  }, [lotVariantId, adjLotId]);

  useEffect(() => {
    if (isStaff) {
      void loadOverview();
    } else {
      setLoading(false);
    }
  }, [isStaff, loadOverview]);

  if (!user || !isStaff) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-editorial text-4xl font-medium text-[var(--color-forest)]">Administration</h1>
        <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
          {bootstrap?.session.needsAdminBootstrap
            ? 'Aucun compte administrateur n’est encore configuré. Initialisez votre identifiant et mot de passe propriétaire.'
            : 'Connectez-vous avec votre compte propriétaire ou gestionnaire pour accéder au tableau de bord.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/connexion?next=/admin')}
          className="mt-6 rounded-full bg-[var(--color-forest)] px-7 py-3 text-xs font-medium text-white"
        >
          {bootstrap?.session.needsAdminBootstrap ? 'Initialiser le compte Admin' : 'Se connecter'}
        </button>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-[var(--color-ink-muted)]">
        Chargement de l’espace d’administration…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error || 'Erreur'}</p>
      </div>
    );
  }

  const openEditor = (prod: Product) => {
    setEditingProd(prod);
    setEditNameFr(prod.name.fr);
    setEditNameEn(prod.name.en);
    setEditSummaryFr(prod.shortSummary.fr);
    setEditDescriptionFr(prod.description.fr);
    setEditBenefitsFr(prod.cosmeticBenefits.fr);
    setEditTextureFr(prod.texture.fr);
    setEditImageUrl(prod.imageUrl || '');
    setEditSku(prod.variants[0]?.sku || '');
    setEditPrice(prod.variants[0]?.priceXaf !== null ? String(prod.variants[0]?.priceXaf) : '');
    setEditB2bPrice(prod.variants[0]?.b2bPriceXaf ? String(prod.variants[0].b2bPriceXaf) : '');
    setEditFormat(prod.variants[0]?.format || 'À confirmer');
    setEditInci(prod.inci);
    setEditDirections(prod.directions.fr);
    setEditPrecautions(prod.precautions.fr);
    setEditStatus(prod.status);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProd) return;
    const v0 = editingProd.variants[0];
    const res = await fetch(`/api/admin/products/${editingProd.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: { fr: editNameFr, en: editNameEn || editNameFr },
        shortSummary: { ...editingProd.shortSummary, fr: editSummaryFr },
        description: { ...editingProd.description, fr: editDescriptionFr },
        cosmeticBenefits: { ...editingProd.cosmeticBenefits, fr: editBenefitsFr },
        texture: { ...editingProd.texture, fr: editTextureFr },
        imageUrl: editImageUrl,
        status: editStatus,
        inci: editInci,
        directions: { ...editingProd.directions, fr: editDirections },
        precautions: { ...editingProd.precautions, fr: editPrecautions },
        variantUpdates: v0
          ? [
              {
                id: v0.id,
                sku: editSku,
                format: editFormat,
                priceXaf: editPrice ? Number(editPrice) : null,
                b2bPriceXaf: editB2bPrice ? Number(editB2bPrice) : null,
              },
            ]
          : [],
      }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(body.error || 'Validation refusée.', 'error');
      return;
    }
    setEditingProd(null);
    showToast('Fiche produit mise à jour.', 'success');
    await loadOverview();
    await refreshBootstrap();
  };

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: { fr: newName, en: newName },
        slug: newSlug,
        sku: newSku,
      }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(body.error || 'Erreur création', 'error');
      return;
    }
    setNewName('');
    setNewSlug('');
    setNewSku('');
    showToast('Brouillon produit créé.', 'success');
    await loadOverview();
  };

  const handleReceiveLot = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/lots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        variantId: lotVariantId,
        lotCode,
        quantity: Number(lotQty),
        expiryDate: lotExpiry || undefined,
      }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(body.error || 'Erreur réception lot', 'error');
      return;
    }
    setLotCode('');
    showToast('Lot réceptionné en stock.', 'success');
    await loadOverview();
    await refreshBootstrap();
  };

  const handleLotStatus = async (lotId: string, status: 'active' | 'blocked' | 'quarantined') => {
    const res = await fetch(`/api/admin/lots/${lotId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status, reason: `Action admin (${status})` }),
    });
    const body = (await res.json()) as {
      error?: string;
      impactedOrders?: Array<{ reference: string; customerName: string }>;
    };
    if (!res.ok) {
      showToast(body.error || 'Erreur statut lot', 'error');
      return;
    }
    if (body.impactedOrders && body.impactedOrders.length > 0) {
      setImpactAlert(
        `Commandes associées à ce lot : ${body.impactedOrders
          .map((o) => `${o.reference} (${o.customerName})`)
          .join(', ')}`
      );
    } else {
      setImpactAlert('Aucune commande expédiée n’est rattachée à ce lot.');
    }
    showToast(`Statut du lot mis à jour (${status}).`, 'info');
    await loadOverview();
    await refreshBootstrap();
  };

  const handleStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/stock/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        lotId: adjLotId,
        type: adjType,
        qtyDelta: Number(adjDelta),
        reason: adjReason,
      }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(body.error || 'Erreur ajustement', 'error');
      return;
    }
    setAdjReason('');
    showToast('Mouvement de stock journalisé.', 'success');
    await loadOverview();
    await refreshBootstrap();
  };

  const handleOrderUpdate = async (orderId: string, status?: OrderStatus, paymentStatus?: PaymentStatus) => {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status, paymentStatus }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(body.error || 'Erreur mise à jour commande', 'error');
      return;
    }
    showToast('Commande mise à jour.', 'success');
    await loadOverview();
    await refreshBootstrap();
  };

  const handleSaveCms = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        brandName,
        legalEntityName,
        heroLabel: { ...data.settings.heroLabel, fr: heroLabelFr },
        heroTitle: { ...data.settings.heroTitle, fr: heroTitleFr },
        heroSubtitle: { ...data.settings.heroSubtitle, fr: heroSubtitleFr },
        signature: { ...data.settings.signature, fr: signatureFr },
        headquartersAddress,
        primaryPhone,
        secondaryPhone,
        whatsappPhone: waPhone,
        whatsappConfirmed: waConfirmed,
        cashOnDeliveryEnabled: codEnabled,
        demoModeBannerEnabled: false,
      }),
    });
    if (res.ok) {
      showToast('Informations générales enregistrées.', 'success');
      await loadOverview();
      await refreshBootstrap();
    } else {
      showToast('Erreur lors de l’enregistrement.', 'error');
    }
  };

  const handleSanitySync = async () => {
    setSanityBusy(true);
    try {
      const res = await fetch('/api/admin/sanity/sync', { method: 'POST', credentials: 'include' });
      const body = (await res.json()) as {
        ok?: boolean;
        pulledUpdates?: number;
        pushedTotal?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(body.error || 'Échec de synchronisation.');
      showToast(
        `Synchronisation complète : ${body.pushedTotal ?? 0} document(s) aligné(s) avec Sanity.`,
        'success'
      );
      await loadOverview();
      await refreshBootstrap();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur Sanity', 'error');
    } finally {
      setSanityBusy(false);
    }
  };

  const handleSanityPush = async () => {
    setSanityBusy(true);
    try {
      const res = await fetch('/api/admin/sanity/push', { method: 'POST', credentials: 'include' });
      const body = (await res.json()) as { ok?: boolean; count?: number; error?: string };
      if (!res.ok) throw new Error(body.error || 'Échec de synchronisation.');
      showToast(`${body.count} document(s) synchronisé(s) vers Sanity CMS.`, 'success');
      await loadOverview();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur Sanity', 'error');
    } finally {
      setSanityBusy(false);
    }
  };

  const handleSanityPull = async () => {
    setSanityBusy(true);
    try {
      const res = await fetch('/api/admin/sanity/pull', { method: 'POST', credentials: 'include' });
      const body = (await res.json()) as { ok?: boolean; importedCount?: number; error?: string };
      if (!res.ok) throw new Error(body.error || 'Échec d’importation.');
      showToast(`${body.importedCount} document(s) importé(s) depuis Sanity CMS.`, 'success');
      await loadOverview();
      await refreshBootstrap();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur Sanity', 'error');
    } finally {
      setSanityBusy(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    await refreshBootstrap();
    navigate('/');
  };

  const tabs: Array<{ id: AdminTab; label: string }> = [
    { id: 'dashboard', label: 'Tableau de bord' },
    { id: 'catalog', label: 'Produits & Descriptions' },
    { id: 'stock', label: 'Stocks & Lots' },
    { id: 'orders', label: 'Commandes & Retours' },
    { id: 'community', label: 'Avis, RDV & Revendeurs' },
    { id: 'cms', label: 'Informations & Sanity CMS' },
    { id: 'reports', label: 'Rapports CSV' },
  ];

  const csvUrl = `/api/admin/reports/orders.csv?from=${encodeURIComponent(repFrom)}&to=${encodeURIComponent(
    repTo
  )}&status=${encodeURIComponent(repStatus)}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-champagne)]">
            Back-office sécurisé · {user.fullName} ({user.role})
          </p>
          <h1 className="font-editorial mt-1 text-3xl font-medium text-[var(--color-forest)]">
            Administration Emaüs Skin Care
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadOverview()}
            className="rounded-full border border-[var(--color-border-strong)] bg-[var(--color-white)] px-4 py-2 text-xs font-medium text-[var(--color-forest)]"
          >
            Actualiser
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-white)] px-4 py-2 text-xs font-medium text-[var(--color-ink)]"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`h-9 whitespace-nowrap rounded-full px-4 text-xs font-medium transition-colors ${
              tab === t.id
                ? 'bg-[var(--color-forest)] text-white'
                : 'border border-[var(--color-border-strong)] bg-[var(--color-white)] text-[var(--color-ink)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. DASHBOARD */}
      {tab === 'dashboard' && (
        <div className="mt-8 space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-5">
              <p className="text-xs text-[var(--color-ink-muted)]">Commandes enregistrées</p>
              <p className="mt-2 tabular-nums text-3xl font-semibold text-[var(--color-forest)]">
                {data.kpis.totalOrders}
              </p>
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                Dont {data.kpis.cancelledCount} annulée(s)
              </p>
            </div>
            <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-5">
              <p className="text-xs text-[var(--color-ink-muted)]">Ventes terminées (CA brut)</p>
              <p className="mt-2 tabular-nums text-2xl font-semibold text-[var(--color-forest)]">
                {formatXaf(data.kpis.completedRevenueXaf, lang)}
              </p>
              <p className="mt-1 tabular-nums text-xs text-[var(--color-ink-muted)]">
                {data.kpis.completedSalesCount} commande(s) livrée(s)
              </p>
            </div>
            <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-5">
              <p className="text-xs text-[var(--color-ink-muted)]">Encaissements confirmés</p>
              <p className="mt-2 tabular-nums text-2xl font-semibold text-[var(--color-forest)]">
                {formatXaf(data.kpis.collectedPaymentsXaf, lang)}
              </p>
            </div>
            <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-5">
              <p className="text-xs text-[var(--color-ink-muted)]">Alertes stock & lots</p>
              <p className="mt-2 tabular-nums text-3xl font-semibold text-[var(--color-champagne)]">
                {data.kpis.lowStockCount + data.kpis.lotsWatchCount}
              </p>
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                {data.kpis.lowStockCount} seuil(s) bas · {data.kpis.lotsWatchCount} lot(s) à surveiller
              </p>
            </div>
          </div>

          {data.lowStockVariants.length > 0 && (
            <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-6">
              <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
                Variantes sous seuil d’alerte
              </h2>
              <ul className="mt-4 divide-y divide-[var(--color-border)] text-sm">
                {data.lowStockVariants.map((ls) => (
                  <li key={ls.sku} className="flex justify-between py-2.5">
                    <span>
                      {ls.productName} ({ls.format}) — <span className="font-mono text-xs">{ls.sku}</span>
                    </span>
                    <span className="tabular-nums font-semibold text-amber-800">
                      {ls.availableQty} disp. (seuil {ls.threshold})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 2. CATALOGUE & FULL PRODUCT EDITOR */}
      {tab === 'catalog' && (
        <div className="mt-8 space-y-8">
          <form
            onSubmit={handleCreateDraft}
            className="grid gap-3 border border-[var(--color-border)] bg-[var(--color-white)] p-5 sm:grid-cols-4"
          >
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom du nouveau produit"
              className="h-10 border border-[var(--color-border-strong)] px-3 text-xs"
            />
            <input
              type="text"
              required
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="slug-url"
              className="h-10 border border-[var(--color-border-strong)] px-3 text-xs"
            />
            <input
              type="text"
              required
              value={newSku}
              onChange={(e) => setNewSku(e.target.value)}
              placeholder="SKU initial"
              className="h-10 border border-[var(--color-border-strong)] px-3 text-xs"
            />
            <button type="submit" className="h-10 rounded-full bg-[var(--color-forest)] text-xs font-medium text-white">
              + Ajouter un produit
            </button>
          </form>

          {editingProd && (
            <form
              onSubmit={handleSaveProduct}
              className="space-y-4 border border-[var(--color-forest)] bg-[var(--color-white)] p-6 text-sm"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <h2 className="font-editorial text-2xl text-[var(--color-forest)]">
                  Modifier le produit : {editingProd.name.fr}
                </h2>
                <button type="button" onClick={() => setEditingProd(null)} className="text-xs underline">
                  Fermer
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-[var(--color-ink-muted)]">Nom du produit (FR)</label>
                  <input
                    type="text"
                    required
                    value={editNameFr}
                    onChange={(e) => setEditNameFr(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-ink-muted)]">Nom du produit (EN)</label>
                  <input
                    type="text"
                    value={editNameEn}
                    onChange={(e) => setEditNameEn(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-12 items-end">
                <div className="sm:col-span-2">
                  <div className="h-20 w-20 overflow-hidden border border-[var(--color-border)]">
                    <BotanicalVisual
                      theme={editingProd.visualTheme}
                      title={editNameFr || editingProd.name.fr}
                      imageUrl={editImageUrl}
                      compact
                      className="h-full w-full"
                    />
                  </div>
                </div>
                <div className="sm:col-span-5">
                  <label className="block text-xs text-[var(--color-ink-muted)]">URL / Chemin photo produit (vide = logo Emaüs)</label>
                  <input
                    type="text"
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    placeholder="https://... ou /src/assets/images/..."
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-xs"
                  />
                </div>
                <div className="sm:col-span-5">
                  <label className="block text-xs text-[var(--color-ink-muted)]">Texture</label>
                  <input
                    type="text"
                    value={editTextureFr}
                    onChange={(e) => setEditTextureFr(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[var(--color-ink-muted)]">Accroche courte (FR)</label>
                <input
                  type="text"
                  value={editSummaryFr}
                  onChange={(e) => setEditSummaryFr(e.target.value)}
                  className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-xs"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-[var(--color-ink-muted)]">Description détaillée (FR)</label>
                  <textarea
                    rows={3}
                    value={editDescriptionFr}
                    onChange={(e) => setEditDescriptionFr(e.target.value)}
                    className="mt-1 w-full border border-[var(--color-border-strong)] p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-ink-muted)]">Bénéfices cosmétiques (FR)</label>
                  <textarea
                    rows={3}
                    value={editBenefitsFr}
                    onChange={(e) => setEditBenefitsFr(e.target.value)}
                    className="mt-1 w-full border border-[var(--color-border-strong)] p-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-5">
                <div>
                  <label className="block text-xs text-[var(--color-ink-muted)]">SKU</label>
                  <input
                    type="text"
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-ink-muted)]">Format</label>
                  <input
                    type="text"
                    value={editFormat}
                    onChange={(e) => setEditFormat(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-ink-muted)]">Prix public XAF</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-ink-muted)]">Prix B2B XAF</label>
                  <input
                    type="number"
                    value={editB2bPrice}
                    onChange={(e) => setEditB2bPrice(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-ink-muted)]">Statut publication</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Product['status'])}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-xs"
                  >
                    <option value="draft_pending_validation">Brouillon (non vendable)</option>
                    <option value="published">Validé & Publié</option>
                    <option value="archived">Archivé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[var(--color-ink-muted)]">Liste INCI complète</label>
                <textarea
                  rows={2}
                  value={editInci}
                  onChange={(e) => setEditInci(e.target.value)}
                  className="mt-1 w-full border border-[var(--color-border-strong)] p-2 text-xs"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-[var(--color-ink-muted)]">Mode d’emploi</label>
                  <textarea
                    rows={2}
                    value={editDirections}
                    onChange={(e) => setEditDirections(e.target.value)}
                    className="mt-1 w-full border border-[var(--color-border-strong)] p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-ink-muted)]">Précautions d’emploi</label>
                  <textarea
                    rows={2}
                    value={editPrecautions}
                    onChange={(e) => setEditPrecautions(e.target.value)}
                    className="mt-1 w-full border border-[var(--color-border-strong)] p-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="submit" className="h-10 rounded-full bg-[var(--color-forest)] px-6 text-xs font-medium text-white">
                  Enregistrer les modifications
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProd(null)}
                  className="h-10 rounded-full border border-[var(--color-border-strong)] px-5 text-xs font-medium"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto border border-[var(--color-border)] bg-[var(--color-white)]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-ivory)] text-[var(--color-ink-muted)]">
                <tr>
                  <th className="p-3">Produit</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">Catégorie</th>
                  <th className="p-3">Tarif XAF</th>
                  <th className="p-3">Stock disp.</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {data.products.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 font-medium text-[var(--color-ink)]">
                      {p.name.fr}
                      <div className="font-mono text-[11px] text-[var(--color-ink-muted)]">{p.variants[0]?.sku}</div>
                    </td>
                    <td className="p-3">
                      {p.status === 'published'
                        ? 'Publié & validé'
                        : p.status === 'draft_pending_validation'
                        ? 'Brouillon à valider'
                        : 'Archivé'}
                    </td>
                    <td className="p-3">{p.category}</td>
                    <td className="p-3 tabular-nums">{formatXaf(p.variants[0]?.priceXaf, lang)}</td>
                    <td className="p-3 tabular-nums">{p.variants.reduce((s, v) => s + v.availableQty, 0)}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => openEditor(p)}
                        className="rounded-full border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--color-forest)] hover:bg-[var(--color-ivory)]"
                      >
                        Modifier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. STOCKS & LOTS */}
      {tab === 'stock' && (
        <div className="mt-8 space-y-8">
          {impactAlert && (
            <div className="border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">{impactAlert}</div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={handleReceiveLot} className="space-y-3 border border-[var(--color-border)] bg-[var(--color-white)] p-5 text-xs">
              <h2 className="font-editorial text-xl font-medium text-[var(--color-forest)]">Réception d’un nouveau lot</h2>
              <select
                value={lotVariantId}
                onChange={(e) => setLotVariantId(e.target.value)}
                className="h-10 w-full border border-[var(--color-border-strong)] px-3"
              >
                {data.products.flatMap((p) =>
                  p.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {p.name.fr} — {v.sku} ({v.format})
                    </option>
                  ))
                )}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  value={lotCode}
                  onChange={(e) => setLotCode(e.target.value)}
                  placeholder="LOT-2026-XX"
                  className="h-10 border border-[var(--color-border-strong)] px-3 uppercase"
                />
                <input
                  type="number"
                  required
                  min={1}
                  value={lotQty}
                  onChange={(e) => setLotQty(e.target.value)}
                  placeholder="Qté"
                  className="h-10 border border-[var(--color-border-strong)] px-3 tabular-nums"
                />
                <input
                  type="date"
                  value={lotExpiry}
                  onChange={(e) => setLotExpiry(e.target.value)}
                  className="h-10 border border-[var(--color-border-strong)] px-2"
                />
              </div>
              <button type="submit" className="h-10 rounded-full bg-[var(--color-forest)] px-5 font-medium text-white">
                Enregistrer la réception
              </button>
            </form>

            <form onSubmit={handleStockAdjust} className="space-y-3 border border-[var(--color-border)] bg-[var(--color-white)] p-5 text-xs">
              <h2 className="font-editorial text-xl font-medium text-[var(--color-forest)]">
                Mouvement manuel (casse, perte, quarantaine)
              </h2>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={adjLotId}
                  onChange={(e) => setAdjLotId(e.target.value)}
                  className="h-10 border border-[var(--color-border-strong)] px-2"
                >
                  {data.lots.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.lotCode} ({l.sku} · {l.remainingQty})
                    </option>
                  ))}
                </select>
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value as typeof adjType)}
                  className="h-10 border border-[var(--color-border-strong)] px-2"
                >
                  <option value="breakage">Casse</option>
                  <option value="loss">Perte</option>
                  <option value="quarantine">Quarantaine</option>
                  <option value="correction">Correction inventaire</option>
                </select>
                <input
                  type="number"
                  required
                  value={adjDelta}
                  onChange={(e) => setAdjDelta(e.target.value)}
                  className="h-10 border border-[var(--color-border-strong)] px-3 tabular-nums"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="Motif obligatoire (journalisé)"
                  className="h-10 flex-1 border border-[var(--color-border-strong)] px-3"
                />
                <button type="submit" className="h-10 rounded-full border border-[var(--color-border-strong)] px-5 font-medium text-[var(--color-forest)]">
                  Appliquer
                </button>
              </div>
            </form>
          </div>

          <div className="overflow-x-auto border border-[var(--color-border)] bg-[var(--color-white)]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-ivory)] text-[var(--color-ink-muted)]">
                <tr>
                  <th className="p-3">Lot</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Péremption</th>
                  <th className="p-3">Restant</th>
                  <th className="p-3">Quarantaine</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">Contrôle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {data.lots.map((l) => (
                  <tr key={l.id}>
                    <td className="p-3 font-mono font-semibold">{l.lotCode}</td>
                    <td className="p-3 font-mono">{l.sku}</td>
                    <td className="p-3 tabular-nums">{l.expiryDate || 'N/A'}</td>
                    <td className="p-3 tabular-nums">{l.remainingQty}</td>
                    <td className="p-3 tabular-nums">{l.quarantinedQty}</td>
                    <td className="p-3">{l.status}</td>
                    <td className="space-x-2 p-3">
                      {l.status === 'active' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleLotStatus(l.id, 'blocked')}
                            className="text-amber-800 underline"
                          >
                            Bloquer
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleLotStatus(l.id, 'quarantined')}
                            className="text-red-700 underline"
                          >
                            Quarantaine
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleLotStatus(l.id, 'active')}
                          className="text-[var(--color-forest)] underline"
                        >
                          Réactiver
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-5">
            <h3 className="font-editorial text-xl font-medium text-[var(--color-forest)]">
              Journal des mouvements & Audit
            </h3>
            <ul className="mt-3 max-h-60 divide-y divide-[var(--color-border)] overflow-y-auto text-xs">
              {data.movements.slice(0, 25).map((m) => (
                <li key={m.id} className="flex justify-between gap-4 py-2">
                  <span>
                    <strong>{m.type}</strong> · {m.sku} {m.lotCode ? `(${m.lotCode})` : ''} : {m.reason}
                  </span>
                  <span className="tabular-nums text-[var(--color-ink-muted)]">
                    {m.qtyDelta > 0 ? `+${m.qtyDelta}` : m.qtyDelta} · {m.createdAt.slice(0, 16).replace('T', ' ')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 4. ORDERS & RETURNS */}
      {tab === 'orders' && (
        <div className="mt-8 space-y-8">
          <div className="overflow-x-auto border border-[var(--color-border)] bg-[var(--color-white)]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-ivory)] text-[var(--color-ink-muted)]">
                <tr>
                  <th className="p-3">Référence</th>
                  <th className="p-3">Client & Ville</th>
                  <th className="p-3">Total estimé</th>
                  <th className="p-3">Statut commande</th>
                  <th className="p-3">Paiement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {data.orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-[var(--color-ink-muted)]">
                      Aucune commande enregistrée pour le moment.
                    </td>
                  </tr>
                ) : (
                  data.orders.map((o) => (
                    <tr key={o.id}>
                      <td className="p-3 font-mono font-semibold text-[var(--color-forest)]">{o.reference}</td>
                      <td className="p-3">
                        {o.customerName} ({o.customerPhone})
                        <div className="text-[var(--color-ink-muted)]">
                          {o.city} · {o.receptionMode}
                        </div>
                      </td>
                      <td className="p-3 tabular-nums">
                        {o.estimatedTotalXaf !== null ? formatXaf(o.estimatedTotalXaf, lang) : `${o.subtotalXaf} + livr.`}
                      </td>
                      <td className="p-3">
                        <select
                          value={o.status}
                          onChange={(e) => void handleOrderUpdate(o.id, e.target.value as OrderStatus, undefined)}
                          className="h-8 border border-[var(--color-border-strong)] px-2"
                        >
                          <option value="registered">Enregistrée</option>
                          <option value="whatsapp_prepared">WhatsApp préparé</option>
                          <option value="accepted">Acceptée</option>
                          <option value="preparing">En préparation (déstocker FIFO)</option>
                          <option value="shipped">Expédiée</option>
                          <option value="delivered">Livrée</option>
                          <option value="cancelled">Annulée (libérer stock)</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          value={o.paymentStatus}
                          onChange={(e) => void handleOrderUpdate(o.id, undefined, e.target.value as PaymentStatus)}
                          className="h-8 border border-[var(--color-border-strong)] px-2"
                        >
                          <option value="unpaid">Non payé</option>
                          <option value="pending_online">En attente</option>
                          <option value="paid">Encaissé</option>
                          <option value="failed">Échoué</option>
                          <option value="refunded">Remboursé</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-6">
            <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
              Retours & Réclamations (quarantaine obligatoire si ouvert/suspect)
            </h2>
            {data.returnsClaims.length === 0 ? (
              <p className="mt-3 text-xs text-[var(--color-ink-muted)]">Aucun dossier ouvert.</p>
            ) : (
              <ul className="mt-4 divide-y divide-[var(--color-border)] text-xs">
                {data.returnsClaims.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                    <div>
                      <p className="font-semibold">
                        {r.orderReference} ({r.kind}) — {r.status}
                      </p>
                      <p className="text-[var(--color-ink-muted)]">{r.reason}</p>
                    </div>
                    {r.status === 'open' && (
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/returns/${r.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                              status: 'resolved_quarantined',
                              resolutionNote: 'Placé en quarantaine après réception',
                            }),
                          });
                          await loadOverview();
                        }}
                        className="rounded-full border border-[var(--color-border-strong)] px-4 py-1.5 font-medium text-[var(--color-forest)]"
                      >
                        Mettre en quarantaine
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 5. COMMUNITY: TESTIMONIALS, REVIEWS, RESELLERS, USERS */}
      {tab === 'community' && (
        <div className="mt-8 space-y-8">
          <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-6">
            <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
              Témoignages visiteurs & Images importées
            </h2>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              Supprimez individuellement toute photo importée par un visiteur ou retirez un témoignage complet.
            </p>
            {!data.testimonials || data.testimonials.length === 0 ? (
              <p className="mt-4 text-xs text-[var(--color-ink-muted)]">Aucun témoignage visiteur enregistré.</p>
            ) : (
              <ul className="mt-4 divide-y divide-[var(--color-border)] text-xs">
                {data.testimonials.map((t) => (
                  <li key={t.id} className="space-y-3 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[var(--color-forest)]">
                          {t.authorName}
                          {t.city ? ` (${t.city})` : ''} · {t.rating}/5 · {t.createdAt.slice(0, 10)}
                        </p>
                        {t.productName && (
                          <p className="mt-0.5 text-[var(--color-champagne)]">{t.productName}</p>
                        )}
                        <p className="mt-1 text-[var(--color-ink)]">{t.comment}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await fetch(`/api/admin/testimonials/${t.id}`, {
                            method: 'DELETE',
                            credentials: 'include',
                          });
                          if (res.ok) {
                            showToast('Témoignage supprimé.', 'success');
                            await loadOverview();
                            await refreshBootstrap();
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1.5 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Supprimer le témoignage</span>
                      </button>
                    </div>

                    {t.images.length > 0 && (
                      <div className="flex flex-wrap gap-3 pt-1">
                        {t.images.map((img) => (
                          <div
                            key={img.id}
                            className="flex flex-col items-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-ivory)] p-2"
                          >
                            <img
                              src={img.url}
                              alt={img.alt || t.authorName}
                              className="h-24 w-24 object-cover"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await fetch(
                                  `/api/admin/testimonials/${t.id}/images/${img.id}`,
                                  {
                                    method: 'DELETE',
                                    credentials: 'include',
                                  }
                                );
                                if (res.ok) {
                                  showToast('Image supprimée.', 'success');
                                  await loadOverview();
                                  await refreshBootstrap();
                                }
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 hover:underline"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Supprimer l’image</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-6">
            <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
              Membres inscrits à la communauté WhatsApp
            </h2>
            {!data.communityMembers || data.communityMembers.length === 0 ? (
              <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
                Aucun numéro enregistré via la section communauté pour l’instant.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-[var(--color-border)] text-xs">
                {data.communityMembers.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2.5">
                    <span className="font-mono font-medium text-[var(--color-forest)]">{m.phone}</span>
                    <span className="tabular-nums text-[var(--color-ink-muted)]">
                      {m.joinedAt.slice(0, 16).replace('T', ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-6">
            <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
              Demandes de rendez-vous (RDV WhatsApp)
            </h2>
            {!data.appointments || data.appointments.length === 0 ? (
              <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
                Aucune demande de rendez-vous enregistrée pour l’instant.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-[var(--color-border)] text-xs">
                {data.appointments.map((apt) => (
                  <li key={apt.id} className="flex flex-wrap items-start justify-between gap-4 py-3">
                    <div>
                      <p className="font-semibold text-[var(--color-forest)]">
                        {apt.fullName} · <span className="font-mono">{apt.phone}</span>
                      </p>
                      <p className="mt-0.5 text-[var(--color-ink)]">
                        {apt.serviceType} ·{' '}
                        {apt.channel === 'boutique' ? 'En boutique Douala' : 'Appel / Visio WhatsApp'}
                      </p>
                      {apt.notes && <p className="mt-0.5 text-[var(--color-ink-muted)]">Note : {apt.notes}</p>}
                    </div>
                    <div className="text-right tabular-nums text-[var(--color-ink-muted)]">
                      <p className="font-medium text-[var(--color-forest)]">
                        {apt.preferredDate} ({apt.preferredTime})
                      </p>
                      <p className="mt-0.5 text-[11px]">Créé le {apt.createdAt.slice(0, 10)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-6">
            <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">Modération des avis</h2>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              Règle publique : un avis négatif ne doit jamais être rejeté uniquement en raison de sa note.
            </p>
            {data.reviews.length === 0 ? (
              <p className="mt-4 text-xs text-[var(--color-ink-muted)]">Aucun avis en attente.</p>
            ) : (
              <ul className="mt-4 divide-y divide-[var(--color-border)] text-xs">
                {data.reviews.map((rev) => (
                  <li key={rev.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                    <div>
                      <p className="font-medium">
                        {rev.authorName} · {rev.productSlug} · {rev.rating}/5 ({rev.status})
                      </p>
                      <p className="text-[var(--color-ink-muted)]">{rev.comment}</p>
                    </div>
                    {rev.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/admin/reviews/${rev.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ status: 'approved' }),
                            });
                            await loadOverview();
                            await refreshBootstrap();
                          }}
                          className="rounded-full bg-[var(--color-forest)] px-3 py-1.5 text-white"
                        >
                          Approuver
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/admin/reviews/${rev.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({
                                status: 'rejected',
                                moderationReason: 'Contenu hors-sujet ou contraire à la charte',
                              }),
                            });
                            await loadOverview();
                          }}
                          className="rounded-full border border-red-300 px-3 py-1.5 text-red-700"
                        >
                          Rejeter
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-6">
            <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">Demandes revendeurs B2B</h2>
            {data.resellerInquiries.length === 0 ? (
              <p className="mt-3 text-xs text-[var(--color-ink-muted)]">Aucune demande B2B reçue.</p>
            ) : (
              <ul className="mt-4 divide-y divide-[var(--color-border)] text-xs">
                {data.resellerInquiries.map((inq) => (
                  <li key={inq.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                    <div>
                      <p className="font-semibold">
                        {inq.companyName} ({inq.city}) — {inq.fullName} · {inq.status}
                      </p>
                      <p className="text-[var(--color-ink-muted)]">
                        {inq.email} · {inq.phone} · Volume : {inq.estimatedMonthlyVolume}
                      </p>
                    </div>
                    {inq.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/admin/resellers/${inq.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ status: 'approved' }),
                            });
                            await loadOverview();
                          }}
                          className="rounded-full bg-[var(--color-forest)] px-3 py-1.5 text-white"
                        >
                          Valider B2B
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/admin/resellers/${inq.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ status: 'declined' }),
                            });
                            await loadOverview();
                          }}
                          className="rounded-full border border-[var(--color-border-strong)] px-3 py-1.5"
                        >
                          Refuser
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {user.role === 'admin' && (
            <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-6">
              <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">Gestion des rôles (RBAC)</h2>
              <ul className="mt-4 divide-y divide-[var(--color-border)] text-xs">
                {data.users.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-4 py-2.5">
                    <span>
                      <strong>{u.fullName}</strong> ({u.email})
                    </span>
                    <select
                      value={u.role}
                      onChange={async (e) => {
                        await fetch(`/api/admin/users/${u.id}/role`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ role: e.target.value }),
                        });
                        await loadOverview();
                      }}
                      className="h-8 border border-[var(--color-border-strong)] px-2"
                    >
                      <option value="customer">customer</option>
                      <option value="b2b_partner">b2b_partner</option>
                      <option value="editor">editor</option>
                      <option value="customer_service">customer_service</option>
                      <option value="preparer">preparer</option>
                      <option value="stock_manager">stock_manager</option>
                      <option value="catalog_manager">catalog_manager</option>
                      <option value="admin">admin</option>
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 6. GENERAL SETTINGS & SANITY CMS */}
      {tab === 'cms' && (
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <form
            onSubmit={handleSaveCms}
            className="space-y-4 border border-[var(--color-border)] bg-[var(--color-white)] p-6 text-sm lg:col-span-7"
          >
            <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
              Informations générales du site
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-[var(--color-ink-muted)]">Nom de la marque</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-ink-muted)]">Entité légale / Laboratoire</label>
                <input
                  type="text"
                  value={legalEntityName}
                  onChange={(e) => setLegalEntityName(e.target.value)}
                  className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[var(--color-ink-muted)]">Sur-titre Hero (FR)</label>
              <input
                type="text"
                value={heroLabelFr}
                onChange={(e) => setHeroLabelFr(e.target.value)}
                className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--color-ink-muted)]">Titre principal Hero (FR)</label>
              <input
                type="text"
                value={heroTitleFr}
                onChange={(e) => setHeroTitleFr(e.target.value)}
                className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--color-ink-muted)]">Sous-titre Hero (FR)</label>
              <textarea
                rows={2}
                value={heroSubtitleFr}
                onChange={(e) => setHeroSubtitleFr(e.target.value)}
                className="mt-1 w-full border border-[var(--color-border-strong)] p-2.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--color-ink-muted)]">Signature de marque (FR)</label>
              <input
                type="text"
                value={signatureFr}
                onChange={(e) => setSignatureFr(e.target.value)}
                className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--color-ink-muted)]">Adresse principale</label>
              <input
                type="text"
                value={headquartersAddress}
                onChange={(e) => setHeadquartersAddress(e.target.value)}
                className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-xs"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs text-[var(--color-ink-muted)]">Téléphone 1</label>
                <input
                  type="text"
                  value={primaryPhone}
                  onChange={(e) => setPrimaryPhone(e.target.value)}
                  className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-ink-muted)]">Téléphone 2</label>
                <input
                  type="text"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-ink-muted)]">Numéro WhatsApp</label>
                <input
                  type="text"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3 text-xs"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={waConfirmed}
                onChange={(e) => setWaConfirmed(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-forest)]"
              />
              <span>Activer le règlement assisté par WhatsApp lors de la commande</span>
            </label>

            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={codEnabled}
                onChange={(e) => setCodEnabled(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-forest)]"
              />
              <span>Activer le paiement à la livraison / au retrait</span>
            </label>

            <button type="submit" className="h-11 rounded-full bg-[var(--color-forest)] px-6 text-xs font-medium text-white">
              Enregistrer les informations
            </button>
          </form>

          <div className="space-y-4 border border-[var(--color-border)] bg-[var(--color-white)] p-6 text-sm lg:col-span-5">
            <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">Connexion Sanity CMS</h2>
            <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
              Synchronisez vos produits, routines, ingrédients, articles et paramètres généraux avec votre espace Sanity.
            </p>
            <div className="space-y-1.5 border border-[var(--color-border)] bg-[var(--color-ivory)] p-4 text-xs">
              <p>
                <strong>Statut :</strong>{' '}
                {sanityStatus?.configured ? 'Connecté (synchronisation automatique active)' : 'Non configuré'}
              </p>
              <p className="font-mono">
                <strong>Project ID :</strong> {sanityStatus?.projectId || '—'}
              </p>
              <p className="font-mono">
                <strong>Dataset :</strong> {sanityStatus?.dataset || '—'}
              </p>
              <p className="font-mono">
                <strong>Org ID :</strong> {sanityStatus?.orgId || '—'}
              </p>
              <p className="tabular-nums">
                <strong>Documents dans Sanity :</strong>{' '}
                {sanityStatus?.documentCount !== undefined && sanityStatus?.documentCount !== null
                  ? sanityStatus.documentCount
                  : '—'}
              </p>
              {sanityStatus?.lastSyncAt && (
                <p className="tabular-nums text-[var(--color-ink-muted)]">
                  <strong>Dernière synchro :</strong> {sanityStatus.lastSyncAt.slice(0, 19).replace('T', ' ')} (
                  {sanityStatus.lastSyncDirection})
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                disabled={!sanityStatus?.configured || sanityBusy}
                onClick={() => void handleSanitySync()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-forest)] px-5 text-xs font-medium text-white disabled:opacity-50"
              >
                <CloudUpload className="h-4 w-4" />
                <span>{sanityBusy ? 'Synchronisation…' : 'Synchroniser maintenant (Site ↔ Sanity)'}</span>
              </button>
              <button
                type="button"
                disabled={!sanityStatus?.configured || sanityBusy}
                onClick={() => void handleSanityPush()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--color-border-strong)] px-5 text-xs font-medium text-[var(--color-forest)] disabled:opacity-50"
              >
                <CloudUpload className="h-3.5 w-3.5" />
                <span>{sanityBusy ? 'Envoi…' : 'Forcer l’envoi vers Sanity (Push)'}</span>
              </button>
              <button
                type="button"
                disabled={!sanityStatus?.configured || sanityBusy}
                onClick={() => void handleSanityPull()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--color-border-strong)] px-5 text-xs font-medium text-[var(--color-forest)] disabled:opacity-50"
              >
                <CloudDownload className="h-3.5 w-3.5" />
                <span>{sanityBusy ? 'Importation…' : 'Importer depuis Sanity (Pull)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. CSV REPORTS */}
      {tab === 'reports' && (
        <div className="mt-8 space-y-6">
          <div className="space-y-4 border border-[var(--color-border)] bg-[var(--color-white)] p-6">
            <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
              Export des commandes (CSV réel et audité)
            </h2>
            <div className="grid gap-3 text-xs sm:grid-cols-4">
              <input
                type="date"
                value={repFrom}
                onChange={(e) => setRepFrom(e.target.value)}
                className="h-10 border border-[var(--color-border-strong)] px-3"
              />
              <input
                type="date"
                value={repTo}
                onChange={(e) => setRepTo(e.target.value)}
                className="h-10 border border-[var(--color-border-strong)] px-3"
              />
              <select
                value={repStatus}
                onChange={(e) => setRepStatus(e.target.value)}
                className="h-10 border border-[var(--color-border-strong)] px-3"
              >
                <option value="">Tous les statuts</option>
                <option value="registered">Enregistrée</option>
                <option value="delivered">Livrée</option>
                <option value="cancelled">Annulée</option>
              </select>
              <a
                href={csvUrl}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--color-forest)] px-5 font-medium text-white"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Télécharger CSV</span>
              </a>
            </div>
          </div>

          <div className="border border-[var(--color-border)] bg-[var(--color-white)] p-6">
            <h3 className="font-editorial text-xl font-medium text-[var(--color-forest)]">Journal des exports</h3>
            <ul className="mt-3 divide-y divide-[var(--color-border)] text-xs">
              {data.exportLogs.length === 0 ? (
                <li className="py-3 text-[var(--color-ink-muted)]">Aucun export réalisé.</li>
              ) : (
                data.exportLogs.map((exp) => (
                  <li key={exp.id} className="flex justify-between py-2">
                    <span>
                      {exp.actorEmail} — {exp.filterSummary} ({exp.rowCount} lignes)
                    </span>
                    <span className="tabular-nums text-[var(--color-ink-muted)]">{exp.at.slice(0, 16).replace('T', ' ')}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
