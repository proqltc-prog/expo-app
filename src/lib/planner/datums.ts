// Datums van het weekplan (WEEK-97, WEEK-93). Pure logica, zonder React Native.
// Een plan telt maximaal 7 opeenvolgende dagen, zodat elke weekdag maar één keer voorkomt.
import type { Taal } from '@/i18n';
import { DagCode, WEEKDAGEN } from '@/lib/planner/types';

export const MAX_PLANDAGEN = 7;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Lokale datum als YYYY-MM-DD (niet UTC, zodat de dag klopt in België). */
export function isoVan(datum: Date): string {
  const m = String(datum.getMonth() + 1).padStart(2, '0');
  const d = String(datum.getDate()).padStart(2, '0');
  return `${datum.getFullYear()}-${m}-${d}`;
}

export function vandaagIso(nu: Date = new Date()): string {
  return isoVan(nu);
}

function naarDatum(iso: string): Date | undefined {
  const deel = ISO.exec(iso);
  if (!deel) return undefined;
  const datum = new Date(Number(deel[1]), Number(deel[2]) - 1, Number(deel[3]));
  return isNaN(datum.getTime()) ? undefined : datum;
}

/** Geldige ISO-datum? */
export function isGeldigeIso(iso: unknown): iso is string {
  return typeof iso === 'string' && naarDatum(iso) !== undefined && isoVan(naarDatum(iso)!) === iso;
}

/** Een datum na of op een andere datum, aantal dagen verschil. */
export function dagenTussen(van: string, tot: string): number {
  const a = naarDatum(van);
  const b = naarDatum(tot);
  if (!a || !b) return NaN;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Opeenvolgende datums vanaf een startdatum, n dagen (begrensd op 1 tot en met 7). */
export function bereikDatums(start: string, aantal: number): string[] {
  const begin = naarDatum(start);
  if (!begin) return [];
  const n = Math.min(MAX_PLANDAGEN, Math.max(1, Math.floor(aantal)));
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(begin.getFullYear(), begin.getMonth(), begin.getDate() + i);
    return isoVan(d);
  });
}

/** De weekdag van een ISO-datum als plancode. */
export function weekdagVan(iso: string): DagCode | undefined {
  const datum = naarDatum(iso);
  return datum ? WEEKDAGEN[datum.getDay()] : undefined;
}

/**
 * Maakt van de gekozen datums de plandagen: gesorteerd, zonder dubbelen, maximaal 7,
 * en enkel als alle datums binnen één periode van 7 dagen vallen (dan is elke weekdag uniek).
 */
export function plandagenVoorDatums(datums: readonly string[]): { dag: DagCode; datum: string }[] {
  const geldig = [...new Set(datums.filter(isGeldigeIso))].sort();
  if (!geldig.length) return [];
  const eerste = geldig[0];
  const binnen = geldig.filter((d) => dagenTussen(eerste, d) < MAX_PLANDAGEN);
  return binnen.slice(0, MAX_PLANDAGEN).map((datum) => ({ dag: weekdagVan(datum)!, datum }));
}

// Korte namen per taal; index 0 = zondag, zoals Date.getDay().
const DAGEN_KORT: Record<Taal, readonly string[]> = {
  nl: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
  fr: ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'],
  de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

const MAANDEN_KORT: Record<Taal, readonly string[]> = {
  nl: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  de: ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** Korte weergave, bv. "zo 19 okt" (nl). Ongeldige datum geeft een lege tekst. */
export function kortDatum(iso: string, taal: Taal): string {
  const datum = naarDatum(iso);
  if (!datum) return '';
  return `${DAGEN_KORT[taal][datum.getDay()]} ${datum.getDate()} ${MAANDEN_KORT[taal][datum.getMonth()]}`;
}

/** De plancodes van het verzoek: de gekozen datums, of anders de eerste n weekdagen (oude manier). */
export function dagenVoorVerzoek(verzoek: { datums?: readonly string[]; aantalDagen?: number }, standaard: number): DagCode[] {
  const plan = plandagenVoorDatums(verzoek.datums ?? []);
  if (plan.length) return plan.map((p) => p.dag);
  return WEEKDAGEN.slice(0, Math.min(MAX_PLANDAGEN, Math.max(1, verzoek.aantalDagen ?? standaard))) as DagCode[];
}

/** Zet de datum bij elke plandag, op basis van de gekozen datums. Zonder datums blijft het plan zoals het is. */
export function voegDatumsToe<T extends { dag: DagCode; datum?: string }>(dagen: T[], datums?: readonly string[]): T[] {
  const perDag = new Map(plandagenVoorDatums(datums ?? []).map((p) => [p.dag, p.datum]));
  return dagen.map((d) => {
    const datum = perDag.get(d.dag);
    return datum ? { ...d, datum } : d;
  });
}

/** Weekkoppen voor de kalender, maandag eerst. */
export function weekKoppen(taal: Taal): string[] {
  return [1, 2, 3, 4, 5, 6, 0].map((i) => DAGEN_KORT[taal][i]);
}

/**
 * De cellen van één maand, maandag eerst. Lege plekken zijn null.
 * maand is 0-gebaseerd (0 = januari), zoals in JavaScript.
 */
export function maandCellen(jaar: number, maand: number): (string | null)[] {
  const eerste = new Date(jaar, maand, 1);
  const aantal = new Date(jaar, maand + 1, 0).getDate();
  const voor = (eerste.getDay() + 6) % 7; // maandag = 0
  const cellen: (string | null)[] = Array.from({ length: voor }, () => null);
  for (let dag = 1; dag <= aantal; dag++) cellen.push(isoVan(new Date(jaar, maand, dag)));
  while (cellen.length % 7 !== 0) cellen.push(null);
  return cellen;
}

/** Maandnaam en jaar voor de kop van de kalender, bv. "okt 2026". */
export function maandKop(jaar: number, maand: number, taal: Taal): string {
  return `${MAANDEN_KORT[taal][maand]} ${jaar}`;
}

/**
 * De bewaarde periode die de kalender voorselecteert (WEEK-150): enkel de dagen vanaf vandaag.
 * Een startdag in het verleden valt weg; de laatste dag blijft enkel als hij na de startdag ligt.
 */
export function geldigeBegin(begin: { van?: string; tot?: string } | undefined, vandaag: string): { van?: string; tot?: string } {
  const van = begin?.van && begin.van >= vandaag ? begin.van : undefined;
  if (!van) return {};
  const tot = begin?.tot && begin.tot >= van ? begin.tot : undefined;
  return tot ? { van, tot } : { van };
}
