import type { StoreSchema } from './store.ts';
import type {
  FaqItem,
  Ingredient,
  JournalArticle,
  Outlet,
  Product,
  Routine,
  SiteSettings,
} from '../src/types/ecommerce.ts';

const API_VERSION = '2024-01-01';

let lastSyncAt: string | null = null;
let lastSyncDirection: 'push' | 'pull' | 'bidirectional' | null = null;
let lastSyncError: string | null = null;
let lastSyncedCount: number | null = null;

function getSanityConfig() {
  const projectId = process.env.SANITY_PROJECT_ID || '';
  const dataset = process.env.SANITY_DATASET || 'production';
  const token = process.env.SANITY_API_TOKEN || '';
  const orgId = process.env.SANITY_ORG_ID || '';
  return { projectId, dataset, token, orgId };
}

export function isSanityConfigured(): boolean {
  const cfg = getSanityConfig();
  return Boolean(cfg.projectId && cfg.dataset && cfg.token && cfg.token !== 'MY_SANITY_API_TOKEN');
}

export function getSanityPublicInfo() {
  const cfg = getSanityConfig();
  return {
    configured: isSanityConfigured(),
    projectId: cfg.projectId || null,
    dataset: cfg.dataset || null,
    orgId: cfg.orgId || null,
    lastSyncAt,
    lastSyncDirection,
    lastSyncError,
    lastSyncedCount,
  };
}

export async function querySanityDocuments<T = Record<string, unknown>>(groq: string): Promise<T[]> {
  const { projectId, dataset, token } = getSanityConfig();
  if (!projectId || !token) {
    throw new Error('Configuration Sanity manquante.');
  }
  const url = `https://${projectId}.api.sanity.io/v${API_VERSION}/data/query/${dataset}?query=${encodeURIComponent(groq)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Sanity query error (${res.status}): ${txt}`);
  }
  const data = (await res.json()) as { result?: T[] };
  return data.result || [];
}

export async function countSanityDocuments(): Promise<number> {
  if (!isSanityConfigured()) return 0;
  const { projectId, dataset, token } = getSanityConfig();
  const groq = 'count(*[_id match "emaus-*"])';
  const url = `https://${projectId}.api.sanity.io/v${API_VERSION}/data/query/${dataset}?query=${encodeURIComponent(groq)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return 0;
  const data = (await res.json()) as { result?: number };
  return typeof data.result === 'number' ? data.result : 0;
}

export async function pushStoreToSanity(store: StoreSchema): Promise<{ transactionId?: string; count: number }> {
  const { projectId, dataset, token } = getSanityConfig();
  if (!isSanityConfigured()) {
    throw new Error('Sanity n’est pas configuré côté serveur.');
  }

  const mutations: Array<{ createOrReplace: Record<string, unknown> }> = [];

  mutations.push({
    createOrReplace: {
      _id: 'emaus-site-settings',
      _type: 'siteSettings',
      ...store.settings,
    },
  });

  for (const product of store.products) {
    mutations.push({
      createOrReplace: {
        _id: `emaus-${product.id}`,
        _type: 'product',
        ...product,
      },
    });
  }

  for (const routine of store.routines) {
    mutations.push({
      createOrReplace: {
        _id: `emaus-${routine.id}`,
        _type: 'routine',
        ...routine,
      },
    });
  }

  for (const ingredient of store.ingredients) {
    mutations.push({
      createOrReplace: {
        _id: `emaus-${ingredient.id}`,
        _type: 'ingredient',
        ...ingredient,
      },
    });
  }

  for (const article of store.articles) {
    mutations.push({
      createOrReplace: {
        _id: `emaus-${article.id}`,
        _type: 'article',
        ...article,
      },
    });
  }

  for (const outlet of store.outlets) {
    mutations.push({
      createOrReplace: {
        _id: `emaus-${outlet.id}`,
        _type: 'outlet',
        ...outlet,
      },
    });
  }

  for (const faq of store.faqs) {
    mutations.push({
      createOrReplace: {
        _id: `emaus-${faq.id}`,
        _type: 'faq',
        ...faq,
      },
    });
  }

  const url = `https://${projectId}.api.sanity.io/v${API_VERSION}/data/mutate/${dataset}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ mutations }),
  });

  if (!res.ok) {
    const txt = await res.text();
    lastSyncError = `Sanity mutate error (${res.status}): ${txt}`;
    throw new Error(lastSyncError);
  }

  const body = (await res.json()) as { transactionId?: string };
  lastSyncAt = new Date().toISOString();
  lastSyncDirection = 'push';
  lastSyncError = null;
  lastSyncedCount = mutations.length;
  return { transactionId: body.transactionId, count: mutations.length };
}

function applySanityProductToExisting(existing: Product, incoming: Product) {
  existing.name = incoming.name || existing.name;
  existing.range = incoming.range || existing.range;
  existing.category = incoming.category || existing.category;
  existing.applicationZone = incoming.applicationZone || existing.applicationZone;
  existing.texture = incoming.texture || existing.texture;
  existing.skinTypes = Array.isArray(incoming.skinTypes) ? incoming.skinTypes : existing.skinTypes;
  existing.cosmeticNeeds = Array.isArray(incoming.cosmeticNeeds) ? incoming.cosmeticNeeds : existing.cosmeticNeeds;
  existing.shortSummary = incoming.shortSummary || existing.shortSummary;
  existing.description = incoming.description || existing.description;
  existing.cosmeticBenefits = incoming.cosmeticBenefits || existing.cosmeticBenefits;
  existing.directions = incoming.directions || existing.directions;
  existing.inci = incoming.inci !== undefined ? incoming.inci : existing.inci;
  existing.precautions = incoming.precautions || existing.precautions;
  existing.storage = incoming.storage || existing.storage;
  if (incoming.paoMonths !== undefined) existing.paoMonths = incoming.paoMonths;
  existing.audienceRestrictions = incoming.audienceRestrictions || existing.audienceRestrictions;
  if (incoming.validationNotes !== undefined) existing.validationNotes = incoming.validationNotes;
  if (incoming.visualTheme) existing.visualTheme = incoming.visualTheme;
  if (incoming.imageUrl && incoming.imageUrl.trim()) {
    existing.imageUrl = incoming.imageUrl.trim();
  }
  if (incoming.status) existing.status = incoming.status;
  if (typeof incoming.safetyValidated === 'boolean') existing.safetyValidated = incoming.safetyValidated;

  if (Array.isArray(incoming.variants)) {
    for (const iv of incoming.variants) {
      const ev = existing.variants.find((v) => v.id === iv.id || v.sku === iv.sku);
      if (ev) {
        if (iv.sku) ev.sku = iv.sku;
        if (iv.format) ev.format = iv.format;
        if (iv.label) ev.label = iv.label;
        if (iv.priceXaf !== undefined) ev.priceXaf = iv.priceXaf;
        if (iv.b2bPriceXaf !== undefined) ev.b2bPriceXaf = iv.b2bPriceXaf;
        if (typeof iv.sellable === 'boolean') ev.sellable = iv.sellable;
        if (typeof iv.lowStockThreshold === 'number') ev.lowStockThreshold = iv.lowStockThreshold;
      } else {
        existing.variants.push(iv);
      }
    }
  }
  if (incoming.updatedAt) existing.updatedAt = incoming.updatedAt;
}

function isLegacyDemoSanityDoc(doc: Record<string, unknown>): boolean {
  const idStr = String(doc.id || doc._id || '');
  return (
    Boolean((doc as { isDemoItem?: boolean }).isDemoItem) ||
    idStr.includes('prod-demo-') ||
    idStr.includes('rout-demo-')
  );
}

export async function pullSanityIntoStore(store: StoreSchema): Promise<{ importedCount: number }> {
  if (!isSanityConfigured()) {
    throw new Error('Sanity n’est pas configuré côté serveur.');
  }

  const docs = await querySanityDocuments<Record<string, unknown>>(
    `*[_type in ["siteSettings", "product", "routine", "ingredient", "article", "outlet", "faq"]]`
  );

  let importedCount = 0;

  for (const doc of docs) {
    if (isLegacyDemoSanityDoc(doc)) continue;
    const docType = doc._type;
    if (docType === 'siteSettings' && doc.brandName) {
      const s = doc as unknown as Partial<SiteSettings>;
      store.settings = {
        ...store.settings,
        brandName: s.brandName || store.settings.brandName,
        legalEntityName: s.legalEntityName || store.settings.legalEntityName,
        signature: s.signature || store.settings.signature,
        heroLabel: s.heroLabel || store.settings.heroLabel,
        heroTitle: s.heroTitle || store.settings.heroTitle,
        heroSubtitle: s.heroSubtitle || store.settings.heroSubtitle,
        primaryPhone: s.primaryPhone || store.settings.primaryPhone,
        secondaryPhone: s.secondaryPhone || store.settings.secondaryPhone,
        whatsappPhone: s.whatsappPhone || store.settings.whatsappPhone,
        whatsappConfirmed:
          typeof s.whatsappConfirmed === 'boolean' ? s.whatsappConfirmed : store.settings.whatsappConfirmed,
        headquartersAddress: s.headquartersAddress || store.settings.headquartersAddress,
        cashOnDeliveryEnabled:
          typeof s.cashOnDeliveryEnabled === 'boolean' ? s.cashOnDeliveryEnabled : store.settings.cashOnDeliveryEnabled,
      };
      importedCount++;
    } else if (docType === 'product' && doc.slug && doc.name) {
      const incoming = doc as unknown as Product;
      const existing = store.products.find((p) => p.id === incoming.id || p.slug === incoming.slug);
      if (existing) {
        applySanityProductToExisting(existing, incoming);
      } else {
        store.products.push(incoming);
      }
      importedCount++;
    } else if (docType === 'routine' && doc.slug) {
      const incoming = doc as unknown as Routine;
      const idx = store.routines.findIndex((r) => r.slug === incoming.slug);
      if (idx >= 0) store.routines[idx] = { ...store.routines[idx], ...incoming };
      else store.routines.push(incoming);
      importedCount++;
    } else if (docType === 'ingredient' && doc.slug) {
      const incoming = doc as unknown as Ingredient;
      const idx = store.ingredients.findIndex((i) => i.slug === incoming.slug);
      if (idx >= 0) store.ingredients[idx] = { ...store.ingredients[idx], ...incoming };
      else store.ingredients.push(incoming);
      importedCount++;
    } else if (docType === 'article' && doc.slug) {
      const incoming = doc as unknown as JournalArticle;
      const idx = store.articles.findIndex((a) => a.slug === incoming.slug);
      if (idx >= 0) store.articles[idx] = { ...store.articles[idx], ...incoming };
      else store.articles.push(incoming);
      importedCount++;
    } else if (docType === 'outlet' && doc.id) {
      const incoming = doc as unknown as Outlet;
      const idx = store.outlets.findIndex((o) => o.id === incoming.id);
      if (idx >= 0) store.outlets[idx] = { ...store.outlets[idx], ...incoming };
      else store.outlets.push(incoming);
      importedCount++;
    } else if (docType === 'faq' && doc.id) {
      const incoming = doc as unknown as FaqItem;
      const idx = store.faqs.findIndex((f) => f.id === incoming.id);
      if (idx >= 0) store.faqs[idx] = { ...store.faqs[idx], ...incoming };
      else store.faqs.push(incoming);
      importedCount++;
    }
  }

  lastSyncAt = new Date().toISOString();
  lastSyncDirection = 'pull';
  lastSyncError = null;
  lastSyncedCount = importedCount;

  return { importedCount };
}

/**
 * Smart bidirectional synchronization:
 * - Cleans up any legacy demo records from Sanity if present
 * - Pulls any records from Sanity that have a newer `_updatedAt` than local `updatedAt` (or don't exist locally yet)
 * - Pushes all local documents to Sanity so both store & Sanity CMS stay 100% aligned.
 */
export async function syncBidirectionalWithSanity(store: StoreSchema): Promise<{
  pulledUpdates: number;
  pushedTotal: number;
  transactionId?: string;
}> {
  if (!isSanityConfigured()) {
    throw new Error('Sanity n’est pas configuré côté serveur.');
  }

  const docs = await querySanityDocuments<Record<string, unknown> & { _id: string; _type: string; _updatedAt?: string }>(
    `*[_type in ["siteSettings", "product", "routine", "ingredient", "article", "outlet", "faq"]]`
  );

  let pulledUpdates = 0;
  const demoDocIdsToDelete: string[] = [];

  for (const doc of docs) {
    if (isLegacyDemoSanityDoc(doc)) {
      if (doc._id) demoDocIdsToDelete.push(doc._id);
      continue;
    }
    if (doc._type === 'product' && doc.slug && doc.name) {
      const incoming = doc as unknown as Product & { _updatedAt?: string };
      const existing = store.products.find((p) => p.id === incoming.id || p.slug === incoming.slug);
      const sanityTime = Date.parse(incoming._updatedAt || incoming.updatedAt || '0');
      if (!existing) {
        store.products.push(incoming);
        pulledUpdates++;
      } else {
        const localTime = Date.parse(existing.updatedAt || '0');
        // Pull only if Sanity doc was modified later via Sanity Studio (> 5s after local updatedAt)
        if (Number.isFinite(sanityTime) && sanityTime > localTime + 5000) {
          applySanityProductToExisting(existing, incoming);
          pulledUpdates++;
        }
      }
    }
  }

  if (demoDocIdsToDelete.length > 0) {
    const { projectId, dataset, token } = getSanityConfig();
    const deleteMutations = demoDocIdsToDelete.map((id) => ({ delete: { id } }));
    await fetch(`https://${projectId}.api.sanity.io/v${API_VERSION}/data/mutate/${dataset}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mutations: deleteMutations }),
    }).catch(() => {});
  }

  const pushResult = await pushStoreToSanity(store);
  lastSyncAt = new Date().toISOString();
  lastSyncDirection = 'bidirectional';
  lastSyncError = null;
  lastSyncedCount = pushResult.count;

  return {
    pulledUpdates,
    pushedTotal: pushResult.count,
    transactionId: pushResult.transactionId,
  };
}
