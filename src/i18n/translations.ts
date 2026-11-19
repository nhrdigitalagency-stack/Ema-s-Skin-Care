import type { CategorySlug, Language, LocalizedText } from '../types/ecommerce';

export function tLoc(val: LocalizedText | undefined, lang: Language): string {
  if (!val) return '';
  return val[lang] || val.fr || val.en || '';
}

export function formatXaf(amount: number | null | undefined, lang: Language): string {
  if (amount === null || amount === undefined) {
    return lang === 'fr' ? 'Tarif à valider' : 'Price pending validation';
  }
  return `${new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US').format(amount)} XAF`;
}

export function normalizeSearch(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export const CATEGORY_LABELS: Record<CategorySlug, LocalizedText> = {
  visage: { fr: 'Visage', en: 'Face' },
  corps: { fr: 'Corps', en: 'Body' },
  cheveux: { fr: 'Cheveux', en: 'Hair' },
  'nettoyants-savons': { fr: 'Nettoyants & Savons', en: 'Cleansers & Soaps' },
  huiles: { fr: 'Huiles', en: 'Oils' },
  serums: { fr: 'Sérums', en: 'Serums' },
  coffrets: { fr: 'Coffrets & Routines', en: 'Sets & Routines' },
};

export const UI_STRINGS = {
  fr: {
    nav: {
      shop: 'Boutique',
      routines: 'Routines',
      ingredients: 'Ingrédients',
      brand: 'La marque',
      about: 'À propos',
      journal: 'Journal',
      search: 'Rechercher',
      account: 'Compte',
      cart: 'Panier',
      home: 'Accueil',
      favorites: 'Favoris',
      menu: 'Menu',
    },
    hero: {
      ctaPrimary: 'Découvrir les soins',
      ctaSecondary: 'Explorer les routines',
    },
    sections: {
      categories: 'Catégories disponibles',
      categoriesSub: 'Explorez nos gammes de soins formulées avec clarté et transparence.',
      selection: 'Sélection du catalogue',
      selectionSub: 'Chaque fiche indique son format, sa composition INCI et sa disponibilité réelle.',
      routineSpotlight: 'Routine éditoriale',
      ingredients: 'Ingrédients documentés',
      brandTitle: 'Les Laboratoires Emaüs, à Douala',
      journal: 'Le Journal du soin',
      newsletterTitle: 'Suivre les actualités de la marque',
      newsletterDesc:
        'Recevez uniquement les informations de lancement et la publication des nouvelles fiches validées. Désinscription libre à tout moment.',
      newsletterConsent: 'J’accepte de recevoir les actualités Emaüs Skin Care par e-mail (sans obligation pour commander).',
      newsletterCta: 'S’inscrire',
    },
    product: {
      addToCart: 'Ajouter au panier',
      quickAdd: 'Ajout rapide',
      outOfStock: 'Rupture temporaire',
      inStock: 'Disponible',
      unitsLeft: 'en stock',
      draftPending: 'En attente de validation',
      inci: 'Composition INCI',
      directions: 'Mode d’emploi',
      precautions: 'Précautions',
      storage: 'Conservation',
      pao: 'Durée après ouverture (PAO)',
      audience: 'Public et restrictions',
      delivery: 'Livraison & Retrait',
      benefits: 'Bénéfices cosmétiques',
      related: 'Soins complémentaires',
      reviews: 'Avis authentiques',
      noReviews: 'Aucun avis vérifié publié pour le moment.',
    },
    cart: {
      title: 'Votre panier',
      empty: 'Votre panier est vide pour le moment.',
      browse: 'Parcourir la boutique',
      subtotal: 'Sous-total',
      discount: 'Remise',
      delivery: 'Livraison',
      deliveryUnknown: 'À confirmer avec le service client',
      total: 'Total estimé',
      checkout: 'Finaliser la commande',
      viewCart: 'Voir le panier détaillé',
    },
    common: {
      loading: 'Chargement des données…',
      error: 'Une erreur est survenue.',
      reset: 'Réinitialiser',
      viewAll: 'Tout voir',
      save: 'Enregistrer',
      cancel: 'Annuler',
      close: 'Fermer',
    },
  },
  en: {
    nav: {
      shop: 'Shop',
      routines: 'Routines',
      ingredients: 'Ingredients',
      brand: 'Brand',
      about: 'About',
      journal: 'Journal',
      search: 'Search',
      account: 'Account',
      cart: 'Bag',
      home: 'Home',
      favorites: 'Favorites',
      menu: 'Menu',
    },
    hero: {
      ctaPrimary: 'Discover skincare',
      ctaSecondary: 'Explore routines',
    },
    sections: {
      categories: 'Available categories',
      categoriesSub: 'Explore our skincare collections with clear formulas and guidance.',
      selection: 'Catalog selection',
      selectionSub: 'Every sheet clearly displays size, INCI composition, and real-time availability.',
      routineSpotlight: 'Editorial routine',
      ingredients: 'Documented ingredients',
      brandTitle: 'Les Laboratoires Emaüs, Douala',
      journal: 'Skincare Journal',
      newsletterTitle: 'Follow brand updates',
      newsletterDesc:
        'Receive updates when official validated product sheets and collections launch. Unsubscribe at any time.',
      newsletterConsent: 'I agree to receive Emaüs Skin Care email updates (never required to place an order).',
      newsletterCta: 'Subscribe',
    },
    product: {
      addToCart: 'Add to bag',
      quickAdd: 'Quick add',
      outOfStock: 'Out of stock',
      inStock: 'Available',
      unitsLeft: 'in stock',
      draftPending: 'Pending validation',
      inci: 'INCI Ingredients',
      directions: 'Directions',
      precautions: 'Precautions',
      storage: 'Storage',
      pao: 'Period After Opening (PAO)',
      audience: 'Audience & restrictions',
      delivery: 'Delivery & Pickup',
      benefits: 'Cosmetic benefits',
      related: 'Complementary care',
      reviews: 'Authentic reviews',
      noReviews: 'No published reviews yet.',
    },
    cart: {
      title: 'Your bag',
      empty: 'Your bag is currently empty.',
      browse: 'Browse catalog',
      subtotal: 'Subtotal',
      discount: 'Discount',
      delivery: 'Delivery',
      deliveryUnknown: 'To confirm with customer service',
      total: 'Estimated total',
      checkout: 'Proceed to checkout',
      viewCart: 'View full bag',
    },
    common: {
      loading: 'Loading store data…',
      error: 'Something went wrong.',
      reset: 'Reset',
      viewAll: 'View all',
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
    },
  },
} as const;
