// Meertaligheid (WEEK-22). Pure functies, zonder React of toestel-API's.
import { nl, Sleutel, Vertalingen } from './vertalingen/nl';
import { fr } from './vertalingen/fr';
import { de } from './vertalingen/de';
import { en } from './vertalingen/en';
import { es } from './vertalingen/es';
import { pt } from './vertalingen/pt';

export type { Sleutel } from './vertalingen/nl';

export const TALEN = ['nl', 'fr', 'de', 'en', 'es', 'pt'] as const;
export type Taal = (typeof TALEN)[number];

/** WEEK-169: talen die de gebruiker in de app kan kiezen. Es en pt blijven in de code maar worden niet aangeboden. */
export const KEUZE_TALEN: readonly Taal[] = ['nl', 'fr', 'de', 'en'];

/** Taal als de toesteltaal niet ondersteund wordt. */
export const TERUGVALTAAL: Taal = 'en';

export const VERTALINGEN: Record<Taal, Vertalingen> = { nl, fr, de, en, es, pt };

/** Locale voor getallen en datums per taal (België voor nl/fr/de). */
export const LOCALE: Record<Taal, string> = {
  nl: 'nl-BE',
  fr: 'fr-BE',
  de: 'de-BE',
  en: 'en-GB',
  es: 'es-ES',
  pt: 'pt-PT',
};

export function isTaal(waarde: unknown): waarde is Taal {
  return typeof waarde === 'string' && (TALEN as readonly string[]).includes(waarde);
}

export type Parameters = Record<string, string | number>;

/** Vervangt {naam}-plaatshouders. Onbekende plaatshouders blijven zichtbaar staan. */
export function vulIn(tekst: string, params: Parameters = {}): string {
  return tekst.replace(/\{(\w+)\}/g, (heel, naam: string) => (naam in params ? String(params[naam]) : heel));
}

/** Vertaalt een sleutel. Valt terug op Nederlands en daarna op de sleutel zelf. */
export function vertaal(taal: Taal, sleutel: Sleutel, params?: Parameters): string {
  const tekst = VERTALINGEN[taal]?.[sleutel] ?? nl[sleutel] ?? sleutel;
  return vulIn(tekst, params);
}

type MeervoudBasis<S> = S extends `${infer B}_1` ? B : never;
export type MeervoudSleutel = MeervoudBasis<Sleutel>;

/** Enkelvoud of meervoud: kiest `<basis>_1` voor n = 1, anders `<basis>_n`. {n} wordt ingevuld. */
export function vertaalAantal(taal: Taal, basis: MeervoudSleutel, n: number, params: Parameters = {}): string {
  const sleutel = (n === 1 ? `${basis}_1` : `${basis}_n`) as Sleutel;
  return vertaal(taal, sleutel, { ...params, n });
}

/**
 * Kiest de taal van de app.
 * 1. een uitdrukkelijke keuze in het profiel
 * 2. de eerste toesteltaal die we ondersteunen (bv. "fr-BE" → fr)
 * 3. de terugvaltaal (Engels)
 */
export function kiesTaal(toesteltalen: readonly string[], voorkeur?: Taal): Taal {
  if (voorkeur && KEUZE_TALEN.includes(voorkeur)) return voorkeur;
  for (const code of toesteltalen) {
    const basis = code.toLowerCase().split(/[-_]/)[0];
    if (KEUZE_TALEN.includes(basis as Taal)) return basis as Taal;
  }
  return TERUGVALTAAL;
}

/** Formatteert een getal volgens de taal (bv. 1,5 in nl en 1.5 in en). */
export function getal(taal: Taal, waarde: number, maxDecimalen = 1): string {
  return new Intl.NumberFormat(LOCALE[taal], { maximumFractionDigits: maxDecimalen }).format(waarde);
}

// Lijstcategorieën: vroeger bewaard als Nederlandse naam, nu als code.
const OUDE_CATEGORIEEN: Record<string, string> = {
  Avondeten: 'avondeten',
  'Brood & beleg': 'brood-beleg',
  Fruit: 'fruit',
  School: 'school',
  Huishouden: 'huishouden',
  Extra: 'extra',
  Gescand: 'gescand',
};

/** Leesbare naam van een lijstcategorie; onbekende categorieën worden ongewijzigd getoond. */
export function categorieNaam(taal: Taal, categorie: string): string {
  const code = OUDE_CATEGORIEEN[categorie] ?? categorie;
  const sleutel = `categorie.${code}` as Sleutel;
  return sleutel in nl ? vertaal(taal, sleutel) : categorie;
}

/** Vertaalsleutel voor een dag, bv. "Maandag" → "dag.maandag". */
export function dagSleutel(dag: string): Sleutel {
  return `dag.${dag.toLowerCase()}` as Sleutel;
}

/**
 * Leesbare hoeveelheid: "330 g", "1,5 l"-stijl getallen volgens de taal, "2 ×" voor stuks,
 * "1 teentje" / "2 teentjes". Onbekende eenheden (bv. van de AI) worden letterlijk getoond.
 */
export function hoeveelheidTekst(taal: Taal, hoeveelheid: number | undefined, eenheid: string | undefined): string {
  if (hoeveelheid === undefined || hoeveelheid <= 0) return '';
  const n = getal(taal, hoeveelheid, 2);
  if (!eenheid || eenheid === 'stuk') return `${n} ×`;
  if (eenheid === 'teentje') return vulIn(vertaal(taal, hoeveelheid === 1 ? 'eenheid.teentje_1' : 'eenheid.teentje_n'), { n });
  return `${n} ${eenheid}`;
}

/** Korte datum volgens de taal, bv. "10 okt." (nl) of "10 Oct" (en). Ongeldige datum geeft lege tekst. */
export function datumKort(taal: Taal, iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(LOCALE[taal], { day: 'numeric', month: 'short' }).format(d);
}
