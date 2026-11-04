// Opstart bij de eerste opening (WEEK-79, WEEK-185). Pure logica, zonder React Native.
// Startscherm, daarna de uitleg, daarna aanmelden. Nieuwe gebruiker: naar de instellingen. Bekende gebruiker: naar het weekmenu.

export const ROUTE_WELKOM = '/welkom';
/** Na Aan de slag: de instellingen, om naam, taal en gezinsruimte in te stellen. */
export const ROUTE_NA_WELKOM = '/profiel';
/** Na inloggen op een bestaand account: het weekmenu. */
export const ROUTE_NA_INLOGGEN = '/';

/** Het startscherm verschijnt enkel bij de eerste opening; daarna gaat de app naar het menu. */
export function welkomNodig(gezien: boolean): boolean {
  return !gezien;
}

/** Een uitlegscherm: een Ionicons-icoon op een gekleurd vlak, met een titel en een korte tekst (sleutels uit de vertalingen). */
export type UitlegScherm = { icoon: string; kleur: string; titel: string; tekst: string };

/** De uitlegschermen, in volgorde: weekplanner, huishouden, frigo, lijst, scanner, seizoen en winkels. */
export const UITLEG_SCHERMEN: readonly UitlegScherm[] = [
  { icoon: 'calendar-outline', kleur: '#A9472A', titel: 'uitleg.weekplan.titel', tekst: 'uitleg.weekplan.tekst' },
  { icoon: 'people-outline', kleur: '#7A5AA6', titel: 'uitleg.huishouden.titel', tekst: 'uitleg.huishouden.tekst' },
  { icoon: 'snow-outline', kleur: '#2E7D9A', titel: 'uitleg.frigo.titel', tekst: 'uitleg.frigo.tekst' },
  { icoon: 'cart-outline', kleur: '#E8680F', titel: 'uitleg.lijst.titel', tekst: 'uitleg.lijst.tekst' },
  { icoon: 'scan-outline', kleur: '#A9472A', titel: 'uitleg.scan.titel', tekst: 'uitleg.scan.tekst' },
  { icoon: 'leaf-outline', kleur: '#6B8F2A', titel: 'uitleg.seizoen.titel', tekst: 'uitleg.seizoen.tekst' },
  { icoon: 'storefront-outline', kleur: '#B5562A', titel: 'uitleg.winkels.titel', tekst: 'uitleg.winkels.tekst' },
];
