import type { Afdeling } from './ingredienten';

// Vaste items voor ontbijt, middag (boterhammen), school en huishouden.
// Categorie en items zijn codes; de tekst komt uit de vertalingen (categorie.<code>, item.<code>).
export const VASTE_ITEMS = [
  { categorie: 'brood-beleg', items: ['brood', 'boter', 'kaas', 'hesp', 'choco'] },
  { categorie: 'fruit', items: ['appels', 'bananen', 'mandarijnen'] },
  { categorie: 'school', items: ['koekjes', 'drinkbrikjes'] },
  { categorie: 'huishouden', items: ['wc-papier', 'tandpasta'] },
] as const;

/** Winkelafdeling van elk vast item; undefined = geen voedingsmiddel (komt onder "overig"). */
export const VAST_AFDELING: Record<string, Afdeling | undefined> = {
  brood: 'brood',
  boter: 'zuivel-eieren',
  kaas: 'zuivel-eieren',
  hesp: 'vlees-vis',
  choco: 'conserven-sauzen',
  appels: 'groenten-fruit',
  bananen: 'groenten-fruit',
  mandarijnen: 'groenten-fruit',
  koekjes: 'droge-voeding',
  drinkbrikjes: 'dranken',
  'wc-papier': undefined,
  tandpasta: undefined,
};
