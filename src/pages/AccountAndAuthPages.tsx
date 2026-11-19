import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useStore } from '../context/StoreContext';
import { formatXaf } from '../i18n/translations';
import type { Order } from '../types/ecommerce';
import { ProductCard } from '../components/ProductCard';
import {
  EDITORIAL_EASE,
  MotionGrid,
  MotionGridItem,
  MotionProductGrid,
  MotionSection,
} from '../components/MotionSection';

export function AuthPage() {
  const { lang, bootstrap, refreshBootstrap, navigate, searchParams, showToast } = useStore();
  const reduceMotion = useReducedMotion();
  const nextParam = searchParams.get('next') || '';
  const isOwnerAdminPortal = nextParam === '/admin';
  const setupAdminParam = searchParams.get('setup') === 'admin';
  const needsAdminBootstrap = Boolean(bootstrap?.session.needsAdminBootstrap);

  const [mode, setMode] = useState<'login' | 'register' | 'bootstrap'>(() =>
    !isOwnerAdminPortal && setupAdminParam && needsAdminBootstrap ? 'bootstrap' : 'login'
  );
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOwnerAdminPortal && mode !== 'login') {
      setMode('login');
      setError('');
    }
  }, [isOwnerAdminPortal, mode]);

  useEffect(() => {
    if (bootstrap?.session.authenticated && bootstrap.session.user) {
      const isStaff = !['customer', 'b2b_partner'].includes(bootstrap.session.user.role);
      if (nextParam === '/admin' && isStaff) {
        navigate('/admin');
      } else {
        navigate('/mon-compte');
      }
    }
  }, [bootstrap?.session.authenticated, bootstrap?.session.user, nextParam, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint =
        mode === 'bootstrap'
          ? '/api/auth/bootstrap-admin'
          : mode === 'register'
          ? '/api/auth/register'
          : '/api/auth/login';

      const payload =
        mode === 'login'
          ? { identifier, email: identifier, password }
          : mode === 'bootstrap'
          ? { email, username, fullName, password }
          : { email, username, fullName, phone, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; user?: { role: string } };
      if (!res.ok) throw new Error(data.error || 'Échec de connexion.');
      await refreshBootstrap();
      showToast(lang === 'fr' ? 'Session ouverte.' : 'Signed in.', 'success');
      if (data.user && !['customer', 'b2b_partner'].includes(data.user.role)) {
        navigate(nextParam && nextParam.startsWith('/') ? nextParam : '/admin');
      } else {
        navigate('/mon-compte');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: EDITORIAL_EASE }}
        className="border border-[var(--color-border)] bg-[var(--color-white)] p-6 shadow-[0_12px_32px_rgba(32,61,50,0.05)] sm:p-8"
      >
        {/* Hide Create account & Init Admin when opened from footer gear (/connexion?next=/admin) */}
        {!isOwnerAdminPortal && (
          <div className="flex flex-wrap gap-4 border-b border-[var(--color-border)] pb-3 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={
                mode === 'login'
                  ? 'text-[var(--color-forest)] underline underline-offset-8'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-forest)]'
              }
            >
              {lang === 'fr' ? 'Connexion' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={
                mode === 'register'
                  ? 'text-[var(--color-forest)] underline underline-offset-8'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-forest)]'
              }
            >
              {lang === 'fr' ? 'Créer un compte client' : 'Create account'}
            </button>
          </div>
        )}

        <h1
          className={`font-editorial text-3xl font-medium text-[var(--color-forest)] ${
            isOwnerAdminPortal ? '' : 'mt-5'
          }`}
        >
          {mode === 'bootstrap'
            ? lang === 'fr'
              ? 'Initialisation du compte propriétaire'
              : 'Initialize owner account'
            : mode === 'register'
            ? lang === 'fr'
              ? 'Nouveau compte client'
              : 'New customer account'
            : isOwnerAdminPortal
            ? lang === 'fr'
              ? 'Administration — Connexion'
              : 'Owner Administration Sign In'
            : lang === 'fr'
            ? 'Accès à votre espace'
            : 'Sign in'}
        </h1>

        {isOwnerAdminPortal && (
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-muted)]">
            {lang === 'fr'
              ? 'Entrez votre nom d’utilisateur (ou e-mail) et votre mot de passe pour accéder au tableau de bord.'
              : 'Enter your username (or email) and password to access the management dashboard.'}
          </p>
        )}

        {error && <p className="mt-4 border border-red-300 bg-red-50 p-3 text-xs text-red-800">{error}</p>}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-sm">
          {mode === 'login' ? (
            <div>
              <label htmlFor="auth-identifier" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                {lang === 'fr' ? 'Nom d’utilisateur ou e-mail' : 'Username or email'} *
              </label>
              <input
                id="auth-identifier"
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={lang === 'fr' ? 'nom.utilisateur ou vous@exemple.com' : 'username or email'}
                className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
              />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="auth-name" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'Nom complet' : 'Full name'} *
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                />
              </div>

              <div>
                <label htmlFor="auth-username" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  {lang === 'fr' ? 'Nom d’utilisateur' : 'Username'} {mode === 'bootstrap' ? '*' : '(optionnel)'}
                </label>
                <input
                  id="auth-username"
                  type="text"
                  required={mode === 'bootstrap'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="emaus.admin"
                  className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                />
              </div>

              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                  E-mail *
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label htmlFor="auth-phone" className="block text-xs font-medium text-[var(--color-ink-muted)]">
                    {lang === 'fr' ? 'Téléphone' : 'Phone'}
                  </label>
                  <input
                    id="auth-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label htmlFor="auth-pass" className="block text-xs font-medium text-[var(--color-ink-muted)]">
              {lang === 'fr' ? 'Mot de passe' : 'Password'} *
            </label>
            <input
              id="auth-pass"
              type="password"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'bootstrap' ? 10 : 8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 h-10 w-full border border-[var(--color-border-strong)] px-3"
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={reduceMotion ? undefined : { scale: 1.015 }}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            className="h-11 w-full rounded-full bg-[var(--color-forest)] text-xs font-medium text-white transition-colors hover:bg-[var(--color-forest-hover)] disabled:opacity-50"
          >
            {loading
              ? '…'
              : mode === 'bootstrap'
              ? lang === 'fr'
                ? 'Créer l’administrateur et accéder au tableau de bord'
                : 'Create admin & open dashboard'
              : mode === 'register'
              ? lang === 'fr'
                ? 'Créer mon compte'
                : 'Register'
              : lang === 'fr'
              ? 'Se connecter'
              : 'Sign in'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

export function AccountPage() {
  const { lang, bootstrap, navigate, refreshBootstrap, showToast } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const user = bootstrap?.session.user;

  useEffect(() => {
    if (!user) return;
    fetch('/api/account/orders', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { orders: [] }))
      .then((d: { orders: Order[] }) => setOrders(d.orders || []))
      .catch(() => {});
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-editorial text-3xl text-[var(--color-forest)]">
          {lang === 'fr' ? 'Connexion requise' : 'Sign in required'}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/connexion')}
          className="mt-5 rounded-full bg-[var(--color-forest)] px-6 py-2.5 text-xs font-medium text-white"
        >
          {lang === 'fr' ? 'Aller à la connexion' : 'Go to sign in'}
        </button>
      </div>
    );
  }

  const isStaff = !['customer', 'b2b_partner'].includes(user.role);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    await refreshBootstrap();
    navigate('/');
  };

  const handleExportData = async () => {
    const res = await fetch('/api/account/data-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ kind: 'export' }),
    });
    if (res.ok) {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.exported, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'emaus-mes-donnees.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDeleteAccount = async () => {
    const res = await fetch('/api/account/data-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ kind: 'delete' }),
    });
    const data = (await res.json()) as { error?: string; deleted?: boolean };
    if (!res.ok) {
      showToast(data.error || 'Action impossible', 'error');
      return;
    }
    await refreshBootstrap();
    showToast(lang === 'fr' ? 'Compte supprimé et données anonymisées.' : 'Account deleted.', 'success');
    navigate('/');
  };

  return (
    <MotionSection className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <h1 className="font-editorial text-4xl font-medium text-[var(--color-forest)]">{user.fullName}</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {user.username ? `@${user.username} · ` : ''}
            {user.email} · {user.role}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isStaff && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="rounded-full bg-[var(--color-forest)] px-5 py-2.5 text-xs font-medium text-white"
            >
              Administration
            </button>
          )}
          {user.role === 'b2b_partner' && (
            <button
              type="button"
              onClick={() => navigate('/professionnels')}
              className="rounded-full border border-[var(--color-border-strong)] px-5 py-2.5 text-xs font-medium text-[var(--color-forest)]"
            >
              Tarifs B2B
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-[var(--color-border-strong)] px-5 py-2.5 text-xs font-medium text-[var(--color-ink)]"
          >
            {lang === 'fr' ? 'Déconnexion' : 'Sign out'}
          </button>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
          {lang === 'fr' ? 'Historique des commandes' : 'Order history'}
        </h2>
        {orders.length === 0 ? (
          <p className="mt-4 border border-[var(--color-border)] bg-[var(--color-white)] p-6 text-sm text-[var(--color-ink-muted)]">
            {lang === 'fr' ? 'Aucune commande associée à ce compte.' : 'No orders linked to this account.'}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-4 border border-[var(--color-border)] bg-[var(--color-white)] p-5 text-sm"
              >
                <div>
                  <p className="font-mono font-semibold text-[var(--color-forest)]">{o.reference}</p>
                  <p className="tabular-nums text-xs text-[var(--color-ink-muted)]">
                    {o.createdAt.slice(0, 10)} · {o.status} · {o.paymentStatus}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="tabular-nums font-medium">
                    {o.estimatedTotalXaf !== null ? formatXaf(o.estimatedTotalXaf, lang) : formatXaf(o.subtotalXaf, lang)}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(`/commandes/${o.reference}`)}
                    className="text-xs font-medium text-[var(--color-forest)] underline"
                  >
                    {lang === 'fr' ? 'Détails' : 'View'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12 border-t border-[var(--color-border)] pt-8">
        <h2 className="font-editorial text-2xl font-medium text-[var(--color-forest)]">
          {lang === 'fr' ? 'Vos droits sur vos données' : 'Your data rights'}
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportData}
            className="rounded-full border border-[var(--color-border-strong)] bg-[var(--color-white)] px-5 py-2.5 text-xs font-medium text-[var(--color-forest)]"
          >
            {lang === 'fr' ? 'Exporter mes données (JSON)' : 'Export my data (JSON)'}
          </button>
          {!isStaff && (
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="rounded-full border border-red-300 bg-white px-5 py-2.5 text-xs font-medium text-red-700"
            >
              {lang === 'fr' ? 'Supprimer mon compte' : 'Delete my account'}
            </button>
          )}
        </div>
      </section>
    </MotionSection>
  );
}

export function FavoritesPage() {
  const { lang, bootstrap, favorites, navigate } = useStore();
  if (!bootstrap) return null;

  const favProducts = bootstrap.products.filter((p) => favorites.includes(p.slug));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="border-b border-[var(--color-border)] pb-6">
        <h1 className="font-editorial text-4xl font-medium text-[var(--color-forest)]">
          {lang === 'fr' ? 'Vos favoris' : 'Saved Favorites'}
        </h1>
      </div>

      {favProducts.length === 0 ? (
        <div className="mt-8 border border-[var(--color-border)] bg-[var(--color-white)] p-10 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">
            {lang === 'fr' ? 'Aucun soin enregistré dans vos favoris.' : 'No items saved in favorites yet.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/boutique')}
            className="mt-5 rounded-full bg-[var(--color-forest)] px-6 py-2.5 text-xs font-medium text-white"
          >
            {lang === 'fr' ? 'Découvrir la boutique' : 'Browse shop'}
          </button>
        </div>
      ) : (
        <MotionProductGrid animateOnMount className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favProducts.map((p, idx) => (
            <ProductCard key={p.id} product={p} index={idx} />
          ))}
        </MotionProductGrid>
      )}
    </div>
  );
}
