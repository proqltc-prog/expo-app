// WEEK-270: keukeneenheden. Bij een ingrediënt kies je een eenheid zoals in een kookboek (2 el, 1 zakje, 1 dl).
// De app rekent die om naar de basiseenheid van het ingrediënt (g, ml, stuk, teentje), zodat de boodschappenlijst
// en "In huis" blijven optellen. Het gerecht en de bereiding tonen wat je koos.
// Pure logica zonder React Native.

export type Basiseenheid = 'g' | 'ml' | 'stuk' | 'teentje';

/** Keukeneenheden die je kunt kiezen. De basiseenheden zelf horen er ook bij. */
export type KeukenEenheid =
  | Basiseenheid
  | 'kg'
  | 'cl'
  | 'dl'
  | 'l'
  | 'el'
  | 'kl'
  | 'snuifje'
  | 'scheutje'
  | 'zakje'
  | 'blaadje'
  | 'takje'
  | 'bosje';

/** Hoeveel basiseenheden één keukeneenheid is. Vaste maten (kg, cl, dl, l, el, kl) en gangbare richtwaarden. */
const FACTOR: Record<Exclude<KeukenEenheid, Basiseenheid>, number> = {
  kg: 1000,
  cl: 10,
  dl: 100,
  l: 1000,
  el: 15,
  kl: 5,
  snuifje: 0.5,
  scheutje: 10,
  zakje: 8,
  blaadje: 0.2,
  takje: 1,
  bosje: 20,
};

/** Welke keukeneenheden passen bij een basiseenheid, in de volgorde van de keuzelijst. */
const KEUZE: Record<Basiseenheid, readonly KeukenEenheid[]> = {
  g: ['g', 'kg', 'el', 'kl', 'snuifje', 'zakje', 'blaadje', 'takje', 'bosje'],
  ml: ['ml', 'cl', 'dl', 'l', 'el', 'kl', 'scheutje'],
  stuk: ['stuk'],
  teentje: ['teentje'],
};

export const ALLE_KEUKENEENHEDEN: readonly KeukenEenheid[] = [
  'g', 'kg', 'ml', 'cl', 'dl', 'l', 'el', 'kl', 'snuifje', 'scheutje', 'zakje', 'blaadje', 'takje', 'bosje', 'stuk', 'teentje',
];

export function isKeukenEenheid(x: unknown): x is KeukenEenheid {
  return typeof x === 'string' && (ALLE_KEUKENEENHEDEN as readonly string[]).includes(x);
}

/**
 * De keukeneenheden die je bij een ingrediënt met deze basiseenheid kunt kiezen.
 * Is het gewicht van één stuk gekend (bv. tomaat 120 g), dan kan je bij een ingrediënt in gram ook "stuk" kiezen.
 */
export function keuzeEenheden(basis: Basiseenheid, perStuk?: number): readonly KeukenEenheid[] {
  return basis === 'g' && perStuk && perStuk > 0 ? [...KEUZE.g, 'stuk'] : KEUZE[basis];
}

/** Past de keukeneenheid bij de basiseenheid (bv. dl bij ml, niet bij g)? */
export function pastBij(eenheid: KeukenEenheid, basis: Basiseenheid, perStuk?: number): boolean {
  return keuzeEenheden(basis, perStuk).includes(eenheid);
}

/** Afronden op hoogstens 2 decimalen, zonder zwevendekommafouten. */
const rond = (n: number) => Math.round(n * 100) / 100;

/**
 * Rekent een hoeveelheid in een keukeneenheid om naar de basiseenheid: 2 el olie → 30 ml, 1 zakje → 8 g.
 * Past de eenheid niet bij de basis, dan blijft de hoeveelheid ongewijzigd (geen gok).
 */
export function naarBasis(hoeveelheid: number, eenheid: KeukenEenheid, basis: Basiseenheid, perStuk?: number): number {
  if (eenheid === basis || !pastBij(eenheid, basis, perStuk)) return rond(hoeveelheid);
  if (eenheid === 'stuk') return rond(hoeveelheid * (perStuk ?? 1));
  return rond(hoeveelheid * FACTOR[eenheid as Exclude<KeukenEenheid, Basiseenheid>]);
}

/** De keukeneenheid zoals bewaard bij een ingrediënt: de gekozen eenheid en de hoeveelheid daarin (per volwassene). */
export type KeukenMaat = { eenheid: KeukenEenheid; hoeveelheid: number };

/** Leest een bewaarde keukenmaat; een onbekende of lege waarde geeft undefined (dan geldt de basiseenheid). */
export function normaliseerKeukenMaat(ruw: unknown, basis: Basiseenheid, perStuk?: number): KeukenMaat | undefined {
  if (!ruw || typeof ruw !== 'object') return undefined;
  const r = ruw as { eenheid?: unknown; hoeveelheid?: unknown };
  if (!isKeukenEenheid(r.eenheid) || !pastBij(r.eenheid, basis, perStuk) || r.eenheid === basis) return undefined;
  if (typeof r.hoeveelheid !== 'number' || !Number.isFinite(r.hoeveelheid) || r.hoeveelheid <= 0) return undefined;
  return { eenheid: r.eenheid, hoeveelheid: r.hoeveelheid };
}

/**
 * Telt twee keukenmaten van hetzelfde ingrediënt samen (bv. twee regels "1 el olie" in een ingelezen recept).
 * Verschillen de eenheden, dan valt de keukenmaat weg en geldt de (correct opgetelde) basishoeveelheid.
 */
export function telKeukenMaatOp(a: KeukenMaat | undefined, b: KeukenMaat | undefined): KeukenMaat | undefined {
  if (!a || !b || a.eenheid !== b.eenheid) return undefined;
  return { eenheid: a.eenheid, hoeveelheid: rond(a.hoeveelheid + b.hoeveelheid) };
}

/**
 * Een maat zoals ze op een receptensite of foto stond (bv. 2 el), omgerekend per volwassene (personen).
 * Enkel voor vaste maten die bij het ingrediënt passen; anders undefined (dan toont de app de basiseenheid).
 */
export function keukenMaatUitBron(
  bron: { soort: string; factor: number } | undefined,
  aantal: number | undefined,
  basis: Basiseenheid,
  personen: number
): KeukenMaat | undefined {
  if (!bron || aantal === undefined || !(aantal > 0)) return undefined;
  const eenheid = BRON_NAAR_KEUKEN.find(([s, f]) => (s === '*' ? bron.soort === 'g' || bron.soort === 'ml' : s === bron.soort) && f === bron.factor)?.[2];
  if (!eenheid || !pastBij(eenheid, basis)) return undefined;
  return { eenheid, hoeveelheid: rond(aantal / Math.max(1, personen)) };
}

/** Soort en factor van een eenheid op een receptensite → keukeneenheid. '*' = gram of ml (een lepel blijft een lepel). */
const BRON_NAAR_KEUKEN: ReadonlyArray<[string, number, KeukenEenheid]> = [
  ['*', 15, 'el'],
  ['*', 5, 'kl'],
  ['ml', 10, 'cl'],
  ['ml', 100, 'dl'],
  ['ml', 1000, 'l'],
  ['g', 1000, 'kg'],
];

/**
 * Schaalt een keukenmaat mee met de gezinsgrootte, zoals de basishoeveelheid: factor = geschaald / basis per volwassene.
 * Afgerond op een halve eenheid (1,5 el), met minstens een halve.
 */
export function schaalKeukenMaat(maat: KeukenMaat, factor: number): KeukenMaat {
  if (!(factor > 0)) return { eenheid: maat.eenheid, hoeveelheid: 0 };
  const h = Math.max(0.5, Math.round(maat.hoeveelheid * factor * 2) / 2);
  return { eenheid: maat.eenheid, hoeveelheid: h };
}
