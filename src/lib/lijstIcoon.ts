// Lijnicoontjes voor de boodschappenlijst (WEEK-77). Pure logica: welk icoon bij welke categorie hoort.
// De namen zijn Ionicons-namen uit @expo/vector-icons.

export const WINKEL_ICOON = 'storefront-outline';
export const BOODSCHAPPEN_ICOON = 'cart-outline';
/** Het scannericoon naast een lijstregel (WEEK-95): een barcode-icoon, geen camera-emoji. */
export const SCANNER_ICOON = 'barcode-outline';

const CATEGORIE_ICOON: Record<string, string> = {
  avondeten: 'restaurant-outline',
  'brood-beleg': 'basket-outline',
  fruit: 'nutrition-outline',
  groenten: 'leaf-outline',
  vis: 'fish-outline',
  drank: 'cafe-outline',
  school: 'school-outline',
  huishouden: 'home-outline',
  extra: 'bag-handle-outline',
  gescand: 'scan-outline',
};

/** Het icoon van een lijstcategorie; onbekende categorieën krijgen een winkelmand. */
export function categorieIcoon(categorie: string): string {
  return CATEGORIE_ICOON[categorie] ?? 'basket-outline';
}
