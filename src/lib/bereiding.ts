// Bereidingsstappen per maaltijd (WEEK-81). Pure logica, zonder opslag of React.
import type { Taal } from '@/i18n';
import type { EigenRecept } from '@/lib/eigenrecepten';
import { bereidingVoorDbRecept, type DbRecept } from '@/lib/planner/db';
import { verdeelFrigo, type Dekking, type FrigoItem } from '@/lib/frigo';
import type { Weekplan } from '@/lib/planner/types';
import { ingredientenInTaal } from '@/lib/planner/vertaal';

/**
 * De bereidingsstappen van een maaltijd, of null als er geen bekend zijn.
 * Volgorde: een eigen recept op id, dan op naam; daarna een databankrecept (id "db-<nummer>", WEEK-121) op id.
 * Databankrecepten vallen terug op Nederlands als een taal ontbreekt (WEEK-208: geen ingebouwde recepten meer).
 */
export function bereidingVoor(
  recept: { id: string; naam: string },
  eigen: readonly EigenRecept[],
  taal: Taal,
  db: readonly DbRecept[] = [],
): string[] | null {
  const eigenRecept = eigen.find((e) => e.id === recept.id) ?? eigen.find((e) => e.naam === recept.naam);
  if (eigenRecept) return eigenRecept.stappen.length ? [...eigenRecept.stappen] : null;

  if (!recept.id.startsWith('db-')) return null;
  const dbRecept = db.find((r) => `db-${r.id}` === recept.id);
  return dbRecept ? bereidingVoorDbRecept(dbRecept, taal) : null;
}

/**
 * Het icoon om de ingrediënten en bereidingsstappen te openen (WEEK-113). Sinds WEEK-236 ook vóór het bevestigen,
 * zodat je eerst kunt bekijken wat het gerecht is. Heeft het gerecht geen stappen, dan toont de pagina Bereiding zelf een melding.
 */
export function toonBereidingsIcoon(_bevestigd?: boolean): boolean {
  return true;
}

/** Eén ingrediënt voor de bereidingspagina: de hoeveelheid is al voor het gezin omgerekend (WEEK-146). */
export type BereidingIngredient = { naam: string; hoeveelheid: number; eenheid: string; keuken?: { eenheid: string; hoeveelheid: number } };

/**
 * De ingrediënten van een gerecht uit het weekplan, in de volgorde van het recept (WEEK-146).
 * Het plan bevat de hoeveelheden al voor het gezin, dus die tonen we zoals ze zijn. Staat het gerecht niet in het plan, dan is de lijst leeg.
 */
export function ingredientenVoor(plan: Weekplan | null, receptId: string, taal: Taal = 'nl'): BereidingIngredient[] {
  const dag = plan?.dagen.find((d) => d.recept.id === receptId);
  if (!dag) return [];
  // WEEK-154: de namen in de gekozen taal; hoeveelheden blijven zoals ze zijn.
  // WEEK-270: de keukenmaat (bv. 5 el) gaat mee om te tonen; de dekking uit In huis rekent met de basishoeveelheid.
  return ingredientenInTaal(dag.recept, taal).map(({ naam, hoeveelheid, eenheid, keuken }) => ({ naam, hoeveelheid, eenheid, ...(keuken ? { keuken } : {}) }));
}

/** Een ingrediënt met de dekking uit de frigo: geheel, deels of niet (WEEK-147). */
export type BereidingIngredientMetFrigo = BereidingIngredient & { dekking: Dekking['gedekt'] };

/** Koppelt aan elk ingrediënt wat er al in de frigo ligt (WEEK-147). Zelfde volgorde als de ingrediënten. */
export function ingredientenMetFrigo(ingredienten: readonly BereidingIngredient[], frigo: readonly FrigoItem[]): BereidingIngredientMetFrigo[] {
  const dekking = verdeelFrigo(ingredienten, frigo);
  // WEEK-249: zonder hoeveelheid (0, bv. een menu voor 0 personen) is niets "helemaal in huis": geen vinkje.
  return ingredienten.map((ing, i) => ({ ...ing, dekking: ing.hoeveelheid > 0 ? (dekking[i]?.gedekt ?? 'niet') : 'niet' }));
}

// ---------------------------------------------------------------- WEEK-327: de bereiding als kaarten

/** Een kaart in de bereiding: eerst "Wat heb je nodig" (als er ingrediënten zijn), dan één kaart per stap. */
export type BereidingKaart = { soort: 'ingredienten' } | { soort: 'stap'; nummer: number; tekst: string };

export function bereidingKaarten(stappen: readonly string[], heeftIngredienten: boolean): BereidingKaart[] {
  return [
    ...(heeftIngredienten ? [{ soort: 'ingredienten' } as const] : []),
    ...stappen.map((tekst, i) => ({ soort: 'stap' as const, nummer: i + 1, tekst })),
  ];
}

/** Het stukje van de stappenbalk: al gedaan (gevuld), de huidige (oplichtend) of nog te doen. */
export function segmentStand(i: number, huidig: number): 'gedaan' | 'huidig' | 'nog' {
  return i < huidig ? 'gedaan' : i === huidig ? 'huidig' : 'nog';
}

/** Een geldige kaart: tussen de eerste en de laatste. */
export function begrensKaart(i: number, aantal: number): number {
  if (aantal <= 0) return 0;
  return Math.min(Math.max(0, Math.round(i)), aantal - 1);
}

/**
 * De dag van het weekplan die na de bereiding op "gekookt" kan: bevestigd, nog niet gekookt, met dit recept.
 * De dag die het weekmenu meegaf, gaat voor (hetzelfde recept kan twee keer in de week staan). Geen: undefined.
 */
export function kookbareDag(plan: Weekplan | null, receptId: string, voorkeur?: number): number | undefined {
  if (!plan || !receptId) return undefined;
  const kan = (i: number) => {
    const d = plan.dagen[i];
    return !!d && d.recept.id === receptId && !!d.bevestigd && !d.gedaan;
  };
  if (voorkeur !== undefined && Number.isInteger(voorkeur) && kan(voorkeur)) return voorkeur;
  const i = plan.dagen.findIndex((_, j) => kan(j));
  return i < 0 ? undefined : i;
}

/**
 * WEEK-331: de kaart die bij deze schuifpositie het meest in beeld staat (afgerond: vanaf halfweg de volgende),
 * begrensd tot de eerste en de laatste kaart. Breedte 0 (nog niet gemeten): de eerste kaart.
 */
export function kaartOpPositie(x: number, breedte: number, aantal: number): number {
  if (!(breedte > 0)) return 0;
  return begrensKaart(x / breedte, aantal);
}

/**
 * WEEK-334 (bij WEEK-331): tikt de gebruiker snel twee keer op Volgende, dan telt de tweede tik vanaf de kaart waar
 * de app al naartoe schuift, niet vanaf een tussenstand tijdens het schuiven.
 */
export function naastDoel(index: number, doel: number | undefined, richting: 1 | -1, aantal: number): number {
  return begrensKaart((doel ?? index) + richting, aantal);
}

/** Staat het veegvlak (bijna) op de kaart waar de app naartoe schoof? Een halve pixel afronding mag. */
export function doelBereikt(x: number, breedte: number, doel: number): boolean {
  return Math.abs(x - doel * breedte) < 2;
}
