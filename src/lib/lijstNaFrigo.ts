// WEEK-322: wordt bij In huis een ingrediënt verwijderd of verlaagd dat een bevestigd, nog niet gekookt gerecht nodig heeft,
// dan komt wat ontbreekt terug op de boodschappenlijst (bij een lagere hoeveelheid enkel het tekort), met een korte melding.
// Pure logica: het scherm In huis laadt plan, frigo en lijst en bewaart het resultaat (src/opslag/lijstBijPlan.ts).
import type { Taal } from '@/i18n';
import { frigoBron, trekFrigoAf, type FrigoItem } from '@/lib/frigo';
import { basisId, voegPlanToe, type LijstItem } from '@/lib/lijst';
import type { PlanDag } from '@/lib/planner/types';

/** Wat terug op de boodschappenlijst kwam: het ingrediënt en het gerecht waarvoor. */
export type TerugOpLijst = { naam: string; recept: string };

/**
 * Een lagere hoeveelheid van een ingrediënt van de weekplanner (de groep `ids` van één regel op In huis).
 * Het product telt daarna als gewone voorraad, niet meer als "net gekocht van de lijst" (geen lijstId): zo rekent
 * de boodschappenlijst het tekort uit. De groep wordt één item met de nieuwe hoeveelheid; het oudste exemplaar
 * (ids[0]) blijft, met zijn houdbaarheid en soort.
 */
export function verlaagReceptHoeveelheid(frigo: readonly FrigoItem[], ids: readonly string[], hoeveelheid: number): FrigoItem[] {
  const eerste = frigo.find((f) => f.id === ids[0]);
  if (!eerste) return [...frigo];
  const { lijstId: _weg, ...rest } = eerste;
  const nieuw: FrigoItem = { ...rest, bron: frigoBron(eerste), hoeveelheid };
  return frigo.filter((f) => f.id === ids[0] || !ids.includes(f.id)).map((f) => (f.id === ids[0] ? nieuw : f));
}

/** De totale hoeveelheid van een regel op In huis (de groep `ids`); undefined als ze niet gekend is. */
export function totaleHoeveelheid(frigo: readonly FrigoItem[], ids: readonly string[]): number | undefined {
  const groep = frigo.filter((f) => ids.includes(f.id));
  if (!groep.length || groep.some((f) => f.hoeveelheid === undefined)) return undefined;
  return groep.reduce((som, f) => som + (f.hoeveelheid ?? 0), 0);
}

const afgevinktNietMeerInHuis = (i: LijstItem, gekocht: ReadonlySet<string>) =>
  !!i.recept && i.afgevinkt && !gekocht.has(i.id) && !gekocht.has(basisId(i));

/**
 * De boodschappenlijst na een wijziging bij In huis, en wat er terug op kwam.
 * - Zoals altijd: de ingrediënten van de open bevestigde dagen, min wat in huis is (WEEK-134).
 * - Nieuw: een afgevinkt ingrediënt van een gerecht dat niet meer in huis ligt (het gekochte product is weg of
 *   verlaagd), staat weer open, zodat het tekort zichtbaar is.
 * - Losse producten ("Andere producten") veranderen niet.
 */
export function lijstNaFrigo(
  bestaand: readonly LijstItem[],
  dagen: readonly PlanDag[],
  taal: Taal,
  frigo: readonly FrigoItem[],
  sleutel: string
): { lijst: LijstItem[]; terug: TerugOpLijst[] } {
  const gekocht = new Set(frigo.map((f) => f.lijstId).filter((id): id is string => !!id));
  const lijst = voegPlanToe(bestaand, dagen, taal, (items) => trekFrigoAf(items, frigo), sleutel).map((i) => {
    if (!afgevinktNietMeerInHuis(i, gekocht)) return i;
    const { afgevinktDoor: _d, ...open } = i;
    return { ...open, afgevinkt: false };
  });
  const voor = new Map(bestaand.map((i) => [i.id, i]));
  const terug = lijst
    .filter((i) => i.recept && !i.afgevinkt)
    .filter((i) => {
      const v = voor.get(i.id);
      return !v || v.afgevinkt || (i.hoeveelheid !== undefined && (v.hoeveelheid ?? 0) < i.hoeveelheid);
    })
    .map((i) => ({ naam: i.naam, recept: i.recept!.naam }));
  return { lijst, terug };
}

/** De tekst van de melding: "rijst (Linzencurry), ui (Stoofvlees)". */
export function terugTekst(terug: readonly TerugOpLijst[]): string {
  return terug.map((t) => `${t.naam} (${t.recept})`).join(', ');
}
