// Vaste items voor ontbijt, middag (boterhammen), school en huishouden.
// Categorie en items zijn codes; de tekst komt uit de vertalingen (categorie.<code>, item.<code>).
export const VASTE_ITEMS = [
  { categorie: 'brood-beleg', items: ['brood', 'boter', 'kaas', 'hesp', 'choco'] },
  { categorie: 'fruit', items: ['appels', 'bananen', 'mandarijnen'] },
  { categorie: 'school', items: ['koekjes', 'drinkbrikjes'] },
  { categorie: 'huishouden', items: ['wc-papier', 'tandpasta'] },
] as const;
