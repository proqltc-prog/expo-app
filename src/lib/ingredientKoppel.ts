// WEEK-254: onbekende ingrediënten automatisch koppelen of toevoegen (Supabase-functie ingredient-koppel, Gemini).
// Pure logica: het antwoord van de functie nakijken en omzetten naar koppelingen voor verwerkRecept.
import type { IngredientInfo } from '@/data/ingredienten';
import { kernNaam } from '@/lib/receptLink';

export type KoppelStatus = 'bestaand' | 'nieuw' | 'geen' | 'druk' | 'limiet';
export type KoppelResultaat = { naam: string; status: KoppelStatus; code?: string; info?: IngredientInfo };
export type KoppelFout = 'limiet' | 'niet_ingesteld' | 'niet_bereikbaar' | 'geen_verbinding';

const STATUSSEN: readonly KoppelStatus[] = ['bestaand', 'nieuw', 'geen', 'druk', 'limiet'];
const EENHEDEN = ['g', 'ml', 'stuk', 'teentje'];

/** Hoogstens zoveel namen per vraag aan de functie (zelfde grens als in de functie). */
export const MAX_KOPPEL_NAMEN = 10;

function leesInfo(x: unknown): IngredientInfo | undefined {
  if (!Array.isArray(x) || x.length !== 3) return undefined;
  const [categorie, eenheid, namen] = x as unknown[];
  if (typeof categorie !== 'string' || !categorie || typeof eenheid !== 'string' || !EENHEDEN.includes(eenheid)) return undefined;
  if (!Array.isArray(namen) || namen.length !== 4 || !namen.every((n) => typeof n === 'string' && n.trim())) return undefined;
  const [nl, fr, de, en] = (namen as string[]).map((n) => n.trim().slice(0, 80));
  return [categorie, eenheid, [nl, fr, de, en]];
}

/** Het antwoord van de functie, nagekeken: enkel gekende statussen; een code en geldige gegevens bij bestaand/nieuw. */
export function leesKoppelAntwoord(x: unknown): KoppelResultaat[] {
  const lijst = (x as { resultaten?: unknown } | undefined)?.resultaten;
  if (!Array.isArray(lijst)) return [];
  const uit: KoppelResultaat[] = [];
  for (const r of lijst) {
    if (!r || typeof r !== 'object') continue;
    const { naam, status, code, info } = r as Record<string, unknown>;
    if (typeof naam !== 'string' || !STATUSSEN.includes(status as KoppelStatus)) continue;
    if (status === 'bestaand' || status === 'nieuw') {
      const i = leesInfo(info);
      if (typeof code !== 'string' || !/^[\p{Ll}\d_]{1,60}$/u.test(code) || !i) continue;
      uit.push({ naam, status, code, info: i });
    } else {
      uit.push({ naam, status: status as KoppelStatus });
    }
  }
  return uit;
}

/** Koppelingen voor verwerkRecept: de kern van de naam → code, enkel voor gevonden of toegevoegde ingrediënten. */
export function koppelingenUit(resultaten: readonly KoppelResultaat[]): Record<string, string> {
  return Object.fromEntries(resultaten.filter((r) => r.code).map((r) => [kernNaam(r.naam), r.code as string]));
}

/** De nieuwe ingrediënten om meteen aan de lijst toe te voegen (code → gegevens). */
export function infoUit(resultaten: readonly KoppelResultaat[]): Record<string, IngredientInfo> {
  return Object.fromEntries(resultaten.filter((r) => r.code && r.info).map((r) => [r.code as string, r.info as IngredientInfo]));
}
