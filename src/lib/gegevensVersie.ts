// WEEK-252/253: gegevens uit de databank enkel ophalen als ze gewijzigd zijn. Pure logica, zonder opslag of netwerk.
// Supabase houdt per soort een versienummer bij (tabel data_versie); de app bewaart de versie van wat op het toestel staat.
import type { IngredientInfo } from '@/data/ingredienten';

export type GegevensSoort = 'ingredienten' | 'recepten';
export type Versies = Partial<Record<GegevensSoort, number>>;

/**
 * Moet de app opnieuw ophalen? Ja als de databank een (andere) versie heeft dan het toestel, of als er nog niets op
 * het toestel staat. Is de versie van de databank onbekend (geen internet), dan niet: de app gebruikt wat ze heeft.
 */
export function moetOphalen(opToestel: number | undefined, inDatabank: number | undefined): boolean {
  if (inDatabank === undefined) return false;
  return opToestel !== inDatabank;
}

/** Leest [{naam, versie}] uit de tabel data_versie; onbekende of ongeldige rijen vallen weg. */
export function leesVersies(rijen: unknown): Versies {
  const uit: Versies = {};
  if (!Array.isArray(rijen)) return uit;
  for (const r of rijen) {
    if (!r || typeof r !== 'object') continue;
    const { naam, versie } = r as { naam?: unknown; versie?: unknown };
    const n = typeof versie === 'string' ? Number(versie) : versie;
    if ((naam === 'ingredienten' || naam === 'recepten') && typeof n === 'number' && Number.isInteger(n)) uit[naam] = n;
  }
  return uit;
}

const TAAL_VOLGORDE = ['nl', 'fr', 'de', 'en'] as const;
/** Zelfde vorm als de codes in de ingebouwde lijst: kleine letters, cijfers, underscore (en letters met accent, bv. maïs). */
const GELDIGE_CODE = /^[\p{Ll}\d_]{1,60}$/u;

/**
 * Leest de ingrediënten uit de databank (code, categorie, eenheid, ingredient_vertalingen[{taal, naam}]) naar de vorm
 * van de ingebouwde lijst. Enkel ingrediënten met een geldige code, categorie, eenheid en een naam in alle 4 de talen
 * (zoals `npm run ingredienten`), anders zou de app een lege naam tonen.
 */
export function leesIngredientRijen(rijen: unknown): Record<string, IngredientInfo> {
  const uit: Record<string, IngredientInfo> = {};
  if (!Array.isArray(rijen)) return uit;
  for (const r of rijen) {
    if (!r || typeof r !== 'object') continue;
    const { code, categorie, eenheid, ingredient_vertalingen: v } = r as Record<string, unknown>;
    if (typeof code !== 'string' || !GELDIGE_CODE.test(code)) continue;
    if (typeof categorie !== 'string' || !categorie.trim() || typeof eenheid !== 'string' || !eenheid.trim()) continue;
    const vertalingen = Array.isArray(v) ? (v as { taal?: unknown; naam?: unknown }[]) : [];
    const namen = TAAL_VOLGORDE.map((taal) => {
      const naam = vertalingen.find((x) => x?.taal === taal)?.naam;
      return typeof naam === 'string' ? naam.trim().slice(0, 80) : '';
    });
    if (namen.some((n) => !n)) continue;
    uit[code] = [categorie.trim(), eenheid.trim(), [namen[0], namen[1], namen[2], namen[3]]];
  }
  return uit;
}
