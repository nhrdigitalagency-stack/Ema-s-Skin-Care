export type Language = 'fr' | 'en';

export type LocalizedText = {
  fr: string;
  en: string;
};

export type ProductStatus = 'draft_pending_validation' | 'published' | 'archived';

export type CategorySlug =
  | 'visage'
  | 'corps'
  | 'cheveux'
  | 'nettoyants-savons'
  | 'huiles'
  | 'serums'
  | 'coffrets';

export type UserRole =
  | 'customer'
  | 'b2b_partner'
  | 'admin'
  | 'catalog_manager'
  | 'stock_manager'
  | 'preparer'
  | 'customer_service'
  | 'editor';

export interface ProductVariant {
  id: string;
  sku: string;
  label: LocalizedText;
  format: string;
  priceXaf: number | null;
  b2bPriceXaf?: number | null;
  sellable: boolean;
  lowStockThreshold: number;
  physicalQty: number;
  reservedQty: number;
  availableQty: number;
}

export interface StockLot {
  id: string;
  variantId: string;
  sku: string;
  lotCode: string;
  receivedAt: string;
  expiryDate: string | null;
  initialQty: number;
  remainingQty: number;
  quarantinedQty: number;
  status: 'active' | 'blocked' | 'quarantined' | 'expired';
  notes?: string;
}

export interface StockMovement {
  id: string;
  variantId: string;
  sku: string;
  lotId?: string;
  lotCode?: string;
  type: 'reception' | 'reservation' | 'release' | 'sale' | 'return_quarantine' | 'breakage' | 'loss' | 'correction' | 'lot_block';
  qtyDelta: number;
  actor: string;
  reference?: string;
  reason: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

export interface Product {
  id: string;
  slug: string;
  name: LocalizedText;
  range: string;
  category: CategorySlug;
  applicationZone: 'face' | 'body' | 'hair' | 'cleansing';
  texture: LocalizedText;
  skinTypes: string[];
  cosmeticNeeds: string[];
  status: ProductStatus;
  isDemoItem: boolean;
  safetyValidated: boolean;
  validationNotes?: string;
  visualTheme: 'sage-botanical' | 'champagne-oil' | 'ivory-milk' | 'forest-balm' | 'terracotta-clay' | 'draft-blueprint';
  imageUrl?: string;
  shortSummary: LocalizedText;
  description: LocalizedText;
  cosmeticBenefits: LocalizedText;
  directions: LocalizedText;
  inci: string;
  precautions: LocalizedText;
  storage: LocalizedText;
  paoMonths: number | null;
  audienceRestrictions: LocalizedText;
  ingredientSlugs: string[];
  relatedSlugs: string[];
  variants: ProductVariant[];
  updatedAt: string;
}

export interface RoutineStep {
  order: number;
  productSlug: string;
  stepTitle: LocalizedText;
  instruction: LocalizedText;
  frequency: LocalizedText;
}

export interface Routine {
  id: string;
  slug: string;
  title: LocalizedText;
  objective: LocalizedText;
  zone: 'face' | 'body' | 'hair';
  preferredTexture: string;
  precautions: LocalizedText;
  isDemoItem: boolean;
  published: boolean;
  steps: RoutineStep[];
}

export interface Ingredient {
  id: string;
  slug: string;
  name: LocalizedText;
  botanicalName: string;
  origin: LocalizedText;
  cosmeticRole: LocalizedText;
  usageNotes: LocalizedText;
  disclaimer: LocalizedText;
  published: boolean;
}

export interface JournalArticle {
  id: string;
  slug: string;
  title: LocalizedText;
  excerpt: LocalizedText;
  body: LocalizedText;
  category: LocalizedText;
  publishedAt: string;
  readMinutes: number;
  published: boolean;
}

export interface Outlet {
  id: string;
  name: string;
  kind: 'headquarters_boutique' | 'boutique' | 'depot' | 'reseller';
  city: string;
  address: string;
  phone: string;
  hours: string;
  mapsUrl?: string;
  verificationStatus: 'to_confirm' | 'verifying' | 'confirmed';
  verificationNote: LocalizedText;
  published: boolean;
}

export interface FaqItem {
  id: string;
  question: LocalizedText;
  answer: LocalizedText;
  category: string;
  published: boolean;
}

export interface DeliveryZone {
  id: string;
  city: string;
  label: LocalizedText;
  feeKnown: boolean;
  feeXaf: number | null;
  minOrderXaf: number;
  estimatedDelay: LocalizedText;
  pickupAvailable: boolean;
  active: boolean;
}

export interface PromoCode {
  code: string;
  description: LocalizedText;
  discountPercent: number;
  minSubtotalXaf: number;
  active: boolean;
  isDemo: boolean;
}

export type OrderStatus =
  | 'registered'
  | 'whatsapp_prepared'
  | 'accepted'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus =
  | 'unpaid'
  | 'pending_online'
  | 'paid'
  | 'failed'
  | 'refunded';

export type PaymentMethod = 'cash_on_delivery_or_pickup' | 'whatsapp_assisted' | 'online_configured';

export interface OrderItemSnapshot {
  productId: string;
  productSlug: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  unitPriceXaf: number;
  quantity: number;
  lineTotalXaf: number;
  assignedLots: Array<{ lotId: string; lotCode: string; qty: number }>;
}

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  note: string;
  actor: string;
  at: string;
}

export interface Order {
  id: string;
  reference: string;
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
  feeKnown: boolean;
  deliveryFeeXaf: number | null;
  promoCode?: string;
  discountXaf: number;
  subtotalXaf: number;
  estimatedTotalXaf: number | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  reservationExpiresAt: string | null;
  stockDeducted: boolean;
  items: OrderItemSnapshot[];
  statusHistory: OrderStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productSlug: string;
  authorName: string;
  userId: string | null;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  orderReference?: string;
  status: 'pending' | 'approved' | 'rejected';
  moderationReason?: string;
  consentGiven: boolean;
  createdAt: string;
}

export interface ReturnOrClaim {
  id: string;
  orderReference: string;
  customerPhone: string;
  kind: 'return' | 'claim';
  reason: string;
  openedOrSuspect: boolean;
  sku?: string;
  lotCode?: string;
  quantity?: number;
  status: 'open' | 'investigating' | 'resolved_quarantined' | 'rejected';
  resolutionNote?: string;
  createdAt: string;
}

export interface ResellerInquiry {
  id: string;
  fullName: string;
  companyName: string;
  city: string;
  phone: string;
  email: string;
  activityType: string;
  estimatedMonthlyVolume: string;
  message?: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  consentMarketing: boolean;
  active: boolean;
  subscribedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  email?: string;
  subject: string;
  message: string;
  status: 'new' | 'answered';
  createdAt: string;
}

export interface UserAccount {
  id: string;
  email: string;
  username?: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  favorites: string[];
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
}

export interface SiteSettings {
  brandName: string;
  legalEntityName: string;
  signature: LocalizedText;
  signaturePendingValidation: boolean;
  heroLabel: LocalizedText;
  heroTitle: LocalizedText;
  heroSubtitle: LocalizedText;
  primaryPhone: string;
  secondaryPhone: string;
  whatsappPhone: string;
  whatsappConfirmed: boolean;
  headquartersAddress: string;
  headquartersPendingConfirmation: boolean;
  demoModeBannerEnabled: boolean;
  onlinePaymentEnabled: boolean;
  onlinePaymentProviderLabel: string;
  cashOnDeliveryEnabled: boolean;
}

export interface TestimonialImage {
  id: string;
  url: string;
  alt?: string;
  uploadedAt: string;
}

export interface Testimonial {
  id: string;
  authorName: string;
  city?: string;
  productName?: string;
  rating: number;
  comment: string;
  images: TestimonialImage[];
  createdAt: string;
}

export interface CommunityMember {
  id: string;
  phone: string;
  joinedAt: string;
}

export interface Appointment {
  id: string;
  fullName: string;
  phone: string;
  serviceType: string;
  channel: 'boutique' | 'whatsapp_call';
  preferredDate: string;
  preferredTime: string;
  notes?: string;
  createdAt: string;
}

export interface PublicBootstrapPayload {
  settings: SiteSettings;
  products: Product[];
  routines: Routine[];
  ingredients: Ingredient[];
  articles: JournalArticle[];
  outlets: Outlet[];
  faqs: FaqItem[];
  deliveryZones: DeliveryZone[];
  reviews: Review[];
  testimonials: Testimonial[];
  session: {
    authenticated: boolean;
    needsAdminBootstrap: boolean;
    user: {
      id: string;
      email: string;
      username?: string;
      fullName: string;
      phone?: string;
      role: UserRole;
      favorites: string[];
    } | null;
  };
}
