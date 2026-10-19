// Weekplan uit de recepten van de database (WEEK-68, deel 2).
// Zelfde regels als de lokale planner: momenten, kooktijd en stijl eerst, geen herhaling als dat kan,
// en stap voor stap versoepelen als er te weinig recepten zijn. Pure logica, zonder netwerk.
import type { Moment, StijlCode } from '@/data/receptenbank';
import type { Taal } from '@/i18n';
import type { Gezin } from '@/lib/schaal';
import { DbRecept, naarPlanRecept } from '@/lib/planner/db';
import { PERIODE_STANDAARD } from '@/lib/planner/periode';
import { normaliseerMomenten } from '@/lib/planner/moment';
import { porties as berekenPorties } from '@/lib/planner/hoeveelheid';
import { toeval } from '@/lib/planner/lokaal';
import { kooktijdVan, KooktijdCode, PlanDag, PlanRecept, PlanVerzoek, Weekplan, WEEKDAGEN } from '@/lib/planner/types';
import { dagenVoorVerzoek, voegDatumsToe } from '@/lib/planner/datums';

/** Een recept klaar voor de planner, met de eigenschappen waarop gefilterd wordt. */
export type DbPoolRecept = {
  recept: PlanRecept;
  moment: Moment;
  kooktijd: KooktijdCode;
  stijlen: StijlCode[];
};

/** Zet de databaserecepten om naar de planner-pool. Recepten zonder titel in de taal vallen weg. */
export function maakDbPool(recepten: DbRecept[], taal: Taal, gezin: Gezin): DbPoolRecept[] {
  return recepten.flatMap((r) => {
    const recept = naarPlanRecept(r, taal, gezin);
    return recept ? [{ recept, moment: r.moment, kooktijd: kooktijdVan(r.kooktijdMin), stijlen: [r.stijl] }] : [];
  });
}

/** De wensen die de keuze van een recept bepalen. */
type WensVan = Pick<PlanVerzoek, 'kooktijden' | 'stijlen'>;

/**
 * Kiest één recept voor een plek (dag + moment). Probeert eerst alle wensen en geen herhaling,
 * daarna wordt stap voor stap losgelaten. Geeft undefined als er geen recept voor het moment is.
 */
function kiesVoorPlek(
  pool: DbPoolRecept[],
  moment: Moment,
  verzoek: WensVan,
  gebruikt: Set<string>,
  random: () => number,
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
  for (let n = 0; n < niveaus.length; n++) {
    const lijst = perMoment.filter(niveaus[n]);
    if (lijst.length) {
      const keuze = lijst[Math.floor(random() * lijst.length)];
      return { recept: keuze.recept, versoepeld: n > 0 };
    }
  }
  return undefined;
}

/** Stelt een weekplan samen uit de databaserecepten. Geeft undefined als er voor geen enkel gekozen moment recepten zijn. */
export function planUitDatabase(verzoek: PlanVerzoek, pool: DbPoolRecept[]): Weekplan | undefined {
  const momenten = normaliseerMomenten(verzoek.momenten);
  if (!pool.some((k) => momenten.includes(k.moment))) return undefined;
  const random = toeval(verzoek.seed ?? Date.now());
  const gebruikt = new Set<string>();
  const planDagen: PlanDag[] = [];
  let versoepeld = false;
  for (const dag of dagenVoorVerzoek(verzoek, PERIODE_STANDAARD)) {
    for (const moment of momenten) {
      const keuze = kiesVoorPlek(pool, moment, verzoek, gebruikt, random);
      if (!keuze) continue;
      versoepeld ||= keuze.versoepeld;
      gebruikt.add(keuze.recept.id);
      planDagen.push({ dag, moment, recept: keuze.recept });
    }
  }
  return {
    dagen: voegDatumsToe(planDagen, verzoek.datums),
    kooktijden: [...verzoek.kooktijden],
    stijlen: [...verzoek.stijlen],
    vermijd: verzoek.vermijd,
    taal: verzoek.taal,
    porties: berekenPorties(verzoek.profiel),
    bron: 'db',
    gemaaktOp: new Date().toISOString(),
    versoepeld: versoepeld || undefined,
  };
}

/**
 * Vervangt het recept van één dag (index in het plan) door een ander recept voor hetzelfde moment.
 * Recepten die al op het plan staan, worden vermeden zolang er genoeg andere zijn.
 */
export function vervangDbDag(plan: Weekplan, index: number, pool: DbPoolRecept[], seed: number): Weekplan {
  const doel = plan.dagen[index];
  if (!doel) return plan;
  const gebruikt = new Set(plan.dagen.map((d) => d.recept.id));
  const keuze = kiesVoorPlek(pool, doel.moment ?? 'avond', { kooktijden: plan.kooktijden, stijlen: plan.stijlen }, gebruikt, toeval(seed));
  if (!keuze || keuze.recept.id === doel.recept.id) return plan;
  const dagen = plan.dagen.map((d, i) => (i === index ? { ...d, recept: keuze.recept, gedaan: undefined, verbruikt: undefined, ontbreekt: undefined, uitFrigo: undefined } : d));
  return { ...plan, dagen };
}
