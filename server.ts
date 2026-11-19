import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import {
  appendAuditLog,
  createOrderInTransaction,
  deductOrderStockOnce,
  findVariant,
  hashPassword,
  isStaffRole,
  releaseOrderReservation,
  signSessionToken,
  StoreBusinessError,
  verifyPassword,
  verifySessionToken,
  withStoreRead,
  withStoreTransaction,
  type StoreSchema,
} from './server/store.ts';
import {
  countSanityDocuments,
  getSanityPublicInfo,
  isSanityConfigured,
  pullSanityIntoStore,
  pushStoreToSanity,
  syncBidirectionalWithSanity,
} from './server/sanity.ts';
import { INITIAL_PRODUCTS } from './server/data/seed.ts';
import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  UserAccount,
  UserRole,
} from './src/types/ecommerce.ts';

const PORT = Number(process.env.PORT || 3000);
const COOKIE_NAME = 'emaus_session';

interface AuthenticatedRequest extends Request {
  authUser?: UserAccount;
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, '').replace(/^00/, '+');
}

function sanitizeProductForPublic(product: Product, includeB2b: boolean): Product {
  return {
    ...product,
    variants: product.variants.map((v) => ({
      ...v,
      b2bPriceXaf: includeB2b ? v.b2bPriceXaf ?? null : undefined,
    })),
  };
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

async function attachAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const parsed = verifySessionToken(cookies[COOKIE_NAME]);
    if (parsed) {
      const user = await withStoreRead((store) => store.users.find((u) => u.id === parsed.uid));
      if (user) {
        req.authUser = user;
      }
    }
  } catch {
    // ignore malformed session
  }
  next();
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.authUser) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }
  next();
}

function requireStaff(allowedRoles?: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser || !isStaffRole(req.authUser.role)) {
      res.status(403).json({ error: 'Accès réservé au personnel autorisé.' });
      return;
    }
    if (allowedRoles && req.authUser.role !== 'admin' && !allowedRoles.includes(req.authUser.role)) {
      res.status(403).json({ error: 'Permissions insuffisantes pour cette action.' });
      return;
    }
    next();
  };
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');
const TESTIMONIAL_UPLOADS_DIR = path.join(UPLOADS_DIR, 'testimonials');
const WHATSAPP_COMMUNITY_LINK = 'https://chat.whatsapp.com/FsrAdXceHfaBjfcLawQGPx';

function safeDeleteUploadFile(publicUrl: string) {
  if (!publicUrl || !publicUrl.startsWith('/uploads/')) return;
  const relative = publicUrl.replace(/^\/uploads\//, '');
  const resolved = path.resolve(UPLOADS_DIR, relative);
  if (resolved.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(resolved)) {
    try {
      fs.unlinkSync(resolved);
    } catch {
      // ignore fs cleanup error
    }
  }
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '15mb' }));
  app.use(attachAuth);
  if (!fs.existsSync(TESTIMONIAL_UPLOADS_DIR)) {
    fs.mkdirSync(TESTIMONIAL_UPLOADS_DIR, { recursive: true });
  }
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Healthcheck
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'emaus-skin-care' });
  });

  // SEO: robots.txt & dynamic sitemap.xml
  app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /mon-compte\nDisallow: /commande\nSitemap: ${baseUrl}/sitemap.xml\n`
    );
  });

  app.get('/sitemap.xml', async (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const urls = await withStoreRead((store) => {
      const staticPaths = [
        '/',
        '/boutique',
        '/routines',
        '/ingredients',
        '/a-propos',
        '/la-marque',
        '/journal',
        '/points-de-vente',
        '/professionnels',
        '/contact',
        '/rendez-vous',
        '/faq',
        '/livraison-retours',
        '/confidentialite',
        '/conditions',
      ];
      const prodPaths = store.products
        .filter((p) => p.status === 'published')
        .map((p) => `/produits/${p.slug}`);
      const routinePaths = store.routines
        .filter((r) => r.published)
        .map((r) => `/routines/${r.slug}`);
      const ingPaths = store.ingredients
        .filter((i) => i.published)
        .map((i) => `/ingredients/${i.slug}`);
      const artPaths = store.articles
        .filter((a) => a.published)
        .map((a) => `/journal/${a.slug}`);
      return [...staticPaths, ...prodPaths, ...routinePaths, ...ingPaths, ...artPaths];
    });
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${baseUrl}${u}</loc></url>`)
      .join('\n')}\n</urlset>`;
    res.type('application/xml').send(xml);
  });

  // Public bootstrap
  app.get('/api/bootstrap', async (req: AuthenticatedRequest, res) => {
    const payload = await withStoreRead((store) => {
      const user = req.authUser;
      const includeB2b = !!user && (user.role === 'b2b_partner' || isStaffRole(user.role));
      const needsAdminBootstrap = !store.users.some((u) => u.role === 'admin');
      return {
        settings: store.settings,
        products: store.products
          .filter((p) => p.status !== 'archived')
          .map((p) => sanitizeProductForPublic(p, includeB2b)),
        routines: store.routines.filter((r) => r.published),
        ingredients: store.ingredients.filter((i) => i.published),
        articles: store.articles.filter((a) => a.published),
        outlets: store.outlets.filter((o) => o.published),
        faqs: store.faqs.filter((f) => f.published),
        deliveryZones: store.deliveryZones.filter((z) => z.active),
        reviews: store.reviews.filter((r) => r.status === 'approved'),
        testimonials: store.testimonials,
        session: {
          authenticated: !!user,
          needsAdminBootstrap,
          user: user
            ? {
                id: user.id,
                email: user.email,
                username: user.username,
                fullName: user.fullName,
                phone: user.phone,
                role: user.role,
                favorites: user.favorites,
              }
            : null,
        },
      };
    });
    res.json(payload);
  });

  // Private B2B pricing endpoint (server-verified authorization)
  app.get('/api/b2b/pricing', requireAuth, async (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    if (user.role !== 'b2b_partner' && !isStaffRole(user.role)) {
      res.status(403).json({ error: 'Accès réservé aux partenaires professionnels validés.' });
      return;
    }
    const items = await withStoreRead((store) =>
      store.products
        .filter((p) => p.status === 'published')
        .map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          isDemoItem: p.isDemoItem,
          variants: p.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            format: v.format,
            publicPriceXaf: v.priceXaf,
            b2bPriceXaf: v.b2bPriceXaf ?? null,
            availableQty: v.availableQty,
          })),
        }))
    );
    res.json({ items });
  });

  // Auth: First-run admin bootstrap (strictly disabled once an admin exists)
  app.post('/api/auth/bootstrap-admin', async (req, res) => {
    const { email, username, fullName, password } = req.body as {
      email?: string;
      username?: string;
      fullName?: string;
      password?: string;
    };
    if (!email || !fullName || !password || password.length < 10) {
      res.status(400).json({
        error: 'E-mail, nom complet et mot de passe robuste (10 caractères minimum) requis.',
      });
      return;
    }
    try {
      const user = await withStoreTransaction((store) => {
        if (store.users.some((u) => u.role === 'admin')) {
          throw new StoreBusinessError('Un compte administrateur existe déjà. Utilisez la connexion.', 403);
        }
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedUsername = username?.trim() ? username.trim().toLowerCase() : normalizedEmail.split('@')[0];
        const { salt, hash } = hashPassword(password);
        const created: UserAccount = {
          id: `usr-${crypto.randomUUID()}`,
          email: normalizedEmail,
          username: normalizedUsername,
          fullName: fullName.trim(),
          role: 'admin',
          favorites: [],
          passwordHash: hash,
          passwordSalt: salt,
          createdAt: new Date().toISOString(),
        };
        store.users.push(created);
        appendAuditLog(store, normalizedEmail, 'admin', 'BOOTSTRAP_ADMIN', 'user', created.id, 'Création du premier compte administrateur');
        return created;
      });
      const token = signSessionToken(user.id, user.role);
      setSessionCookie(res, token);
      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          favorites: user.favorites,
        },
      });
    } catch (err) {
      if (err instanceof StoreBusinessError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Erreur lors de la création du compte administrateur.' });
    }
  });

  // Auth: Customer registration (role locked to 'customer')
  app.post('/api/auth/register', async (req, res) => {
    const { email, username, fullName, phone, password } = req.body as {
      email?: string;
      username?: string;
      fullName?: string;
      phone?: string;
      password?: string;
    };
    if (!email || !fullName || !password || password.length < 8) {
      res.status(400).json({ error: 'E-mail, nom complet et mot de passe (8 caractères min.) requis.' });
      return;
    }
    try {
      const user = await withStoreTransaction((store) => {
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedUsername = username?.trim().toLowerCase() || undefined;
        if (store.users.some((u) => u.email === normalizedEmail)) {
          throw new StoreBusinessError('Un compte existe déjà avec cette adresse e-mail.', 409);
        }
        if (normalizedUsername && store.users.some((u) => u.username?.toLowerCase() === normalizedUsername)) {
          throw new StoreBusinessError('Ce nom d’utilisateur est déjà utilisé.', 409);
        }
        const { salt, hash } = hashPassword(password);
        const created: UserAccount = {
          id: `usr-${crypto.randomUUID()}`,
          email: normalizedEmail,
          username: normalizedUsername,
          fullName: fullName.trim(),
          phone: phone?.trim() || undefined,
          role: 'customer',
          favorites: [],
          passwordHash: hash,
          passwordSalt: salt,
          createdAt: new Date().toISOString(),
        };
        store.users.push(created);
        return created;
      });
      const token = signSessionToken(user.id, user.role);
      setSessionCookie(res, token);
      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
          favorites: user.favorites,
        },
      });
    } catch (err) {
      if (err instanceof StoreBusinessError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Erreur lors de l’inscription.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { identifier, email, username, password } = req.body as {
      identifier?: string;
      email?: string;
      username?: string;
      password?: string;
    };
    const rawLogin = (identifier || email || username || '').trim().toLowerCase();
    if (!rawLogin || !password) {
      res.status(400).json({ error: 'Identifiant (nom d’utilisateur ou e-mail) et mot de passe requis.' });
      return;
    }
    const user = await withStoreRead((store) =>
      store.users.find(
        (u) =>
          u.email.toLowerCase() === rawLogin ||
          (u.username && u.username.toLowerCase() === rawLogin) ||
          u.fullName.toLowerCase() === rawLogin
      )
    );
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      res.status(401).json({ error: 'Identifiants invalides.' });
      return;
    }
    const token = signSessionToken(user.id, user.role);
    setSessionCookie(res, token);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        favorites: user.favorites,
      },
    });
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  // Account routes
  app.post('/api/account/favorites', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { favorites } = req.body as { favorites?: string[] };
    if (!Array.isArray(favorites)) {
      res.status(400).json({ error: 'Format favoris invalide.' });
      return;
    }
    const updated = await withStoreTransaction((store) => {
      const user = store.users.find((u) => u.id === req.authUser!.id);
      if (!user) throw new StoreBusinessError('Utilisateur introuvable', 404);
      user.favorites = Array.from(new Set(favorites.filter((x) => typeof x === 'string'))).slice(0, 100);
      return user.favorites;
    });
    res.json({ favorites: updated });
  });

  app.get('/api/account/orders', requireAuth, async (req: AuthenticatedRequest, res) => {
    const orders = await withStoreRead((store) =>
      store.orders.filter(
        (o) =>
          o.userId === req.authUser!.id ||
          (req.authUser!.email && o.customerEmail?.toLowerCase() === req.authUser!.email.toLowerCase())
      )
    );
    res.json({ orders });
  });

  app.post('/api/account/data-request', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { kind } = req.body as { kind?: 'export' | 'delete' };
    if (kind === 'export') {
      const data = await withStoreRead((store) => ({
        profile: {
          email: req.authUser!.email,
          fullName: req.authUser!.fullName,
          phone: req.authUser!.phone,
          role: req.authUser!.role,
          createdAt: req.authUser!.createdAt,
        },
        orders: store.orders.filter((o) => o.userId === req.authUser!.id),
      }));
      res.json({ exported: data });
      return;
    }
    if (kind === 'delete') {
      if (isStaffRole(req.authUser!.role)) {
        res.status(400).json({ error: 'Un compte personnel administrateur doit être révoqué par un autre administrateur.' });
        return;
      }
      await withStoreTransaction((store) => {
        store.users = store.users.filter((u) => u.id !== req.authUser!.id);
        // Anonymize PII on past orders while preserving financial/lot traceability
        for (const o of store.orders) {
          if (o.userId === req.authUser!.id) {
            o.userId = null;
            o.customerName = 'Client anonymisé';
            o.customerEmail = undefined;
            o.address = undefined;
            o.landmark = undefined;
          }
        }
      });
      clearSessionCookie(res);
      res.json({ deleted: true });
      return;
    }
    res.status(400).json({ error: 'Type de demande invalide.' });
  });

  // Promo code server validation
  app.post('/api/promo/validate', async (req, res) => {
    const { code, subtotalXaf } = req.body as { code?: string; subtotalXaf?: number };
    if (!code || typeof subtotalXaf !== 'number') {
      res.status(400).json({ error: 'Code ou montant invalide.' });
      return;
    }
    const result = await withStoreRead((store) => {
      const found = store.promoCodes.find((p) => p.code.toUpperCase() === code.trim().toUpperCase() && p.active);
      if (!found) return { valid: false, error: 'Code promotionnel introuvable ou inactif.' };
      if (subtotalXaf < found.minSubtotalXaf) {
        return { valid: false, error: `Minimum requis : ${found.minSubtotalXaf} XAF.` };
      }
      return {
        valid: true,
        code: found.code,
        discountPercent: found.discountPercent,
        discountXaf: Math.round((subtotalXaf * found.discountPercent) / 100),
        description: found.description,
        isDemo: found.isDemo,
      };
    });
    if (!result.valid) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  });

  // Create order (guest allowed, idempotent, server-side totals & reservation)
  app.post('/api/orders', async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body as {
        idempotencyKey?: string;
        customerName?: string;
        customerPhone?: string;
        customerEmail?: string;
        city?: string;
        neighborhood?: string;
        receptionMode?: 'delivery' | 'pickup';
        address?: string;
        landmark?: string;
        instructions?: string;
        deliveryZoneId?: string;
        promoCode?: string;
        paymentMethod?: PaymentMethod;
        items?: Array<{ variantId: string; quantity: number }>;
      };
      if (!body.idempotencyKey || body.idempotencyKey.length < 8) {
        res.status(400).json({ error: 'Clé d’idempotence manquante.' });
        return;
      }

      const result = await withStoreTransaction((store) =>
        createOrderInTransaction(store, {
          idempotencyKey: body.idempotencyKey!,
          userId: req.authUser?.id || null,
          customerName: body.customerName || '',
          customerPhone: body.customerPhone || '',
          customerEmail: body.customerEmail,
          city: body.city || '',
          neighborhood: body.neighborhood || '',
          receptionMode: body.receptionMode === 'pickup' ? 'pickup' : 'delivery',
          address: body.address,
          landmark: body.landmark,
          instructions: body.instructions,
          deliveryZoneId: body.deliveryZoneId || '',
          promoCode: body.promoCode,
          paymentMethod: body.paymentMethod || 'cash_on_delivery_or_pickup',
          items: Array.isArray(body.items) ? body.items : [],
        })
      );

      res.status(result.duplicate ? 200 : 201).json({
        order: result.order,
        duplicate: result.duplicate,
      });
    } catch (err) {
      if (err instanceof StoreBusinessError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Erreur lors de l’enregistrement de la commande.' });
    }
  });

  // Protected order lookup: requires matching phone OR owning user OR staff
  app.get('/api/orders/:reference', async (req: AuthenticatedRequest, res) => {
    const reference = req.params.reference.trim().toUpperCase();
    const phoneParam = typeof req.query.phone === 'string' ? normalizePhone(req.query.phone) : '';
    const order = await withStoreRead((store) => store.orders.find((o) => o.reference === reference));
    if (!order) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }
    const isStaff = req.authUser && isStaffRole(req.authUser.role);
    const isOwner = req.authUser && order.userId && order.userId === req.authUser.id;
    const phoneMatches = phoneParam.length >= 6 && normalizePhone(order.customerPhone).endsWith(phoneParam.slice(-8));
    if (!isStaff && !isOwner && !phoneMatches) {
      res.status(403).json({
        error: 'Vérification requise : saisissez le numéro de téléphone utilisé lors de la commande ou connectez-vous.',
        verificationRequired: true,
      });
      return;
    }
    res.json({ order });
  });

  // Verified Online Payment Webhook (idempotent, HMAC-verified)
  app.post('/api/payments/webhook', async (req, res) => {
    const webhookSecret = process.env.ONLINE_PAYMENT_WEBHOOK_SECRET;
    if (!webhookSecret) {
      res.status(503).json({ error: 'Aucun prestataire de paiement en ligne configuré.' });
      return;
    }
    const sig = req.headers['x-emaus-signature'];
    const rawPayload = JSON.stringify(req.body);
    const expected = crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');
    if (typeof sig !== 'string' || sig !== expected) {
      res.status(401).json({ error: 'Signature webhook invalide.' });
      return;
    }
    const { reference, event, amountXaf } = req.body as {
      reference?: string;
      event?: 'payment.succeeded' | 'payment.failed' | 'payment.refunded';
      amountXaf?: number;
    };
    if (!reference || !event) {
      res.status(400).json({ error: 'Payload webhook incomplet.' });
      return;
    }
    try {
      const order = await withStoreTransaction((store) => {
        const found = store.orders.find((o) => o.reference === reference);
        if (!found) throw new StoreBusinessError('Commande introuvable', 404);
        const nowIso = new Date().toISOString();

        if (event === 'payment.succeeded') {
          if (found.paymentStatus === 'paid') return found; // idempotent
          if (found.estimatedTotalXaf === null || amountXaf !== found.estimatedTotalXaf) {
            throw new StoreBusinessError('Montant webhook non conforme au montant serveur.', 400);
          }
          found.paymentStatus = 'paid';
          if (found.status === 'registered') found.status = 'accepted';
          found.reservationExpiresAt = null;
          found.updatedAt = nowIso;
          found.statusHistory.push({
            status: found.status,
            paymentStatus: 'paid',
            note: 'Paiement confirmé par webhook vérifié',
            actor: 'webhook:payment',
            at: nowIso,
          });
        } else if (event === 'payment.failed') {
          if (found.paymentStatus === 'failed') return found;
          found.paymentStatus = 'failed';
          found.status = 'cancelled';
          found.updatedAt = nowIso;
          releaseOrderReservation(store, found, 'webhook:payment', 'Échec de paiement confirmé par webhook');
          found.statusHistory.push({
            status: 'cancelled',
            paymentStatus: 'failed',
            note: 'Paiement échoué — réservation libérée',
            actor: 'webhook:payment',
            at: nowIso,
          });
        } else if (event === 'payment.refunded') {
          found.paymentStatus = 'refunded';
          found.updatedAt = nowIso;
          found.statusHistory.push({
            status: found.status,
            paymentStatus: 'refunded',
            note: 'Remboursement tracé via webhook',
            actor: 'webhook:payment',
            at: nowIso,
          });
        }
        return found;
      });
      res.json({ ok: true, reference: order.reference, paymentStatus: order.paymentStatus });
    } catch (err) {
      if (err instanceof StoreBusinessError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Erreur webhook.' });
    }
  });

  // Reviews (authentic + verifiedPurchase computed server-side)
  app.post('/api/reviews', async (req: AuthenticatedRequest, res) => {
    const { productSlug, authorName, rating, comment, orderReference, consentGiven } = req.body as {
      productSlug?: string;
      authorName?: string;
      rating?: number;
      comment?: string;
      orderReference?: string;
      consentGiven?: boolean;
    };
    if (!productSlug || !authorName?.trim() || !comment?.trim() || !consentGiven) {
      res.status(400).json({ error: 'Nom, avis, produit et consentement de publication requis.' });
      return;
    }
    const cleanRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
    try {
      const review = await withStoreTransaction((store) => {
        const product = store.products.find((p) => p.slug === productSlug && p.status === 'published');
        if (!product) throw new StoreBusinessError('Produit introuvable.', 404);

        let verifiedPurchase = false;
        if (orderReference) {
          const order = store.orders.find((o) => o.reference === orderReference.trim().toUpperCase());
          if (
            order &&
            (order.status === 'delivered' || order.paymentStatus === 'paid') &&
            order.items.some((i) => i.productSlug === productSlug)
          ) {
            verifiedPurchase = true;
          }
        }

        const item = {
          id: `rev-${crypto.randomUUID()}`,
          productSlug,
          authorName: authorName.trim().slice(0, 80),
          userId: req.authUser?.id || null,
          rating: cleanRating,
          comment: comment.trim().slice(0, 1200),
          verifiedPurchase,
          orderReference: verifiedPurchase ? orderReference?.trim().toUpperCase() : undefined,
          status: 'pending' as const,
          consentGiven: true,
          createdAt: new Date().toISOString(),
        };
        store.reviews.unshift(item);
        return item;
      });
      res.status(201).json({ review });
    } catch (err) {
      if (err instanceof StoreBusinessError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Impossible d’enregistrer l’avis.' });
    }
  });

  // Public Community WhatsApp Join
  app.post('/api/community/join', async (req, res) => {
    const { phone } = req.body as { phone?: string };
    const cleanPhone = normalizePhone(phone || '');
    if (cleanPhone.replace(/\D/g, '').length < 6) {
      res.status(400).json({ error: 'Veuillez saisir un numéro de téléphone valide.' });
      return;
    }
    await withStoreTransaction((store) => {
      const exists = store.communityMembers.some((m) => normalizePhone(m.phone) === cleanPhone);
      if (!exists) {
        store.communityMembers.unshift({
          id: `comm-${crypto.randomUUID()}`,
          phone: cleanPhone,
          joinedAt: new Date().toISOString(),
        });
      }
    });
    res.status(201).json({ joined: true, redirectUrl: WHATSAPP_COMMUNITY_LINK });
  });

  // Public Visitor Testimonials with optional image uploads (immediately visible to all visitors)
  app.post('/api/testimonials', async (req, res) => {
    const { authorName, city, productName, rating, comment, images, consentGiven } = req.body as {
      authorName?: string;
      city?: string;
      productName?: string;
      rating?: number;
      comment?: string;
      images?: Array<{ dataUrl?: string; alt?: string }>;
      consentGiven?: boolean;
    };

    if (!authorName?.trim() || !comment?.trim() || !consentGiven) {
      res.status(400).json({ error: 'Votre nom, votre témoignage et votre consentement de publication sont requis.' });
      return;
    }

    const cleanRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
    const incomingImages = Array.isArray(images) ? images.slice(0, 3) : [];
    const savedImages: Array<{ id: string; url: string; alt?: string; uploadedAt: string }> = [];

    try {
      if (!fs.existsSync(TESTIMONIAL_UPLOADS_DIR)) {
        fs.mkdirSync(TESTIMONIAL_UPLOADS_DIR, { recursive: true });
      }
      for (const item of incomingImages) {
        const dataUrl = typeof item?.dataUrl === 'string' ? item.dataUrl : '';
        const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/i);
        if (!match) {
          throw new StoreBusinessError('Format d’image non pris en charge (PNG, JPG ou WebP uniquement).', 400);
        }
        const rawExt = match[1].toLowerCase();
        const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
        const buf = Buffer.from(match[2], 'base64');
        if (buf.length > 4 * 1024 * 1024) {
          throw new StoreBusinessError('Chaque image ne doit pas dépasser 4 Mo.', 400);
        }
        const imgId = `img-${crypto.randomUUID()}`;
        const fileName = `${imgId}.${ext}`;
        fs.writeFileSync(path.join(TESTIMONIAL_UPLOADS_DIR, fileName), buf);
        savedImages.push({
          id: imgId,
          url: `/uploads/testimonials/${fileName}`,
          alt: item.alt?.trim().slice(0, 120) || undefined,
          uploadedAt: new Date().toISOString(),
        });
      }

      const testimonial = await withStoreTransaction((store) => {
        const created = {
          id: `testi-${crypto.randomUUID()}`,
          authorName: authorName.trim().slice(0, 80),
          city: city?.trim().slice(0, 60) || undefined,
          productName: productName?.trim().slice(0, 100) || undefined,
          rating: cleanRating,
          comment: comment.trim().slice(0, 1200),
          images: savedImages,
          createdAt: new Date().toISOString(),
        };
        store.testimonials.unshift(created);
        return created;
      });

      res.status(201).json({ testimonial });
    } catch (err) {
      for (const saved of savedImages) {
        safeDeleteUploadFile(saved.url);
      }
      if (err instanceof StoreBusinessError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Impossible d’enregistrer le témoignage.' });
    }
  });

  // Public Appointment Booking -> formats WhatsApp payload & redirects to store WhatsApp number
  app.post('/api/appointments', async (req, res) => {
    const { fullName, phone, serviceType, channel, preferredDate, preferredTime, notes } = req.body as {
      fullName?: string;
      phone?: string;
      serviceType?: string;
      channel?: 'boutique' | 'whatsapp_call';
      preferredDate?: string;
      preferredTime?: string;
      notes?: string;
    };

    if (!fullName?.trim() || !phone?.trim() || !serviceType?.trim() || !preferredDate?.trim() || !preferredTime?.trim()) {
      res.status(400).json({ error: 'Nom, téléphone, objet, date et créneau horaire sont requis.' });
      return;
    }

    const result = await withStoreTransaction((store) => {
      const created = {
        id: `rdv-${crypto.randomUUID()}`,
        fullName: fullName.trim().slice(0, 100),
        phone: phone.trim().slice(0, 40),
        serviceType: serviceType.trim().slice(0, 120),
        channel: channel === 'whatsapp_call' ? ('whatsapp_call' as const) : ('boutique' as const),
        preferredDate: preferredDate.trim().slice(0, 30),
        preferredTime: preferredTime.trim().slice(0, 40),
        notes: notes?.trim().slice(0, 800) || undefined,
        createdAt: new Date().toISOString(),
      };
      store.appointments.unshift(created);

      const waDigits = (store.settings.whatsappPhone || store.settings.primaryPhone || '+237697705069').replace(/\D/g, '');
      const channelLabel =
        created.channel === 'whatsapp_call'
          ? 'Appel / Visio WhatsApp'
          : `En boutique (${store.settings.headquartersAddress})`;
      const messageLines = [
        `Bonjour Emaüs Skin Care, je souhaite prendre rendez-vous :`,
        `• Nom : ${created.fullName}`,
        `• Téléphone : ${created.phone}`,
        `• Objet : ${created.serviceType}`,
        `• Format : ${channelLabel}`,
        `• Date souhaitée : ${created.preferredDate}`,
        `• Créneau horaire : ${created.preferredTime}`,
        created.notes ? `• Précisions : ${created.notes}` : null,
      ].filter(Boolean);

      const whatsappUrl = `https://wa.me/${waDigits}?text=${encodeURIComponent(messageLines.join('\n'))}`;
      return { appointment: created, whatsappUrl };
    });

    res.status(201).json(result);
  });

  // Returns / Claims
  app.post('/api/returns', async (req, res) => {
    const { orderReference, customerPhone, kind, reason, openedOrSuspect, sku, lotCode, quantity } = req.body as {
      orderReference?: string;
      customerPhone?: string;
      kind?: 'return' | 'claim';
      reason?: string;
      openedOrSuspect?: boolean;
      sku?: string;
      lotCode?: string;
      quantity?: number;
    };
    if (!orderReference || !customerPhone || !reason?.trim()) {
      res.status(400).json({ error: 'Référence, téléphone et motif sont requis.' });
      return;
    }
    const created = await withStoreTransaction((store) => {
      const item = {
        id: `ret-${crypto.randomUUID()}`,
        orderReference: orderReference.trim().toUpperCase(),
        customerPhone: customerPhone.trim(),
        kind: kind === 'claim' ? ('claim' as const) : ('return' as const),
        reason: reason.trim().slice(0, 1000),
        openedOrSuspect: Boolean(openedOrSuspect),
        sku: sku?.trim() || undefined,
        lotCode: lotCode?.trim() || undefined,
        quantity: quantity ? Math.max(1, Math.floor(Number(quantity))) : 1,
        status: 'open' as const,
        createdAt: new Date().toISOString(),
      };
      store.returnsClaims.unshift(item);
      return item;
    });
    res.status(201).json({ item: created });
  });

  // Reseller inquiries
  app.post('/api/resellers', async (req, res) => {
    const { fullName, companyName, city, phone, email, activityType, estimatedMonthlyVolume, message } = req.body as {
      fullName?: string;
      companyName?: string;
      city?: string;
      phone?: string;
      email?: string;
      activityType?: string;
      estimatedMonthlyVolume?: string;
      message?: string;
    };
    if (!fullName || !companyName || !city || !phone || !email || !activityType || !estimatedMonthlyVolume) {
      res.status(400).json({ error: 'Veuillez renseigner tous les champs obligatoires.' });
      return;
    }
    const item = await withStoreTransaction((store) => {
      const created = {
        id: `b2b-${crypto.randomUUID()}`,
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        city: city.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        activityType: activityType.trim(),
        estimatedMonthlyVolume: estimatedMonthlyVolume.trim(),
        message: message?.trim() || undefined,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };
      store.resellerInquiries.unshift(created);
      return created;
    });
    res.status(201).json({ inquiry: item });
  });

  // Newsletter (explicit consent required, unsubscribe available)
  app.post('/api/newsletter', async (req, res) => {
    const { email, consentMarketing } = req.body as { email?: string; consentMarketing?: boolean };
    if (!email || !email.includes('@') || !consentMarketing) {
      res.status(400).json({ error: 'Adresse e-mail valide et consentement explicite requis.' });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    await withStoreTransaction((store) => {
      const existing = store.newsletter.find((n) => n.email === cleanEmail);
      if (existing) {
        existing.active = true;
        existing.consentMarketing = true;
      } else {
        store.newsletter.unshift({
          id: `news-${crypto.randomUUID()}`,
          email: cleanEmail,
          consentMarketing: true,
          active: true,
          subscribedAt: new Date().toISOString(),
        });
      }
    });
    res.status(201).json({ subscribed: true });
  });

  app.post('/api/newsletter/unsubscribe', async (req, res) => {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({ error: 'E-mail requis.' });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    await withStoreTransaction((store) => {
      const existing = store.newsletter.find((n) => n.email === cleanEmail);
      if (existing) existing.active = false;
    });
    res.json({ unsubscribed: true });
  });

  // Contact form
  app.post('/api/contact', async (req, res) => {
    const { name, phone, email, subject, message } = req.body as {
      name?: string;
      phone?: string;
      email?: string;
      subject?: string;
      message?: string;
    };
    if (!name?.trim() || !phone?.trim() || !message?.trim()) {
      res.status(400).json({ error: 'Nom, téléphone et message sont obligatoires.' });
      return;
    }
    await withStoreTransaction((store) => {
      store.contacts.unshift({
        id: `msg-${crypto.randomUUID()}`,
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || undefined,
        subject: subject?.trim() || 'Demande générale',
        message: message.trim().slice(0, 2000),
        status: 'new',
        createdAt: new Date().toISOString(),
      });
    });
    res.status(201).json({ sent: true });
  });

  // =========================================================================
  // ADMINISTRATION & RBAC ROUTES
  // =========================================================================

  app.get('/api/admin/overview', requireStaff(), async (_req, res) => {
    const data = await withStoreRead((store) => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const completedOrders = store.orders.filter((o) => o.status === 'delivered');
      const paidOrders = store.orders.filter((o) => o.paymentStatus === 'paid');
      const cancelledOrders = store.orders.filter((o) => o.status === 'cancelled');

      const lowStockVariants = store.products
        .filter((p) => p.status === 'published')
        .flatMap((p) =>
          p.variants
            .filter((v) => v.availableQty <= v.lowStockThreshold)
            .map((v) => ({
              productName: p.name.fr,
              sku: v.sku,
              format: v.format,
              availableQty: v.availableQty,
              threshold: v.lowStockThreshold,
            }))
        );

      const lotsToWatch = store.lots.filter((l) => {
        if (l.status === 'blocked' || l.status === 'quarantined' || l.status === 'expired') return true;
        if (!l.expiryDate) return false;
        const daysUntil = (Date.parse(l.expiryDate) - Date.parse(todayIso)) / (1000 * 60 * 60 * 24);
        return daysUntil <= 120;
      });

      return {
        kpis: {
          totalOrders: store.orders.length,
          completedSalesCount: completedOrders.length,
          completedRevenueXaf: completedOrders.reduce((s, o) => s + (o.estimatedTotalXaf ?? o.subtotalXaf), 0),
          collectedPaymentsXaf: paidOrders.reduce((s, o) => s + (o.estimatedTotalXaf ?? o.subtotalXaf), 0),
          cancelledCount: cancelledOrders.length,
          lowStockCount: lowStockVariants.length,
          lotsWatchCount: lotsToWatch.length,
        },
        lowStockVariants,
        lotsToWatch,
        products: store.products,
        lots: store.lots,
        movements: store.movements.slice(0, 200),
        auditLogs: store.auditLogs.slice(0, 200),
        orders: store.orders,
        reviews: store.reviews,
        testimonials: store.testimonials,
        communityMembers: store.communityMembers,
        appointments: store.appointments,
        returnsClaims: store.returnsClaims,
        resellerInquiries: store.resellerInquiries,
        contacts: store.contacts,
        promoCodes: store.promoCodes,
        deliveryZones: store.deliveryZones,
        settings: store.settings,
        users: store.users.map((u) => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          phone: u.phone,
          role: u.role,
          createdAt: u.createdAt,
        })),
        exportLogs: store.exportLogs,
      };
    });
    res.json(data);
  });

  // Staff role assignment (admin only)
  app.patch('/api/admin/users/:id/role', requireStaff(['admin']), async (req: AuthenticatedRequest, res) => {
    const { role } = req.body as { role?: UserRole };
    const allowed: UserRole[] = [
      'customer',
      'b2b_partner',
      'admin',
      'catalog_manager',
      'stock_manager',
      'preparer',
      'customer_service',
      'editor',
    ];
    if (!role || !allowed.includes(role)) {
      res.status(400).json({ error: 'Rôle invalide.' });
      return;
    }
    try {
      await withStoreTransaction((store) => {
        const target = store.users.find((u) => u.id === req.params.id);
        if (!target) throw new StoreBusinessError('Utilisateur introuvable', 404);
        const oldRole = target.role;
        target.role = role;
        appendAuditLog(
          store,
          req.authUser!.email,
          req.authUser!.role,
          'UPDATE_USER_ROLE',
          'user',
          target.id,
          `${target.email}: ${oldRole} -> ${role}`
        );
      });
      res.json({ ok: true });
    } catch (err) {
      if (err instanceof StoreBusinessError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Erreur mise à jour rôle.' });
    }
  });

  // Create or update product + safety validation workflow
  app.post('/api/admin/products', requireStaff(['catalog_manager', 'editor']), async (req: AuthenticatedRequest, res) => {
    const body = req.body as Partial<Product> & {
      sku?: string;
      format?: string;
      priceXaf?: number | null;
      b2bPriceXaf?: number | null;
    };
    if (!body.name?.fr || !body.slug) {
      res.status(400).json({ error: 'Nom et slug requis.' });
      return;
    }
    try {
      const product = await withStoreTransaction((store) => {
        if (store.products.some((p) => p.slug === body.slug)) {
          throw new StoreBusinessError('Ce slug produit existe déjà.', 409);
        }
        const nowIso = new Date().toISOString();
        const created: Product = {
          id: `prod-${crypto.randomUUID()}`,
          slug: body.slug!.trim().toLowerCase(),
          name: body.name!,
          range: body.range || 'Les Laboratoires Emaüs',
          category: body.category || 'visage',
          applicationZone: body.applicationZone || 'face',
          texture: body.texture || { fr: 'À renseigner', en: 'Pending' },
          skinTypes: body.skinTypes || [],
          cosmeticNeeds: body.cosmeticNeeds || [],
          status: 'draft_pending_validation',
          isDemoItem: Boolean(body.isDemoItem),
          safetyValidated: false,
          validationNotes: body.validationNotes || 'Créé en brouillon — à valider avant mise en ligne.',
          visualTheme: body.visualTheme || 'sage-botanical',
          shortSummary: body.shortSummary || { fr: 'À compléter', en: 'Pending' },
          description: body.description || { fr: 'À compléter', en: 'Pending' },
          cosmeticBenefits: body.cosmeticBenefits || { fr: 'À valider', en: 'Pending' },
          directions: body.directions || { fr: 'À renseigner', en: 'Pending' },
          inci: body.inci || 'À renseigner',
          precautions: body.precautions || { fr: 'À renseigner', en: 'Pending' },
          storage: body.storage || { fr: 'À renseigner', en: 'Pending' },
          paoMonths: body.paoMonths ?? null,
          audienceRestrictions: body.audienceRestrictions || { fr: 'À renseigner', en: 'Pending' },
          ingredientSlugs: body.ingredientSlugs || [],
          relatedSlugs: body.relatedSlugs || [],
          variants: [
            {
              id: `var-${crypto.randomUUID()}`,
              sku: body.sku || `EMS-${Date.now().toString().slice(-6)}`,
              label: { fr: body.format || 'Format à confirmer', en: body.format || 'Size pending' },
              format: body.format || 'À confirmer',
              priceXaf: body.priceXaf ?? null,
              b2bPriceXaf: body.b2bPriceXaf ?? null,
              sellable: false,
              lowStockThreshold: 5,
              physicalQty: 0,
              reservedQty: 0,
              availableQty: 0,
            },
          ],
          updatedAt: nowIso,
        };
        store.products.unshift(created);
        appendAuditLog(
          store,
          req.authUser!.email,
          req.authUser!.role,
          'CREATE_PRODUCT_DRAFT',
          'product',
          created.id,
          `Création brouillon ${created.name.fr}`
        );
        return created;
      });
      res.status(201).json({ product });
      if (isSanityConfigured()) {
        void withStoreRead((s) => pushStoreToSanity(s)).catch((e) =>
          console.warn('Sanity background push warning:', e instanceof Error ? e.message : e)
        );
      }
    } catch (err) {
      if (err instanceof StoreBusinessError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Erreur création produit.' });
    }
  });

  app.patch('/api/admin/products/:id', requireStaff(['catalog_manager', 'editor']), async (req: AuthenticatedRequest, res) => {
    try {
      const updated = await withStoreTransaction((store) => {
        const product = store.products.find((p) => p.id === req.params.id);
        if (!product) throw new StoreBusinessError('Produit introuvable', 404);
        const patch = req.body as Partial<Product> & {
          variantUpdates?: Array<{
            id: string;
            sku?: string;
            format?: string;
            priceXaf?: number | null;
            b2bPriceXaf?: number | null;
            lowStockThreshold?: number;
            sellable?: boolean;
          }>;
        };

        if (patch.name) product.name = patch.name;
        if (patch.range !== undefined) product.range = patch.range;
        if (patch.category) product.category = patch.category;
        if (patch.applicationZone) product.applicationZone = patch.applicationZone;
        if (patch.texture) product.texture = patch.texture;
        if (patch.skinTypes) product.skinTypes = patch.skinTypes;
        if (patch.cosmeticNeeds) product.cosmeticNeeds = patch.cosmeticNeeds;
        if (patch.shortSummary) product.shortSummary = patch.shortSummary;
        if (patch.description) product.description = patch.description;
        if (patch.cosmeticBenefits) product.cosmeticBenefits = patch.cosmeticBenefits;
        if (patch.directions) product.directions = patch.directions;
        if (patch.inci !== undefined) product.inci = patch.inci;
        if (patch.precautions) product.precautions = patch.precautions;
        if (patch.storage) product.storage = patch.storage;
        if (patch.paoMonths !== undefined) product.paoMonths = patch.paoMonths;
        if (patch.audienceRestrictions) product.audienceRestrictions = patch.audienceRestrictions;
        if (patch.validationNotes !== undefined) product.validationNotes = patch.validationNotes;
        if (patch.imageUrl !== undefined) product.imageUrl = patch.imageUrl.trim() || undefined;
        if (patch.isDemoItem !== undefined) product.isDemoItem = patch.isDemoItem;
        if (patch.visualTheme) product.visualTheme = patch.visualTheme;

        if (Array.isArray(patch.variantUpdates)) {
          for (const vu of patch.variantUpdates) {
            const v = product.variants.find((item) => item.id === vu.id);
            if (!v) continue;
            if (vu.sku) v.sku = vu.sku;
            if (vu.format) {
              v.format = vu.format;
              v.label = { fr: vu.format, en: vu.format };
            }
            if (vu.priceXaf !== undefined) v.priceXaf = vu.priceXaf;
            if (vu.b2bPriceXaf !== undefined) v.b2bPriceXaf = vu.b2bPriceXaf;
            if (vu.lowStockThreshold !== undefined) v.lowStockThreshold = vu.lowStockThreshold;
            if (vu.sellable !== undefined) v.sellable = vu.sellable;
          }
        }

        if (patch.status) {
          if (patch.status === 'published') {
            // Enforce mandatory safety & pricing validation before publication
            const hasValidInci = product.inci && !product.inci.toLowerCase().includes('à renseigner');
            const hasValidPrecautions =
              product.precautions.fr && !product.precautions.fr.toLowerCase().includes('à renseigner');
            const hasValidDirections =
              product.directions.fr && !product.directions.fr.toLowerCase().includes('à renseigner');
            const hasValidVariant = product.variants.some((v) => v.priceXaf !== null && v.priceXaf > 0 && v.format !== 'À confirmer');
            if (!hasValidInci || !hasValidPrecautions || !hasValidDirections || !hasValidVariant) {
              throw new StoreBusinessError(
                'Validation impossible : INCI, mode d’emploi, précautions, format et prix XAF > 0 sont obligatoires avant publication.',
                400
              );
            }
            product.safetyValidated = true;
            for (const v of product.variants) {
              if (v.priceXaf !== null && v.priceXaf > 0) v.sellable = true;
            }
          }
          product.status = patch.status;
        }

        product.updatedAt = new Date().toISOString();
        appendAuditLog(
          store,
          req.authUser!.email,
          req.authUser!.role,
          'UPDATE_PRODUCT',
          'product',
          product.id,
          `Mise à jour ${product.name.fr} (${product.status})`
        );
        return product;
      });
      res.json({ product: updated });
      if (isSanityConfigured()) {
        void withStoreRead((s) => pushStoreToSanity(s)).catch((e) =>
          console.warn('Sanity background push warning:', e instanceof Error ? e.message : e)
        );
      }
    } catch (err) {
      if (err instanceof StoreBusinessError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Erreur mise à jour produit.' });
    }
  });

  // Stock lot reception
  app.post('/api/admin/lots', requireStaff(['stock_manager']), async (req: AuthenticatedRequest, res) => {
    const { variantId, lotCode, quantity, expiryDate, notes } = req.body as {
      variantId?: string;
      lotCode?: string;
      quantity?: number;
      expiryDate?: string;
      notes?: string;
    };
    const qty = Math.floor(Number(quantity));
    if (!variantId || !lotCode?.trim() || !Number.isFinite(qty) || qty <= 0) {
      res.status(400).json({ error: 'Variante, code lot et quantité positive requis.' });
      return;
    }
    try {
      const lot = await withStoreTransaction((store) => {
        const variant = findVariant(store, variantId);
        if (!variant) throw new StoreBusinessError('Variante introuvable.', 404);
        const nowIso = new Date().toISOString();
        const created = {
          id: `lot-${crypto.randomUUID()}`,
          variantId,
          sku: variant.sku,
          lotCode: lotCode.trim().toUpperCase(),
          receivedAt: nowIso.slice(0, 10),
          expiryDate: expiryDate?.trim() || null,
          initialQty: qty,
          remainingQty: qty,
          quarantinedQty: 0,
          status: 'active' as const,
          notes: notes?.trim() || undefined,
        };
        store.lots.unshift(created);
        store.movements.unshift({
          id: `mov-${crypto.randomUUID()}`,
          variantId,
          sku: variant.sku,
          lotId: created.id,
          lotCode: created.lotCode,
          type: 'reception',
          qtyDelta: qty,
          actor: req.authUser!.email,
          reason: notes?.trim() || `Réception lot ${created.lotCode}`,
          createdAt: nowIso,
        });
        appendAuditLog(
          store,
          req.authUser!.email,
          req.authUser!.role,
          'RECEIVE_LOT',
          'lot',
          created.id,
          `Lot ${created.lotCode} (${variant.sku}) : +${qty} unités`
        );
        return created;
      });
      res.status(201).json({ lot });
    } catch (err) {
      if (err instanceof StoreBusinessError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Erreur réception lot.' });
    }
  });

  // Block / quarantine / reactivate a lot + find impacted orders
  app.patch('/api/admin/lots/:id/status', requireStaff(['stock_manager']), async (req: AuthenticatedRequest, res) => {
    const { status, reason } = req.body as { status?: 'active' | 'blocked' | 'quarantined'; reason?: string };
    if (!status || !['active', 'blocked', 'quarantined'].includes(status)) {
      res.status(400).json({ error: 'Statut de lot invalide.' });
      return;
    }
    try {
      const result = await withStoreTransaction((store) => {
        const lot = store.lots.find((l) => l.id === req.params.id);
        if (!lot) throw new StoreBusinessError('Lot introuvable.', 404);
        const prevStatus = lot.status;
        lot.status = status;
        if (status === 'quarantined' && lot.remainingQty > 0) {
          lot.quarantinedQty += lot.remainingQty;
          lot.remainingQty = 0;
        }
        const nowIso = new Date().toISOString();
        store.movements.unshift({
          id: `mov-${crypto.randomUUID()}`,
          variantId: lot.variantId,
          sku: lot.sku,
          lotId: lot.id,
          lotCode: lot.lotCode,
          type: 'lot_block',
          qtyDelta: 0,
          actor: req.authUser!.email,
          reason: reason?.trim() || `Changement statut lot : ${prevStatus} -> ${status}`,
          createdAt: nowIso,
        });
        appendAuditLog(
          store,
          req.authUser!.email,
          req.authUser!.role,
          'LOT_STATUS_CHANGE',
          'lot',
          lot.id,
          `Lot ${lot.lotCode}: ${prevStatus} -> ${status} (${reason || 'aucun motif'})`
        );
        const impactedOrders = store.orders
          .filter((o) => o.items.some((i) => i.assignedLots.some((al) => al.lotId === lot.id || al.lotCode === lot.lotCode)))
          .map((o) => ({
            reference: o.reference,
            customerName: o.customerName,
            customerPhone: o.customerPhone,
            status: o.status,
            createdAt: o.createdAt,
          }));
        return { lot, impactedOrders };
      });
      res.json(result);
    } catch (err) {
      if (err instanceof StoreBusinessError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Erreur statut lot.' });
    }
  });

  // Manual stock movement (breakage, loss, correction, quarantine)
  app.post('/api/admin/stock/adjust', requireStaff(['stock_manager']), async (req: AuthenticatedRequest, res) => {
    const { lotId, type, qtyDelta, reason } = req.body as {
      lotId?: string;
      type?: 'breakage' | 'loss' | 'quarantine' | 'correction';
      qtyDelta?: number;
      reason?: string;
    };
    const delta = Math.trunc(Number(qtyDelta));
    if (!lotId || !type || !Number.isFinite(delta) || delta === 0 || !reason?.trim()) {
      res.status(400).json({ error: 'Lot, type de mouvement, quantité non nulle et motif obligatoires.' });
      return;
    }
    try {
      await withStoreTransaction((store) => {
        const lot = store.lots.find((l) => l.id === lotId);
        if (!lot) throw new StoreBusinessError('Lot introuvable.', 404);
        const nextQty = lot.remainingQty + delta;
        if (nextQty < 0) {
          throw new StoreBusinessError('La quantité restante d’un lot ne peut pas être négative.', 400);
        }
        lot.remainingQty = nextQty;
        if (type === 'quarantine' && delta < 0) {
          lot.quarantinedQty += Math.abs(delta);
        }
        store.movements.unshift({
          id: `mov-${crypto.randomUUID()}`,
          variantId: lot.variantId,
          sku: lot.sku,
          lotId: lot.id,
          lotCode: lot.lotCode,
          type: type === 'quarantine' ? 'return_quarantine' : type,
          qtyDelta: delta,
          actor: req.authUser!.email,
          reason: reason.trim(),
          createdAt: new Date().toISOString(),
        });
        appendAuditLog(
          store,
          req.authUser!.email,
          req.authUser!.role,
          'STOCK_ADJUSTMENT',
          'lot',
          lot.id,
          `${type} (${delta}) sur ${lot.lotCode}: ${reason.trim()}`
        );
      });
      res.json({ ok: true });
    } catch (err) {
      if (err instanceof StoreBusinessError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Erreur ajustement stock.' });
    }
  });

  // Order status & payment update (with atomic FIFO lot deduction)
  app.patch('/api/admin/orders/:id', requireStaff(['preparer', 'customer_service', 'stock_manager']), async (req: AuthenticatedRequest, res) => {
    const { status, paymentStatus, note, deliveryFeeXaf } = req.body as {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      note?: string;
      deliveryFeeXaf?: number;
    };
    try {
      const order = await withStoreTransaction((store) => {
        const found = store.orders.find((o) => o.id === req.params.id);
        if (!found) throw new StoreBusinessError('Commande introuvable.', 404);
        const nowIso = new Date().toISOString();

        if (typeof deliveryFeeXaf === 'number' && deliveryFeeXaf >= 0) {
          found.deliveryFeeXaf = Math.round(deliveryFeeXaf);
          found.feeKnown = true;
          found.estimatedTotalXaf = Math.max(0, found.subtotalXaf - found.discountXaf + found.deliveryFeeXaf);
        }

        if (status) {
          if (status === 'cancelled' && found.status !== 'cancelled') {
            releaseOrderReservation(store, found, req.authUser!.email, note || `Annulation commande ${found.reference}`);
          } else if (['preparing', 'shipped', 'delivered'].includes(status) && !found.stockDeducted) {
            deductOrderStockOnce(store, found, req.authUser!.email);
          }
          found.status = status;
        }
        if (paymentStatus) {
          found.paymentStatus = paymentStatus;
        }
        found.updatedAt = nowIso;
        found.statusHistory.push({
          status: found.status,
          paymentStatus: found.paymentStatus,
          note: note?.trim() || `Mise à jour statut par ${req.authUser!.email}`,
          actor: req.authUser!.email,
          at: nowIso,
        });
        appendAuditLog(
          store,
          req.authUser!.email,
          req.authUser!.role,
          'UPDATE_ORDER',
          'order',
          found.id,
          `${found.reference} -> ${found.status} / ${found.paymentStatus}`
        );
        return found;
      });
      res.json({ order });
    } catch (err) {
      if (err instanceof StoreBusinessError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Erreur mise à jour commande.' });
    }
  });

  // Returns & Claims resolution (opened/suspect NEVER auto-return to sellable stock)
  app.patch('/api/admin/returns/:id', requireStaff(['customer_service', 'stock_manager']), async (req: AuthenticatedRequest, res) => {
    const { status, resolutionNote } = req.body as {
      status?: 'investigating' | 'resolved_quarantined' | 'rejected';
      resolutionNote?: string;
    };
    if (!status) {
      res.status(400).json({ error: 'Statut requis.' });
      return;
    }
    try {
      const updated = await withStoreTransaction((store) => {
        const item = store.returnsClaims.find((r) => r.id === req.params.id);
        if (!item) throw new StoreBusinessError('Demande introuvable.', 404);
        item.status = status;
        item.resolutionNote = resolutionNote?.trim() || undefined;
        if (status === 'resolved_quarantined' && item.sku) {
          const lot =
            (item.lotCode && store.lots.find((l) => l.lotCode === item.lotCode)) ||
            store.lots.find((l) => l.sku === item.sku);
          if (lot) {
            const qty = item.quantity || 1;
            lot.quarantinedQty += qty;
            store.movements.unshift({
              id: `mov-${crypto.randomUUID()}`,
              variantId: lot.variantId,
              sku: lot.sku,
              lotId: lot.id,
              lotCode: lot.lotCode,
              type: 'return_quarantine',
              qtyDelta: 0,
              actor: req.authUser!.email,
              reference: item.orderReference,
              reason: `Retour mis en quarantaine (non vendable) : ${item.reason}`,
              createdAt: new Date().toISOString(),
            });
          }
        }
        appendAuditLog(
          store,
          req.authUser!.email,
          req.authUser!.role,
          'RESOLVE_RETURN_CLAIM',
          'return_claim',
          item.id,
          `${item.orderReference} -> ${status}`
        );
        return item;
      });
      res.json({ item: updated });
    } catch (err) {
      if (err instanceof StoreBusinessError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Erreur traitement réclamation.' });
    }
  });

  // Reviews moderation
  app.patch('/api/admin/reviews/:id', requireStaff(['customer_service', 'editor']), async (req: AuthenticatedRequest, res) => {
    const { status, moderationReason } = req.body as { status?: 'approved' | 'rejected'; moderationReason?: string };
    if (!status || (status === 'rejected' && !moderationReason?.trim())) {
      res.status(400).json({ error: 'Un motif conforme aux règles de modération publiques est obligatoire pour rejeter un avis.' });
      return;
    }
    try {
      await withStoreTransaction((store) => {
        const rev = store.reviews.find((r) => r.id === req.params.id);
        if (!rev) throw new StoreBusinessError('Avis introuvable.', 404);
        rev.status = status;
        rev.moderationReason = moderationReason?.trim();
        appendAuditLog(
          store,
          req.authUser!.email,
          req.authUser!.role,
          'MODERATE_REVIEW',
          'review',
          rev.id,
          `${rev.productSlug} -> ${status}`
        );
      });
      res.json({ ok: true });
    } catch (err) {
      if (err instanceof StoreBusinessError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Erreur modération.' });
    }
  });

  // Owner: delete an uploaded image from a visitor testimonial
  app.delete(
    '/api/admin/testimonials/:id/images/:imageId',
    requireStaff(['customer_service', 'editor']),
    async (req: AuthenticatedRequest, res) => {
      try {
        await withStoreTransaction((store) => {
          const testi = store.testimonials.find((t) => t.id === req.params.id);
          if (!testi) throw new StoreBusinessError('Témoignage introuvable.', 404);
          const targetImg = testi.images.find((img) => img.id === req.params.imageId);
          if (!targetImg) throw new StoreBusinessError('Image introuvable.', 404);
          safeDeleteUploadFile(targetImg.url);
          testi.images = testi.images.filter((img) => img.id !== req.params.imageId);
          appendAuditLog(
            store,
            req.authUser!.email,
            req.authUser!.role,
            'DELETE_TESTIMONIAL_IMAGE',
            'testimonial',
            testi.id,
            `Suppression image ${targetImg.id} du témoignage de ${testi.authorName}`
          );
        });
        res.json({ ok: true });
      } catch (err) {
        if (err instanceof StoreBusinessError) {
          res.status(err.statusCode).json({ error: err.message });
          return;
        }
        res.status(500).json({ error: 'Erreur suppression image.' });
      }
    }
  );

  // Owner: delete an entire visitor testimonial (and its uploaded files)
  app.delete(
    '/api/admin/testimonials/:id',
    requireStaff(['customer_service', 'editor']),
    async (req: AuthenticatedRequest, res) => {
      try {
        await withStoreTransaction((store) => {
          const testi = store.testimonials.find((t) => t.id === req.params.id);
          if (!testi) throw new StoreBusinessError('Témoignage introuvable.', 404);
          for (const img of testi.images) {
            safeDeleteUploadFile(img.url);
          }
          store.testimonials = store.testimonials.filter((t) => t.id !== req.params.id);
          appendAuditLog(
            store,
            req.authUser!.email,
            req.authUser!.role,
            'DELETE_TESTIMONIAL',
            'testimonial',
            req.params.id,
            `Suppression témoignage de ${testi.authorName}`
          );
        });
        res.json({ ok: true });
      } catch (err) {
        if (err instanceof StoreBusinessError) {
          res.status(err.statusCode).json({ error: err.message });
          return;
        }
        res.status(500).json({ error: 'Erreur suppression témoignage.' });
      }
    }
  );

  // Reseller B2B approval
  app.patch('/api/admin/resellers/:id', requireStaff(['customer_service']), async (req: AuthenticatedRequest, res) => {
    const { status } = req.body as { status?: 'approved' | 'declined' };
    if (!status || !['approved', 'declined'].includes(status)) {
      res.status(400).json({ error: 'Statut invalide.' });
      return;
    }
    try {
      await withStoreTransaction((store) => {
        const inq = store.resellerInquiries.find((r) => r.id === req.params.id);
        if (!inq) throw new StoreBusinessError('Demande introuvable.', 404);
        inq.status = status;
        if (status === 'approved') {
          const matchingUser = store.users.find((u) => u.email === inq.email && u.role === 'customer');
          if (matchingUser) {
            matchingUser.role = 'b2b_partner';
          }
        }
        appendAuditLog(
          store,
          req.authUser!.email,
          req.authUser!.role,
          'UPDATE_RESELLER_INQUIRY',
          'reseller',
          inq.id,
          `${inq.companyName} -> ${status}`
        );
      });
      res.json({ ok: true });
    } catch (err) {
      if (err instanceof StoreBusinessError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Erreur mise à jour revendeur.' });
    }
  });

  // CMS & Settings update
  app.patch('/api/admin/settings', requireStaff(['editor']), async (req: AuthenticatedRequest, res) => {
    const patch = req.body as Partial<StoreSchema['settings']> & {
      deliveryZones?: StoreSchema['deliveryZones'];
      promoCodes?: StoreSchema['promoCodes'];
    };
    const settings = await withStoreTransaction((store) => {
      if (patch.brandName !== undefined) store.settings.brandName = patch.brandName;
      if (patch.legalEntityName !== undefined) store.settings.legalEntityName = patch.legalEntityName;
      if (patch.heroLabel) store.settings.heroLabel = patch.heroLabel;
      if (patch.heroTitle) store.settings.heroTitle = patch.heroTitle;
      if (patch.heroSubtitle) store.settings.heroSubtitle = patch.heroSubtitle;
      if (patch.signature) store.settings.signature = patch.signature;
      if (patch.signaturePendingValidation !== undefined) {
        store.settings.signaturePendingValidation = patch.signaturePendingValidation;
      }
      if (patch.primaryPhone !== undefined) store.settings.primaryPhone = patch.primaryPhone;
      if (patch.secondaryPhone !== undefined) store.settings.secondaryPhone = patch.secondaryPhone;
      if (patch.whatsappPhone !== undefined) store.settings.whatsappPhone = patch.whatsappPhone;
      if (patch.whatsappConfirmed !== undefined) store.settings.whatsappConfirmed = patch.whatsappConfirmed;
      if (patch.headquartersAddress !== undefined) store.settings.headquartersAddress = patch.headquartersAddress;
      if (patch.headquartersPendingConfirmation !== undefined) {
        store.settings.headquartersPendingConfirmation = patch.headquartersPendingConfirmation;
      }
      if (patch.demoModeBannerEnabled !== undefined) {
        store.settings.demoModeBannerEnabled = patch.demoModeBannerEnabled;
      }
      if (patch.cashOnDeliveryEnabled !== undefined) {
        store.settings.cashOnDeliveryEnabled = patch.cashOnDeliveryEnabled;
      }
      if (patch.deliveryZones && Array.isArray(patch.deliveryZones)) {
        store.deliveryZones = patch.deliveryZones;
      }
      if (patch.promoCodes && Array.isArray(patch.promoCodes)) {
        store.promoCodes = patch.promoCodes;
      }
      appendAuditLog(store, req.authUser!.email, req.authUser!.role, 'UPDATE_SETTINGS', 'settings', 'global', 'Mise à jour CMS et paramètres boutique');
      return store.settings;
    });
    res.json({ settings });
    if (isSanityConfigured()) {
      void withStoreRead((s) => pushStoreToSanity(s)).catch((e) =>
        console.warn('Sanity background push warning:', e instanceof Error ? e.message : e)
      );
    }
  });

  // Sanity CMS status & bidirectional synchronization
  app.get('/api/admin/sanity/status', requireStaff(['editor']), async (_req, res) => {
    const info = getSanityPublicInfo();
    const documentCount = info.configured ? await countSanityDocuments().catch(() => null) : 0;
    res.json({ ...info, documentCount });
  });

  app.post('/api/admin/sanity/sync', requireStaff(['editor']), async (req: AuthenticatedRequest, res) => {
    try {
      const result = await withStoreTransaction(async (store) => {
        const synced = await syncBidirectionalWithSanity(store);
        appendAuditLog(
          store,
          req.authUser!.email,
          req.authUser!.role,
          'SANITY_SYNC',
          'cms',
          'sanity',
          `Sync complète (${synced.pulledUpdates} import(s), ${synced.pushedTotal} document(s) synchronisé(s))`
        );
        return synced;
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur de synchronisation Sanity.' });
    }
  });

  app.post('/api/admin/sanity/push', requireStaff(['editor']), async (req: AuthenticatedRequest, res) => {
    try {
      const store = await withStoreRead((s) => s);
      const result = await pushStoreToSanity(store);
      await withStoreTransaction((s) => {
        appendAuditLog(
          s,
          req.authUser!.email,
          req.authUser!.role,
          'SANITY_PUSH',
          'cms',
          'sanity',
          `${result.count} document(s) poussé(s) vers Sanity (${result.transactionId || 'ok'})`
        );
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur de synchronisation Sanity.' });
    }
  });

  app.post('/api/admin/sanity/pull', requireStaff(['editor']), async (req: AuthenticatedRequest, res) => {
    try {
      const result = await withStoreTransaction(async (store) => {
        const pulled = await pullSanityIntoStore(store);
        appendAuditLog(
          store,
          req.authUser!.email,
          req.authUser!.role,
          'SANITY_PULL',
          'cms',
          'sanity',
          `${pulled.importedCount} document(s) importé(s) depuis Sanity`
        );
        return pulled;
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur d’importation Sanity.' });
    }
  });

  // Real CSV Reports export (filtered by date & status, audited)
  app.get('/api/admin/reports/orders.csv', requireStaff(), async (req: AuthenticatedRequest, res) => {
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : '';

    const csv = await withStoreTransaction((store) => {
      const filtered = store.orders.filter((o) => {
        const day = o.createdAt.slice(0, 10);
        if (from && day < from) return false;
        if (to && day > to) return false;
        if (statusFilter && o.status !== statusFilter) return false;
        return true;
      });

      const header = [
        'Reference',
        'Date',
        'Client',
        'Telephone',
        'Ville',
        'Mode_Reception',
        'Statut',
        'Statut_Paiement',
        'Sous_Total_XAF',
        'Remise_XAF',
        'Frais_Livraison_XAF',
        'Total_Estime_XAF',
        'Produits_SKU',
      ].join(',');

      const rows = filtered.map((o) =>
        [
          o.reference,
          o.createdAt,
          o.customerName,
          o.customerPhone,
          o.city,
          o.receptionMode,
          o.status,
          o.paymentStatus,
          o.subtotalXaf,
          o.discountXaf,
          o.feeKnown ? o.deliveryFeeXaf : 'A_CONFIRMER',
          o.estimatedTotalXaf !== null ? o.estimatedTotalXaf : 'A_CONFIRMER',
          o.items.map((i) => `${i.sku}x${i.quantity}`).join(' | '),
        ]
          .map(escapeCsvCell)
          .join(',')
      );

      store.exportLogs.unshift({
        id: `exp-${crypto.randomUUID()}`,
        actorEmail: req.authUser!.email,
        filterSummary: `from=${from || '*'},to=${to || '*'},status=${statusFilter || 'all'}`,
        rowCount: filtered.length,
        at: new Date().toISOString(),
      });
      appendAuditLog(
        store,
        req.authUser!.email,
        req.authUser!.role,
        'EXPORT_ORDERS_CSV',
        'report',
        'orders.csv',
        `${filtered.length} lignes exportées`
      );
      return [header, ...rows].join('\n');
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="emaus-commandes-rapport.csv"');
    res.send('\uFEFF' + csv);
  });

  // Vite dev middleware or production static build
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // Optional env-configured initial admin bootstrap & Sanity startup sync
  await withStoreTransaction(async (store) => {
    if (!store.users.some((u) => u.role === 'admin')) {
      const email = (process.env.ADMIN_EMAIL || 'admin@emausskincare.com').trim().toLowerCase();
      const username = (process.env.ADMIN_USERNAME || 'emaus.admin').trim().toLowerCase();
      const rawPass = process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8 ? process.env.ADMIN_PASSWORD : 'EmausAdmin2026!';
      const { salt, hash } = hashPassword(rawPass);
      store.users.push({
        id: `usr-${crypto.randomUUID()}`,
        email,
        username,
        fullName: 'Direction Emaüs Skin Care',
        role: 'admin',
        favorites: [],
        passwordHash: hash,
        passwordSalt: salt,
        createdAt: new Date().toISOString(),
      });
      appendAuditLog(store, email, 'admin', 'DEFAULT_SUPER_ADMIN_BOOTSTRAP', 'user', username, 'Initialisation automatique du Super Admin Emaüs');
    }

    // Remove legacy demo items if any remained and backfill generated product images where missing
    store.products = store.products.filter((p) => !p.isDemoItem && !p.id.startsWith('prod-demo-'));
    store.routines = store.routines.filter((r) => !r.isDemoItem && !r.id.startsWith('rout-demo-'));
    store.promoCodes = store.promoCodes.filter((pc) => !pc.isDemo);
    for (const product of store.products) {
      if (!product.imageUrl) {
        const seedMatch = INITIAL_PRODUCTS.find((sp) => sp.id === product.id || sp.slug === product.slug);
        if (seedMatch?.imageUrl) {
          product.imageUrl = seedMatch.imageUrl;
          product.updatedAt = new Date().toISOString();
        }
      }
    }

    if (isSanityConfigured()) {
      try {
        await syncBidirectionalWithSanity(store);
      } catch (err) {
        console.warn('Sanity initial sync warning:', err instanceof Error ? err.message : err);
      }
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Emaüs Skin Care server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
