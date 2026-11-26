// Weekplan uit de recepten van de databank (WEEK-68, deel 2); sinds WEEK-208 de enige planner van de app.
// Regels: momenten, kooktijd en stijl eerst, geen herhaling als dat kan,
// en stap voor stap versoepelen als er te weinig recepten zijn. Pure logica, zonder netwerk.
import type { Moment, Soort, StijlCode } from '@/data/recept';
import { isAfgewezen } from './afwijzen';
import type { Seizoen } from '@/data/seizoenen';
import type { Taal } from '@/i18n';
import type { Gezin } from '@/lib/schaal';
import { DbRecept, naarPlanRecept } from '@/lib/planner/db';
import { PERIODE_STANDAARD } from '@/lib/planner/periode';
import { normaliseerMomenten } from '@/lib/planner/moment';
import { schaalFactor } from '@/lib/schaal';
import { toeval } from '@/lib/planner/toeval';
import { binnenKooktijd } from '@/lib/kooktijd';
import { kooktijdVan, KooktijdCode, PlanDag, PlanRecept, PlanVerzoek, Weekplan, WEEKDAGEN } from '@/lib/planner/types';
import { dagenVoorVerzoek, plandagenVoorDatums, voegDatumsToe } from '@/lib/planner/datums';
import { seizoenPasst, seizoenVan } from '@/lib/planner/seizoen';
import type { Vermijd } from '@/data/vermijden';
import { vermijdtRecept } from '@/lib/planner/vermijden';
import { gebruikVoorraad, IN_HUIS_DREMPEL, inHuisScore, maakVoorraad } from '@/lib/planner/frigovoorrang';
import type { FrigoItem } from '@/lib/frigo';

/** Recepten met een vermeden ingrediënt vallen altijd weg, ook bij aanvullen (WEEK-116). */
export function zonderVermeden(pool: DbPoolRecept[], vermijd: readonly Vermijd[] | undefined): DbPoolRecept[] {
  if (!vermijd?.length) return pool;
  return pool.filter((k) => !vermijdtRecept({ ingredienten: k.recept.ingredienten, soort: k.soort }, vermijd));
}

/** WEEK-190: met 'enkel vegetarisch' blijven enkel vegetarische recepten over. */
export function enkelVegetarischPool(pool: DbPoolRecept[], enkel: boolean | undefined): DbPoolRecept[] {
  return enkel ? pool.filter((k) => k.soort === 'vegetarisch') : pool;
}

/** Een recept klaar voor de planner, met de eigenschappen waarop gefilterd wordt. */
export type DbPoolRecept = {
  recept: PlanRecept;
  moment: Moment;
  soort: Soort;
  kooktijd: KooktijdCode;
  stijlen: StijlCode[];
  /** Seizoenen waarin het recept past; leeg is het hele jaar (WEEK-156). */
  seizoenen: Seizoen[];
};

/**
 * Zet de databaserecepten om naar de planner-pool. Recepten zonder titel in de taal vallen weg,
 * net als recepten die langer duren dan de bovengrens van een uur (WEEK-199).
 */
export function maakDbPool(recepten: DbRecept[], taal: Taal, gezin: Gezin): DbPoolRecept[] {
  return recepten.flatMap((r) => {
    if (!binnenKooktijd(r.kooktijdMin)) return [];
    const recept = naarPlanRecept(r, taal, gezin);
    return recept
      ? [{ recept, moment: r.moment, soort: r.soort, kooktijd: kooktijdVan(r.kooktijdMin), stijlen: [r.stijl], seizoenen: r.seizoenen ?? [] }]
      : [];
  });
}

/** De wensen die de keuze van een recept bepalen. */
type WensVan = Pick<PlanVerzoek, 'kooktijden' | 'stijlen'>;

/** Bij aanvullen kiest de planner uit de recepten die hooguit zoveel minuten langer zijn dan het kortste (WEEK-122). */
const AANVUL_MARGE_MIN = 20;

/** Kiest bij aanvullen een recept dat kort is: het kortste van de lijst, met een marge, en daaruit willekeurig. */
function kiesKortste(lijst: DbPoolRecept[], random: () => number): DbPoolRecept {
  const kortst = Math.min(...lijst.map((k) => k.recept.minuten));
  const kort = lijst.filter((k) => k.recept.minuten <= kortst + AANVUL_MARGE_MIN);
  return kort[Math.floor(random() * kort.length)];
}

/**
 * Kiest één recept voor een plek (dag + moment). Probeert eerst alle wensen en geen herhaling,
 * daarna wordt stap voor stap losgelaten. Bij aanvullen zonder passende kooktijd gaat het om korte recepten (WEEK-122).
 * Geeft undefined als er geen recept voor het moment is.
 */
function kiesVoorPlek(
  pool: DbPoolRecept[],
  moment: Moment,
  verzoek: WensVan,
  gebruikt: Set<string>,
  random: () => number,
  maxNiveau = 3,
): { recept: PlanRecept; versoepeld: boolean } | undefined {
  const perMoment = pool.filter((k) => k.moment === moment);
  const passendTijd = (k: DbPoolRecept) => !verzoek.kooktijden.length || verzoek.kooktijden.includes(k.kooktijd);
  const passendStijl = (k: DbPoolRecept) => !verzoek.stijlen.length || k.stijlen.some((s) => verzoek.stijlen.includes(s));
  const niet = (k: DbPoolRecept) => !gebruikt.has(k.recept.id);
  const niveaus: ((k: DbPoolRecept) => boolean)[] = [
    (k) => niet(k) && passendTijd(k) && passendStijl(k),
    (k) => niet(k) && passendTijd(k),
    (k) => niet(k),
    () => true,
  ];
  for (let n = 0; n <= Math.min(maxNiveau, niveaus.length - 1); n++) {
    const lijst = perMoment.filter(niveaus[n]);
    if (lijst.length) {
      const keuze = n >= 2 ? kiesKortste(lijst, random) : lijst[Math.floor(random() * lijst.length)];
      return { recept: keuze.recept, versoepeld: n > 0 };
    }
  }
  return undefined;
}

/**
 * Kiest een recept voor een plek op een dag met een seizoen (WEEK-156). De wensen gaan voor het seizoen (WEEK-232):
 * 1. seizoensrecept met alle wensen (kooktijd en stijl), 2. recept van het hele jaar met alle wensen,
 * 3. seizoensrecept met de juiste kooktijd (andere stijl), 4. recept van het hele jaar met de juiste kooktijd,
 * 5. seizoensrecept ongeacht de wensen, 6. recept van het hele jaar ongeacht de wensen.
 * Voorheen liet stap 1 de stijl al los, waardoor een Thais herfstrecept voorging op een Italiaans recept van het
 * hele jaar, ook als er genoeg Italiaanse recepten waren.
 * Recepten van een ander seizoen komen nooit op de dag. Zonder seizoen (geen datum) gedraagt het zich als voorheen.
 * Met alleenWensen blijven enkel de stappen 1 en 2 over: de keuze blijft binnen alle wensen van de weekplanner.
 */
function kiesVoorSeizoen(
  pool: DbPoolRecept[],
  moment: Moment,
  verzoek: WensVan,
  gebruikt: Set<string>,
  random: () => number,
  seizoen: Seizoen | undefined,
  alleenWensen = false,
): { recept: PlanRecept; versoepeld: boolean } | undefined {
  if (!seizoen) return kiesVoorPlek(pool, moment, verzoek, gebruikt, random, alleenWensen ? 0 : 3);
  const metSeizoen = pool.filter((k) => k.seizoenen.includes(seizoen));
  const passend = pool.filter((k) => seizoenPasst(k.seizoenen, seizoen));
  // Per niveau eerst het seizoen, dan het hele jaar: 0 = alle wensen, 1 = juiste kooktijd, 3 = alles.
  const niveaus = alleenWensen ? [0] : [0, 1, 3];
  const stappen = niveaus.flatMap((niveau) => [
    () => kiesVoorPlek(metSeizoen, moment, verzoek, gebruikt, random, niveau),
    () => kiesVoorPlek(passend, moment, verzoek, gebruikt, random, niveau),
  ]);
  for (const stap of stappen) {
    const keuze = stap();
    if (keuze) return keuze;
  }
  return undefined;
}

/** Een gerecht in het seizoen van de dag (niet enkel 'het hele jaar') krijgt bij een gelijke In huis-score een klein voordeel. */
const SEIZOEN_VOORDEEL = 0.25;
/** Uit de gerechten met een score van minstens dit deel van de beste wordt willekeurig gekozen: niet elke week hetzelfde. */
const BIJNA_BESTE = 0.85;

/**
 * WEEK-340: kiest voor een plek het gerecht dat het meest opmaakt van wat In huis ligt.
 * Enkel binnen alle wensen (kooktijd en stijl), nooit buiten het seizoen van de dag, en vanaf een minimale score
 * (IN_HUIS_DREMPEL): olie, specerijen of een bouillonblokje alleen maken van een gerecht geen In huis-gerecht.
 * Geen geschikt gerecht: undefined, dan kiest de planner zoals voorheen (eerst seizoen, dan de rest).
 */
function kiesInHuis(
  pool: DbPoolRecept[],
  moment: Moment,
  verzoek: WensVan,
  gebruikt: Set<string>,
  random: () => number,
  seizoen: Seizoen | undefined,
  frigo: readonly FrigoItem[],
  verbruikt: ReadonlySet<string>,
  nu: Date,
): { recept: PlanRecept; versoepeld: boolean } | undefined {
  if (!frigo.length) return undefined;
  const passendTijd = (k: DbPoolRecept) => !verzoek.kooktijden.length || verzoek.kooktijden.includes(k.kooktijd);
  const passendStijl = (k: DbPoolRecept) => !verzoek.stijlen.length || k.stijlen.some((st) => verzoek.stijlen.includes(st));
  const kandidaten = pool
    .filter((k) => k.moment === moment && !gebruikt.has(k.recept.id) && passendTijd(k) && passendStijl(k))
    .filter((k) => !seizoen || seizoenPasst(k.seizoenen, seizoen))
    .map((k) => ({ k, score: inHuisScore(k.recept.ingredienten, frigo, nu, verbruikt) }))
    .filter((x) => x.score >= IN_HUIS_DREMPEL)
    .map((x) => ({ ...x, score: x.score + (seizoen && x.k.seizoenen.includes(seizoen) ? SEIZOEN_VOORDEEL : 0) }));
  if (!kandidaten.length) return undefined;
  const beste = Math.max(...kandidaten.map((x) => x.score));
  const top = kandidaten.filter((x) => x.score >= beste * BIJNA_BESTE);
  return { recept: top[Math.floor(random() * top.length)].k.recept, versoepeld: false };
}

/** Stelt een weekplan samen uit de databaserecepten. Geeft undefined als er voor geen enkel gekozen moment recepten zijn. */
export function planUitDatabase(verzoek: PlanVerzoek, invoer: DbPoolRecept[]): Weekplan | undefined {
  const momenten = normaliseerMomenten(verzoek.momenten);
  const pool = enkelVegetarischPool(zonderVermeden(invoer, verzoek.vermijd), verzoek.enkelVegetarisch);
  if (!pool.some((k) => momenten.includes(k.moment))) return undefined;
  const random = toeval(verzoek.seed ?? Date.now());
  const gebruikt = new Set<string>();
  const planDagen: PlanDag[] = [];
  let versoepeld = false;
  const seizoenPerDag = new Map(plandagenVoorDatums(verzoek.datums ?? []).map((p) => [p.dag, seizoenVan(p.datum)]));
  // WEEK-340 (vervangt WEEK-188): volgorde 1. wat In huis ligt (gewogen, zie kiesInHuis), 2. het seizoen, 3. de rest.
  // Een hoofdingrediënt dat al voor een dag opgemaakt wordt, telt voor de volgende dagen niet opnieuw.
  const frigo = verzoek.frigo ?? [];
  const verbruikt = new Set<string>();
  const voorraad = maakVoorraad(frigo);
  const nu = new Date();
  for (const dag of dagenVoorVerzoek(verzoek, PERIODE_STANDAARD)) {
    for (const moment of momenten) {
      const seizoen = seizoenPerDag.get(dag);
      const keuze =
        kiesInHuis(pool, moment, verzoek, gebruikt, random, seizoen, frigo, verbruikt, nu) ??
        kiesVoorSeizoen(pool, moment, verzoek, gebruikt, random, seizoen);
      if (!keuze) continue;
      versoepeld ||= keuze.versoepeld;
      gebruikt.add(keuze.recept.id);
      gebruikVoorraad(voorraad, keuze.recept.ingredienten, verbruikt);
      planDagen.push({ dag, moment, recept: keuze.recept });
    }
  }
  return {
    dagen: voegDatumsToe(planDagen, verzoek.datums),
    kooktijden: [...verzoek.kooktijden],
    stijlen: [...verzoek.stijlen],
    vermijd: verzoek.vermijd,
    ...(verzoek.enkelVegetarisch ? { enkelVegetarisch: true } : {}),
    taal: verzoek.taal,
    porties: schaalFactor(verzoek.profiel),
    bron: 'db',
    gemaaktOp: new Date().toISOString(),
    versoepeld: versoepeld || undefined,
  };
}

/**
 * Vervangt het recept van één dag (index in het plan) door een ander recept voor hetzelfde moment.
 * Recepten die al op het plan staan, worden vermeden zolang er genoeg andere zijn.
 */
export function vervangDbDag(plan: Weekplan, index: number, pool: DbPoolRecept[], seed: number, frigo: readonly FrigoItem[] = []): Weekplan {
  const doel = plan.dagen[index];
  if (!doel) return plan;
  const gebruikt = new Set(plan.dagen.map((d) => d.recept.id));
  // WEEK-170: het huidige recept wordt nooit teruggegeven; anders doet de pijl niets als de pool klein is.
  // WEEK-184: een eerder vervangen recept komt in deze week nergens meer terug.
  const kandidaten = enkelVegetarischPool(zonderVermeden(pool, plan.vermijd), plan.enkelVegetarisch).filter((k) => k.recept.id !== doel.recept.id && !isAfgewezen(plan, k.recept.id));
  // WEEK-340: ook een ander gerecht kiest eerst wat In huis ligt (zonder wat de andere dagen al opmaken).
  const wens = { kooktijden: plan.kooktijden, stijlen: plan.stijlen };
  const verbruikt = new Set<string>();
  const voorraad = maakVoorraad(frigo);
  for (const d of plan.dagen.filter((_, i) => i !== index)) gebruikVoorraad(voorraad, d.recept.ingredienten, verbruikt);
  const random = toeval(seed);
  const keuze =
    kiesInHuis(kandidaten, doel.moment ?? 'avond', wens, gebruikt, random, seizoenVan(doel.datum), frigo, verbruikt, new Date()) ??
    kiesVoorSeizoen(kandidaten, doel.moment ?? 'avond', wens, gebruikt, random, seizoenVan(doel.datum));
  if (!keuze) return plan;
  const dagen = plan.dagen.map((d, i) => (i === index ? { ...d, recept: keuze.recept, gedaan: undefined, verbruikt: undefined, ontbreekt: undefined, uitFrigo: undefined } : d));
  return { ...plan, dagen };
}
