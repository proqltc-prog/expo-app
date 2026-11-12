// WEEK-251: een recept inlezen via een foto. Pure logica, zonder opslag of React.
// De Supabase-functie recept-foto laat Google Gemini de foto lezen; het antwoord komt van een AI en wordt hier
// nagekeken en begrensd voor het als RuwRecept naar verwerkRecept (zelfde verwerking als een link) gaat.
import { leesTaal, schoneTekst, type RuwRecept } from '@/lib/receptLink';

export const FOTO_FOUTEN = ['geen_foto', 'te_groot', 'limiet', 'niet_ingesteld', 'druk', 'niet_bereikbaar', 'geen_recept', 'geen_verbinding'] as const;
export type FotoFout = (typeof FOTO_FOUTEN)[number];

/** De foutcode van de functie als gekende melding; een onbekende code (of geen) wordt "niet bereikbaar". */
export function alsFotoFout(x: unknown): FotoFout {
  return typeof x === 'string' && (FOTO_FOUTEN as readonly string[]).includes(x) && x !== 'geen_verbinding' ? (x as FotoFout) : 'niet_bereikbaar';
}

/** De langste zijde van de foto die verstuurd wordt; genoeg om gedrukte tekst te lezen, klein genoeg om snel te zijn. */
export const FOTO_MAX_ZIJDE = 1600;
export const FOTO_KWALITEIT = 0.7;

export const MAX_INGREDIENTEN = 60;
export const MAX_STAPPEN = 40;
const MAX_NAAM = 120;
const MAX_REGEL = 200;
const MAX_STAP = 1000;

/** Hoe de foto verkleind wordt: enkel de langste zijde begrenzen, de verhouding blijft. Undefined = klein genoeg. */
export function verkleinMaat(breedte: number, hoogte: number, max = FOTO_MAX_ZIJDE): { width: number } | { height: number } | undefined {
  if (!(breedte > 0) || !(hoogte > 0) || Math.max(breedte, hoogte) <= max) return undefined;
  return breedte >= hoogte ? { width: max } : { height: max };
}

const geheel = (x: unknown, min: number, max: number): number | undefined =>
  typeof x === 'number' && Number.isFinite(x) && Math.round(x) >= min && Math.round(x) <= max ? Math.round(x) : undefined;

const regels = (x: unknown, max: number, lengte: number): string[] =>
  (Array.isArray(x) ? x : [])
    .filter((r): r is string => typeof r === 'string')
    .map((r) => schoneTekst(r).slice(0, lengte).trim())
    .filter(Boolean)
    .slice(0, max);

/**
 * Het antwoord van de AI als RuwRecept, of undefined als er geen bruikbaar recept in staat
 * (gevonden false, geen naam en geen ingrediënten). Alles wordt begrensd: aantallen, lengtes, personen en minuten.
 */
export function leesFotoRecept(x: unknown): RuwRecept | undefined {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return undefined;
  const r = x as Record<string, unknown>;
  if (r.gevonden === false) return undefined;
  const ingredienten = regels(r.ingredienten, MAX_INGREDIENTEN, MAX_REGEL);
  if (!ingredienten.length) return undefined;
  const naam = typeof r.naam === 'string' ? schoneTekst(r.naam).slice(0, MAX_NAAM).trim() : '';
  const stappen = regels(r.stappen, MAX_STAPPEN, MAX_STAP).map((s) => s.replace(/^\s*(?:stap\s*)?\d+[.):]\s*/i, ''));
  const personen = geheel(r.personen, 1, 50);
  const minuten = geheel(r.minuten, 1, 24 * 60);
  const taal = typeof r.taal === 'string' ? leesTaal(r.taal) : undefined;
  return {
    naam,
    ingredienten,
    stappen,
    ...(personen ? { personen } : {}),
    ...(minuten ? { minuten } : {}),
    ...(taal ? { taal } : {}),
  };
}

/** WEEK-258: fouten waarbij het lezen van foto's tijdelijk niet beschikbaar is (de AI of de dienst); dan alternatieven tonen. */
export function fotoTijdelijkOnbereikbaar(fout: FotoFout | 'geenToestemming' | undefined): boolean {
  return fout === 'druk' || fout === 'niet_bereikbaar' || fout === 'niet_ingesteld';
}
