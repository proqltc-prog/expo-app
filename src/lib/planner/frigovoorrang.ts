// Frigo-voorrang bij het plannen (WEEK-12, WEEK-188): recepten die opmaken wat al in huis is, komen eerst.
// De oudste producten wegen het zwaarst.
import { ingredientInfo } from '@/data/ingredienten';
import { codeVan, FrigoItem, omrekenFactor, receptFrigo } from '@/lib/frigo';

const klein = (t: string) => t.trim().toLocaleLowerCase();
const DAG_MS = 24 * 60 * 60 * 1000;

/** Een ingrediënt zoals de planner het kent: de naam en, als die er is, de vaste code. */
export type ScoreIngredient = { naam: string; code?: string };

/** Zoals frigoScoreIngredienten, maar voor ingrediëntnamen zonder code (bv. van een eigen recept). */
export function frigoScoreNamen(namen: readonly string[], frigo: readonly FrigoItem[], nu: Date): number {
  return frigoScoreIngredienten(namen.map((naam) => ({ naam })), frigo, nu);
}

/**
 * Hoort dit frigo-product bij dit ingrediënt? Op de databankcode als beide er een hebben (eigen code of afgeleid
 * van de naam in een van de talen, WEEK-206) — taalonafhankelijk, zoals Gekookt en de lijst (WEEK-159/160).
 * Anders op de naam, het vangnet voor producten zonder code.
 */
function zelfdeIngredient(f: FrigoItem, ing: ScoreIngredient): boolean {
  const cf = codeVan(f);
  const ci = codeVan(ing);
  return cf && ci ? cf === ci : klein(f.naam) === klein(ing.naam);
}

/**
 * Hoeveel gebruikt een recept van wat in de frigo ligt? Elk ingrediënt dat in de frigo zit, telt mee
 * met 1 + het aantal dagen dat het oudste exemplaar er al ligt: oudere producten wegen zwaarder.
 * Enkel planner-producten tellen mee; losse producten niet (WEEK-158).
 */
export function frigoScoreIngredienten(ingredienten: readonly ScoreIngredient[], frigo: readonly FrigoItem[], nu: Date): number {
  let score = 0;
  const vanPlanner = receptFrigo(frigo);
  for (const ing of ingredienten) {
    const passend = vanPlanner.filter((f) => zelfdeIngredient(f, ing));
    if (!passend.length) continue;
    const oudste = Math.min(...passend.map((f) => Date.parse(f.toegevoegdOp)).filter((t) => !Number.isNaN(t)));
    const dagen = Number.isFinite(oudste) ? Math.max(0, (nu.getTime() - oudste) / DAG_MS) : 0;
    score += 1 + dagen;
  }
  return score;
}

// ---------------------------------------------------------------- WEEK-340: In huis eerst, met gewicht per soort

/**
 * Hoe zwaar een ingrediënt uit In huis weegt, volgens zijn categorie in de databank.
 * Hoofdingrediënten (wat je echt wil opmaken) tellen volledig; granen, noten en verse kruiden half;
 * basisvoorraad (olie, specerijen, sauzen, suiker) bijna niet: die ligt altijd in huis en mag het menu niet sturen.
 */
const GEWICHT: Record<string, number> = {
  groente: 1,
  fruit: 1,
  vlees: 1,
  vis: 1,
  zuivel: 1,
  ei: 1,
  eiwit: 1,
  peulvrucht: 1,
  graan: 0.5,
  noten: 0.5,
  kruid: 0.5,
  condiment: 0.1,
  specerij: 0.1,
  vet: 0.1,
  zoet: 0.1,
  overig: 0.1,
};

/** Gewicht van een ingrediënt; onbekend (bv. een eigen ingrediënt zonder code) telt als hoofdingrediënt. */
export function inHuisGewicht(ing: ScoreIngredient): number {
  const code = codeVan(ing);
  const categorie = code ? ingredientInfo(code)?.[0] : undefined;
  return categorie !== undefined ? (GEWICHT[categorie] ?? 0.1) : 1;
}

/** Een gerecht telt pas als "In huis-gerecht" vanaf deze score: minstens één hoofdingrediënt of twee halve. */
export const IN_HUIS_DREMPEL = 1;

/**
 * WEEK-340: hoeveel maakt dit gerecht op van wat In huis ligt?
 * Per ingrediënt (één keer per code) het gewicht van zijn soort, verhoogd als het product al lang in huis ligt
 * (tot +50% na 14 dagen) of bijna vervalt (+50% binnen 3 dagen of al vervallen).
 * `verbruikt`: codes die al door een ander gerecht van het weekmenu opgemaakt worden; die tellen niet opnieuw.
 * Enkel producten van de planner tellen, losse producten niet (WEEK-158).
 */
export function inHuisScore(
  ingredienten: readonly ScoreIngredient[],
  frigo: readonly FrigoItem[],
  nu: Date,
  verbruikt: ReadonlySet<string> = new Set(),
): number {
  const vanPlanner = receptFrigo(frigo);
  if (!vanPlanner.length) return 0;
  const gezien = new Set<string>();
  let score = 0;
  for (const ing of ingredienten) {
    const sleutel = codeVan(ing) ?? klein(ing.naam);
    if (gezien.has(sleutel) || verbruikt.has(sleutel)) continue;
    gezien.add(sleutel);
    const passend = vanPlanner.filter((f) => zelfdeIngredient(f, ing));
    if (!passend.length) continue;
    const tijden = passend.map((f) => Date.parse(f.toegevoegdOp)).filter((t) => !Number.isNaN(t));
    const dagen = tijden.length ? Math.max(0, (nu.getTime() - Math.min(...tijden)) / DAG_MS) : 0;
    const vervalt = passend.some((f) => {
      const t = f.houdbaarTot ? Date.parse(f.houdbaarTot) : NaN;
      return !Number.isNaN(t) && (t - nu.getTime()) / DAG_MS <= 3;
    });
    score += inHuisGewicht(ing) * (1 + Math.min(dagen, 14) / 28) * (vervalt ? 1.5 : 1);
  }
  return score;
}

/**
 * WEEK-340: wat er van elk hoofdingrediënt nog In huis ligt terwijl het weekmenu dag per dag gevuld wordt.
 * Per code de totale hoeveelheid in de eenheid van het eerste product; undefined = hoeveelheid onbekend.
 */
export type Voorraad = Map<string, { hoeveelheid?: number; eenheid?: string }>;

export function maakVoorraad(frigo: readonly FrigoItem[]): Voorraad {
  const voorraad: Voorraad = new Map();
  for (const f of receptFrigo(frigo)) {
    const sleutel = codeVan(f) ?? klein(f.naam);
    const nu = voorraad.get(sleutel);
    if (!nu) {
      voorraad.set(sleutel, { hoeveelheid: f.hoeveelheid, eenheid: f.eenheid });
      continue;
    }
    const factor = omrekenFactor(f.eenheid, nu.eenheid);
    nu.hoeveelheid = nu.hoeveelheid !== undefined && f.hoeveelheid !== undefined && factor !== undefined ? nu.hoeveelheid + f.hoeveelheid * factor : undefined;
  }
  return voorraad;
}

/**
 * Trekt af wat een gekozen gerecht van de hoofdingrediënten (gewicht ≥ 0,5) gebruikt. Wat op is (of waarvan we de
 * hoeveelheid niet kunnen vergelijken), komt in "verbruikt" en telt voor de volgende dagen niet meer mee.
 * Zo blijft een grote zak rijst meetellen, maar een bloemkool die vandaag opgaat niet.
 */
export function gebruikVoorraad(voorraad: Voorraad, ingredienten: readonly (ScoreIngredient & { hoeveelheid?: number; eenheid?: string })[], verbruikt: Set<string>): void {
  for (const ing of ingredienten) {
    if (inHuisGewicht(ing) < 0.5) continue;
    const sleutel = codeVan(ing) ?? klein(ing.naam);
    const v = voorraad.get(sleutel);
    if (!v) continue;
    const factor = omrekenFactor(ing.eenheid, v.eenheid);
    if (v.hoeveelheid !== undefined && ing.hoeveelheid !== undefined && ing.hoeveelheid > 0 && factor !== undefined) {
      v.hoeveelheid -= ing.hoeveelheid * factor;
      if (v.hoeveelheid > 0) continue;
    }
    voorraad.delete(sleutel);
    verbruikt.add(sleutel);
  }
}
