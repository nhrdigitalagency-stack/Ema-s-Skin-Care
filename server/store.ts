import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  Appointment,
  AuditLogEntry,
  CommunityMember,
  ContactMessage,
  DeliveryZone,
  FaqItem,
  Ingredient,
  JournalArticle,
  NewsletterSubscriber,
  Order,
  OrderItemSnapshot,
  OrderStatus,
  Outlet,
  PaymentMethod,
  PaymentStatus,
  Product,
  PromoCode,
  ResellerInquiry,
  ReturnOrClaim,
  Review,
  Routine,
  SiteSettings,
  StockLot,
  StockMovement,
  Testimonial,
  UserAccount,
  UserRole,
} from '../src/types/ecommerce.ts';
import {
  DEFAULT_SETTINGS,
  INITIAL_ARTICLES,
  INITIAL_DELIVERY_ZONES,
  INITIAL_FAQS,
  INITIAL_INGREDIENTS,
  INITIAL_LOTS,
  INITIAL_MOVEMENTS,
  INITIAL_OUTLETS,
  INITIAL_PRODUCTS,
  INITIAL_PROMO_CODES,
  INITIAL_ROUTINES,
} from './data/seed.ts';

export interface StoreSchema {
  settings: SiteSettings;
  products: Product[];
  lots: StockLot[];
  movements: StockMovement[];
  auditLogs: AuditLogEntry[];
  routines: Routine[];
  ingredients: Ingredient[];
  articles: JournalArticle[];
  outlets: Outlet[];
  faqs: FaqItem[];
  deliveryZones: DeliveryZone[];
  promoCodes: PromoCode[];
  orders: Order[];
  reviews: Review[];
  testimonials: Testimonial[];
  communityMembers: CommunityMember[];
  appointments: Appointment[];
  returnsClaims: ReturnOrClaim[];
  resellerInquiries: ResellerInquiry[];
  newsletter: NewsletterSubscriber[];
  contacts: ContactMessage[];
  users: UserAccount[];
  exportLogs: Array<{ id: string; actorEmail: string; filterSummary: string; rowCount: number; at: string }>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const RESERVATION_TTL_MS = 15 * 60 * 1000;

let writeLock: Promise<void> = Promise.resolve();

function createInitialStore(): StoreSchema {
  return {
    settings: DEFAULT_SETTINGS,
    products: INITIAL_PRODUCTS,
    lots: INITIAL_LOTS,
    movements: INITIAL_MOVEMENTS,
    auditLogs: [],
    routines: INITIAL_ROUTINES,
    ingredients: INITIAL_INGREDIENTS,
    articles: INITIAL_ARTICLES,
    outlets: INITIAL_OUTLETS,
    faqs: INITIAL_FAQS,
    deliveryZones: INITIAL_DELIVERY_ZONES,
    promoCodes: INITIAL_PROMO_CODES,
    orders: [],
    reviews: [],
    testimonials: [],
    communityMembers: [],
    appointments: [],
    returnsClaims: [],
    resellerInquiries: [],
    newsletter: [],
    contacts: [],
    users: [],
    exportLogs: [],
  };
}

function readStoreRaw(): StoreSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial = createInitialStore();
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  const raw = fs.readFileSync(STORE_PATH, 'utf8');
  const parsed = JSON.parse(raw) as StoreSchema;
  if (!Array.isArray(parsed.testimonials)) parsed.testimonials = [];
  if (!Array.isArray(parsed.communityMembers)) parsed.communityMembers = [];
  if (!Array.isArray(parsed.appointments)) parsed.appointments = [];
  return parsed;
}

function writeStoreRaw(data: StoreSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, STORE_PATH);
}

/**
 * Recompute physical/available quantities on each variant from non-blocked, non-expired lots,
 * and automatically release expired temporary reservations.
 */
function reconcileStoreState(store: StoreSchema): boolean {
  let mutated = false;
  const now = Date.now();
  const todayIso = new Date(now).toISOString().slice(0, 10);

  // 1. Mark expired lots
  for (const lot of store.lots) {
    if (lot.status === 'active' && lot.expiryDate && lot.expiryDate < todayIso) {
      lot.status = 'expired';
      mutated = true;
    }
  }

  // 2. Release expired reservations on unpaid pending orders
  for (const order of store.orders) {
    if (
      !order.stockDeducted &&
      order.status !== 'cancelled' &&
      order.status !== 'delivered' &&
      order.paymentStatus === 'pending_online' &&
      order.reservationExpiresAt &&
      Date.parse(order.reservationExpiresAt) < now
    ) {
      order.status = 'cancelled';
      order.paymentStatus = 'failed';
      order.reservationExpiresAt = null;
      order.updatedAt = new Date(now).toISOString();
      order.statusHistory.push({
        status: 'cancelled',
        paymentStatus: 'failed',
        note: 'Réservation expirée automatiquement (délai de paiement dépassé)',
        actor: 'system:expiry',
        at: order.updatedAt,
      });
      for (const item of order.items) {
        const variant = findVariant(store, item.variantId);
        if (variant) {
          variant.reservedQty = Math.max(0, variant.reservedQty - item.quantity);
          store.movements.push({
            id: `mov-${crypto.randomUUID()}`,
            variantId: item.variantId,
            sku: item.sku,
            type: 'release',
            qtyDelta: item.quantity,
            actor: 'system:expiry',
            reference: order.reference,
            reason: 'Libération automatique après expiration de réservation',
            createdAt: order.updatedAt,
          });
        }
      }
      mutated = true;
    }
  }

  // 3. Recompute physicalQty & availableQty from active non-expired lots
  for (const product of store.products) {
    for (const variant of product.variants) {
      const activeLots = store.lots.filter(
        (l) => l.variantId === variant.id && l.status === 'active' && l.remainingQty > 0
      );
      const activeTotal = activeLots.reduce((acc, l) => acc + l.remainingQty, 0);
      if (variant.physicalQty !== activeTotal) {
        variant.physicalQty = activeTotal;
        mutated = true;
      }
      const nextAvailable = Math.max(0, variant.physicalQty - variant.reservedQty);
      if (variant.availableQty !== nextAvailable) {
        variant.availableQty = nextAvailable;
        mutated = true;
      }
    }
  }

  return mutated;
}

export async function withStoreRead<T>(fn: (store: StoreSchema) => T): Promise<T> {
  await writeLock;
  const store = readStoreRaw();
  const changed = reconcileStoreState(store);
  if (changed) {
    writeStoreRaw(store);
  }
  return fn(store);
}

export async function withStoreTransaction<T>(fn: (store: StoreSchema) => T | Promise<T>): Promise<T> {
  const prev = writeLock;
  let release!: () => void;
  writeLock = new Promise<void>((res) => {
    release = res;
  });
  await prev;
  try {
    const store = readStoreRaw();
    reconcileStoreState(store);
    const result = await fn(store);
    reconcileStoreState(store);
    writeStoreRaw(store);
    return result;
  } finally {
    release();
  }
}

export function findVariant(store: StoreSchema, variantId: string) {
  for (const p of store.products) {
    const v = p.variants.find((item) => item.id === variantId);
    if (v) return v;
  }
  return undefined;
}

export function findProductByVariant(store: StoreSchema, variantId: string) {
  for (const p of store.products) {
    if (p.variants.some((v) => v.id === variantId)) {
      return p;
    }
  }
  return undefined;
}

// =========================================================================
// AUTH & SESSION SECURITY (SCRYPT + HMAC-SHA256, ZERO HARDCODED PASSWORDS)
// =========================================================================

const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

function getSessionSecret(): string {
  return process.env.SESSION_SECRET && process.env.SESSION_SECRET !== 'CHANGE_ME_TO_A_SECURE_RANDOM_SECRET'
    ? process.env.SESSION_SECRET
    : EPHEMERAL_FALLBACK_SECRET;
}

export function hashPassword(password: string, existingSalt?: string): { salt: string; hash: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(derived, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signSessionToken(userId: string, role: UserRole): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, role, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined): { uid: string; role: UserRole } | null {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      uid: string;
      role: UserRole;
      exp: number;
    };
    if (!parsed.uid || parsed.exp < Date.now()) return null;
    return { uid: parsed.uid, role: parsed.role };
  } catch {
    return null;
  }
}

export const STAFF_ROLES: UserRole[] = [
  'admin',
  'catalog_manager',
  'stock_manager',
  'preparer',
  'customer_service',
  'editor',
];

export function isStaffRole(role: UserRole | undefined): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

// =========================================================================
// ATOMIC ORDER CREATION WITH IDEMPOTENCY & SERVER-SIDE PRICE/STOCK CHECK
// =========================================================================

export interface CreateOrderInput {
  idempotencyKey: string;
  userId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  city: string;
  neighborhood: string;
  receptionMode: 'delivery' | 'pickup';
  address?: string;
  landmark?: string;
  instructions?: string;
  deliveryZoneId: string;
  promoCode?: string;
  paymentMethod: PaymentMethod;
  items: Array<{ variantId: string; quantity: number }>;
}

export class StoreBusinessError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function createOrderInTransaction(store: StoreSchema, input: CreateOrderInput): { order: Order; duplicate: boolean } {
  const existing = store.orders.find((o) => o.idempotencyKey === input.idempotencyKey);
  if (existing) {
    return { order: existing, duplicate: true };
  }

  if (!input.items || input.items.length === 0) {
    throw new StoreBusinessError('Votre panier est vide.');
  }

  if (!input.customerName.trim() || !input.customerPhone.trim()) {
    throw new StoreBusinessError('Le nom complet et le numéro de téléphone sont obligatoires.');
  }

  const zone = store.deliveryZones.find((z) => z.id === input.deliveryZoneId && z.active);
  if (!zone) {
    throw new StoreBusinessError('Zone de réception invalide.');
  }

  if (input.paymentMethod === 'whatsapp_assisted' && !store.settings.whatsappConfirmed) {
    // Allowed only if owner confirmed WhatsApp or allow recording as registered? Let's enforce check cleanly:
    // Actually if whatsappConfirmed is false, client won't offer WhatsApp checkout, or we fall back with clear error:
    throw new StoreBusinessError('La commande assistée par WhatsApp n’est pas encore activée par la marque.');
  }

  if (input.paymentMethod === 'online_configured' && !store.settings.onlinePaymentEnabled) {
    throw new StoreBusinessError('Aucun prestataire de paiement en ligne n’est configuré.');
  }

  // Merge duplicate variantIds in payload
  const qtyByVariant = new Map<string, number>();
  for (const row of input.items) {
    const qty = Math.floor(Number(row.quantity));
    if (!Number.isFinite(qty) || qty <= 0 || qty > 50) {
      throw new StoreBusinessError('Quantité demandée invalide.');
    }
    qtyByVariant.set(row.variantId, (qtyByVariant.get(row.variantId) || 0) + qty);
  }

  const snapshots: OrderItemSnapshot[] = [];
  let subtotalXaf = 0;

  // Validate products, safety validation, pricing, and available stock
  for (const [variantId, qty] of qtyByVariant.entries()) {
    const product = findProductByVariant(store, variantId);
    const variant = findVariant(store, variantId);
    if (!product || !variant) {
      throw new StoreBusinessError('Référence produit introuvable.');
    }
    if (product.status !== 'published' || !product.safetyValidated || !variant.sellable || variant.priceXaf === null) {
      throw new StoreBusinessError(`Le produit "${product.name.fr}" n’est pas encore validé pour la vente.`);
    }
    if (variant.availableQty < qty) {
      throw new StoreBusinessError(
        `Stock insuffisant pour ${product.name.fr} (${variant.format}) : ${variant.availableQty} unité(s) disponible(s).`
      );
    }

    const unitPriceXaf = variant.priceXaf;
    const lineTotalXaf = unitPriceXaf * qty;
    subtotalXaf += lineTotalXaf;

    snapshots.push({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name.fr,
      variantId: variant.id,
      variantLabel: variant.label.fr,
      sku: variant.sku,
      unitPriceXaf,
      quantity: qty,
      lineTotalXaf,
      assignedLots: [],
    });
  }

  // Validate promo code server-side
  let discountXaf = 0;
  let appliedPromo: string | undefined;
  if (input.promoCode && input.promoCode.trim()) {
    const normalizedCode = input.promoCode.trim().toUpperCase();
    const promo = store.promoCodes.find((p) => p.code.toUpperCase() === normalizedCode && p.active);
    if (!promo) {
      throw new StoreBusinessError('Code promotionnel invalide ou expiré.');
    }
    if (subtotalXaf < promo.minSubtotalXaf) {
      throw new StoreBusinessError(`Ce code nécessite un sous-total minimum de ${promo.minSubtotalXaf} XAF.`);
    }
    discountXaf = Math.round((subtotalXaf * promo.discountPercent) / 100);
    appliedPromo = promo.code;
  }

  // Delivery fee calculation: NEVER invent a final total when feeKnown === false
  let feeKnown = zone.feeKnown;
  let deliveryFeeXaf: number | null = zone.feeXaf;
  if (input.receptionMode === 'pickup' && zone.pickupAvailable) {
    feeKnown = true;
    deliveryFeeXaf = 0;
  }
  const estimatedTotalXaf = feeKnown && deliveryFeeXaf !== null ? Math.max(0, subtotalXaf - discountXaf + deliveryFeeXaf) : null;

  const nowIso = new Date().toISOString();
  const datePart = nowIso.slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const reference = `EMS-${datePart}-${randomSuffix}`;

  // Reserve stock cleanly; for immediate cash/WhatsApp orders we reserve until prepared/shipped (or deduct on confirm/ship),
  // AND prevent double-spending on the last unit!
  for (const snap of snapshots) {
    const variant = findVariant(store, snap.variantId)!;
    variant.reservedQty += snap.quantity;
    variant.availableQty = Math.max(0, variant.physicalQty - variant.reservedQty);
    store.movements.push({
      id: `mov-${crypto.randomUUID()}`,
      variantId: snap.variantId,
      sku: snap.sku,
      type: 'reservation',
      qtyDelta: -snap.quantity,
      actor: input.userId || 'guest',
      reference,
      reason: 'Réservation lors de l’enregistrement de commande',
      createdAt: nowIso,
    });
  }

  const initialStatus: OrderStatus =
    input.paymentMethod === 'whatsapp_assisted' ? 'whatsapp_prepared' : 'registered';
  const initialPaymentStatus: PaymentStatus =
    input.paymentMethod === 'online_configured' ? 'pending_online' : 'unpaid';

  const order: Order = {
    id: `ord-${crypto.randomUUID()}`,
    reference,
    idempotencyKey: input.idempotencyKey,
    userId: input.userId,
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    customerEmail: input.customerEmail?.trim() || undefined,
    city: input.city.trim() || zone.city,
    neighborhood: input.neighborhood.trim(),
    receptionMode: input.receptionMode,
    address: input.address?.trim() || undefined,
    landmark: input.landmark?.trim() || undefined,
    instructions: input.instructions?.trim() || undefined,
    deliveryZoneId: zone.id,
    feeKnown,
    deliveryFeeXaf,
    promoCode: appliedPromo,
    discountXaf,
    subtotalXaf,
    estimatedTotalXaf,
    paymentMethod: input.paymentMethod,
    paymentStatus: initialPaymentStatus,
    status: initialStatus,
    reservationExpiresAt:
      input.paymentMethod === 'online_configured'
        ? new Date(Date.now() + RESERVATION_TTL_MS).toISOString()
        : null,
    stockDeducted: false,
    items: snapshots,
    statusHistory: [
      {
        status: initialStatus,
        paymentStatus: initialPaymentStatus,
        note:
          input.paymentMethod === 'whatsapp_assisted'
            ? 'Commande enregistrée — récapitulatif WhatsApp prêt à être envoyé par le client'
            : 'Commande enregistrée côté serveur (stock réservé)',
        actor: input.userId || 'guest',
        at: nowIso,
      },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  store.orders.unshift(order);
  return { order, duplicate: false };
}

/**
 * Deduct stock once (FIFO across active non-expired lots) when order moves to preparing/shipped/delivered or paid.
 */
export function deductOrderStockOnce(store: StoreSchema, order: Order, actorEmail: string): void {
  if (order.stockDeducted) return;
  const nowIso = new Date().toISOString();

  for (const item of order.items) {
    const variant = findVariant(store, item.variantId);
    if (!variant) {
      throw new StoreBusinessError(`Variante ${item.sku} introuvable.`);
    }

    const activeLots = store.lots
      .filter((l) => l.variantId === item.variantId && l.status === 'active' && l.remainingQty > 0)
      .sort((a, b) => (a.expiryDate || '9999-12-31').localeCompare(b.expiryDate || '9999-12-31'));

    let remainingToDeduct = item.quantity;
    const assignedLots: Array<{ lotId: string; lotCode: string; qty: number }> = [];

    for (const lot of activeLots) {
      if (remainingToDeduct <= 0) break;
      const take = Math.min(lot.remainingQty, remainingToDeduct);
      lot.remainingQty -= take;
      remainingToDeduct -= take;
      assignedLots.push({ lotId: lot.id, lotCode: lot.lotCode, qty: take });

      store.movements.push({
        id: `mov-${crypto.randomUUID()}`,
        variantId: item.variantId,
        sku: item.sku,
        lotId: lot.id,
        lotCode: lot.lotCode,
        type: 'sale',
        qtyDelta: -take,
        actor: actorEmail,
        reference: order.reference,
        reason: `Déstockage commande ${order.reference} (lot ${lot.lotCode})`,
        createdAt: nowIso,
      });
    }

    if (remainingToDeduct > 0) {
      throw new StoreBusinessError(
        `Impossible de déstocker ${item.sku} : quantité insuffisante dans les lots actifs (lot possiblement bloqué ou expiré).`
      );
    }

    item.assignedLots = assignedLots;
    variant.reservedQty = Math.max(0, variant.reservedQty - item.quantity);
  }

  order.stockDeducted = true;
}

export function releaseOrderReservation(store: StoreSchema, order: Order, actorEmail: string, reason: string): void {
  if (order.stockDeducted) {
    // If already deducted, returning stock from a cancelled/unshipped order? Only if NOT opened/returned by customer!
    // Wait: if order was never shipped and cancelled internally, restore to original lot; if shipped/returned, handle via quarantine.
    const nowIso = new Date().toISOString();
    for (const item of order.items) {
      for (const alloc of item.assignedLots) {
        const lot = store.lots.find((l) => l.id === alloc.lotId);
        if (lot && lot.status === 'active') {
          lot.remainingQty += alloc.qty;
          store.movements.push({
            id: `mov-${crypto.randomUUID()}`,
            variantId: item.variantId,
            sku: item.sku,
            lotId: lot.id,
            lotCode: lot.lotCode,
            type: 'correction',
            qtyDelta: alloc.qty,
            actor: actorEmail,
            reference: order.reference,
            reason,
            createdAt: nowIso,
          });
        }
      }
    }
    order.stockDeducted = false;
    return;
  }

  const nowIso = new Date().toISOString();
  for (const item of order.items) {
    const variant = findVariant(store, item.variantId);
    if (variant) {
      variant.reservedQty = Math.max(0, variant.reservedQty - item.quantity);
      store.movements.push({
        id: `mov-${crypto.randomUUID()}`,
        variantId: item.variantId,
        sku: item.sku,
        type: 'release',
        qtyDelta: item.quantity,
        actor: actorEmail,
        reference: order.reference,
        reason,
        createdAt: nowIso,
      });
    }
  }
}

export function appendAuditLog(
  store: StoreSchema,
  actorEmail: string,
  actorRole: string,
  action: string,
  targetType: string,
  targetId: string,
  details: string
): void {
  store.auditLogs.unshift({
    id: `aud-${crypto.randomUUID()}`,
    actorEmail,
    actorRole,
    action,
    targetType,
    targetId,
    details,
    createdAt: new Date().toISOString(),
  });
}
