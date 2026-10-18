// Lokale planner: stelt een weekplan samen uit de receptenbank, zonder internet.
// Wordt gebruikt als er geen AI-planner is ingesteld of als die faalt.
import { afdelingVan, ingredientNaam } from '@/data/ingredienten';
import { PERIODE_STANDAARD } from './periode';
import { momentVan, normaliseerMomenten } from './moment';
import { BankRecept, Moment, RECEPTENBANK, Soort } from '@/data/receptenbank';
import type { Taal } from '@/i18n';
import { porties as berekenPorties, rondAf } from './hoeveelheid';
import { DagCode, KooktijdCode, kooktijdVan, PlanDag, PlanRecept, PlanVerzoek, Weekplan, WEEKDAGEN } from './types';
import type { StijlCode } from '@/data/receptenbank';
import { kiesEersteDag, markeerUitFrigo } from './frigovoorrang';
import { bankReceptVermijdt } from './vermijden';

export const STANDAARD_AANTAL_DAGEN = PERIODE_STANDAARD;

/** Eenvoudige, reproduceerbare toevalsgenerator (mulberry32). */
export function toeval(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function toegestaneSoorten(): Soort[] {
  return ['vlees', 'vegetarisch', 'vis'];
}

/** Volgorde van soorten over de week: afwisselend. */
export function soortenSchema(aantal: number): Soort[] {
  const cyclus = toegestaneSoorten();
  return Array.from({ length: aantal }, (_, i) => cyclus[i % cyclus.length]);
}

/** Recepten van alle soorten uit de bank. */
export function passendeRecepten(bank: readonly BankRecept[] = RECEPTENBANK): BankRecept[] {
  const soorten = toegestaneSoorten();
  return bank.filter((r) => soorten.includes(r.soort));
}

/** Score: hoger = beter. Liefst geen uren in de keuken op een weekdag. */
function voorkeurScore(r: BankRecept): number {
  return r.minuten > 60 ? -1 : 0;
}

/** Zet een recept uit de bank om naar een planrecept in de juiste taal en voor het juiste aantal porties. */
export function naarPlanRecept(r: BankRecept, taal: Taal, porties: number): PlanRecept {
  const index = ['nl', 'fr', 'de', 'en', 'es', 'pt'].indexOf(taal);
  return {
    id: r.id,
    naam: r.namen[index],
    soort: r.soort,
    minuten: r.minuten,
    stijlen: [...r.stijlen],
    basis: r.basis,
    ingredienten: r.ingredienten.map(([code, hoeveelheid, eenheid]) => ({
      naam: ingredientNaam(code, taal),
      hoeveelheid: rondAf(hoeveelheid * porties, eenheid),
      eenheid,
      afdeling: afdelingVan(code),
    })),
  };
}

type Keuze = { gekozen: BankRecept[]; dag: number };

/**
 * Kiest één recept voor een dag. Zorgt voor afwisseling: geen recept twee keer,
 * niet dezelfde basis (pasta, rijst…) twee dagen na elkaar en maximaal twee keer per week.
 * Versoepelt die regels stap voor stap als er anders niets overblijft.
 */
export function kiesRecept(
  kandidaten: BankRecept[],
  gewensteSoort: Soort | undefined,
  rond: Keuze,
  random: () => number
): BankRecept | undefined {
  const { gekozen, dag } = rond;
  const vorige = gekozen[dag - 1];
  const basisTelling = (b: string) => gekozen.filter((g) => g.basis === b).length;

  const regels: ((r: BankRecept) => boolean)[] = [
    (r) => !gekozen.some((g) => g.id === r.id),
    (r) => gewensteSoort === undefined || r.soort === gewensteSoort,
    (r) => !vorige || r.basis !== vorige.basis,
    (r) => basisTelling(r.basis) < 2,
  ];

  // Probeer eerst alle regels, laat dan achteraan regels vallen (maar nooit "geen dubbel recept" zolang het kan).
  for (let aantalRegels = regels.length; aantalRegels >= 1; aantalRegels--) {
    const actief = regels.slice(0, aantalRegels);
    const pool = kandidaten.filter((r) => actief.every((regel) => regel(r)));
    if (pool.length) return kiesBeste(pool, random);
  }
  // Alles is al gebruikt: dan mag een recept toch terugkomen.
  return kandidaten.length ? kiesBeste(kandidaten, random) : undefined;
}

function kiesBeste(pool: BankRecept[], random: () => number): BankRecept {
  const scores = pool.map((r) => voorkeurScore(r));
  const max = Math.max(...scores);
  const besten = pool.filter((_, i) => scores[i] >= max - 1);
  return besten[Math.floor(random() * besten.length)];
}

/**
 * Past de keuzes voor kooktijd en stijl toe (leeg = alles mag).
 * Blijft er te weinig over voor het aantal dagen, dan laat de planner eerst de stijl
 * en daarna de kooktijd los, en meldt dat met `versoepeld`.
 */
export function filterOpKeuzes(
  recepten: BankRecept[],
  kooktijden: readonly KooktijdCode[],
  stijlen: readonly StijlCode[],
  nodig: number
): { recepten: BankRecept[]; versoepeld: boolean } {
  const pastTijd = (r: BankRecept) => !kooktijden.length || kooktijden.includes(kooktijdVan(r.minuten));
  const pastStijl = (r: BankRecept) => !stijlen.length || r.stijlen.some((s) => stijlen.includes(s));

  const beide = recepten.filter((r) => pastTijd(r) && pastStijl(r));
  if (beide.length >= nodig) return { recepten: beide, versoepeld: false };

  // Te weinig: vul aan met recepten die wel de kooktijd halen, dan met de rest.
  const aanvulling = [
    ...recepten.filter((r) => pastTijd(r) && !beide.includes(r)),
    ...recepten.filter((r) => !pastTijd(r)),
  ];
  return { recepten: [...beide, ...aanvulling.slice(0, Math.max(0, nodig - beide.length))], versoepeld: true };
}

export function dagenVoorPlan(aantal: number): DagCode[] {
  return WEEKDAGEN.slice(0, Math.min(7, Math.max(1, aantal)));
}

export function planLokaal(verzoek: PlanVerzoek, bank: readonly BankRecept[] = RECEPTENBANK): Weekplan {
  const dagen = dagenVoorPlan(verzoek.aantalDagen ?? STANDAARD_AANTAL_DAGEN);
  const momenten = normaliseerMomenten(verzoek.momenten);
  // Elke dag krijgt één plek per gekozen moment, dag voor dag (WEEK-43).
  const sloten = dagen.flatMap((dag) => momenten.map((moment) => ({ dag, moment })));
  const random = toeval(verzoek.seed ?? Date.now());
  const beschikbaar = bank.filter((r) => !bankReceptVermijdt(r, verzoek.vermijd ?? []));
  let versoepeld = false;
  const kandidatenPerMoment = new Map<Moment, BankRecept[]>();
  for (const moment of momenten) {
    const keuze = filterOpKeuzes(
      passendeRecepten(beschikbaar.filter((r) => momentVan(r) === moment)),
      verzoek.kooktijden,
      verzoek.stijlen,
      dagen.length
    );
    versoepeld ||= keuze.versoepeld;
    kandidatenPerMoment.set(moment, keuze.recepten);
  }
  const schema = soortenSchema(sloten.length);
  const porties = berekenPorties(verzoek.profiel);

  const gekozen: BankRecept[] = [];
  const planDagen: PlanDag[] = [];
  // Frigo-voorrang (WEEK-12): de eerste plek maakt op wat al (het langst) in huis is.
  const eerste = verzoek.frigo?.length
    ? kiesEersteDag(kandidatenPerMoment.get(sloten[0].moment) ?? [], verzoek.frigo, verzoek.taal, new Date())
    : undefined;
  sloten.forEach(({ dag, moment }, i) => {
    const kandidaten = kandidatenPerMoment.get(moment) ?? [];
    const recept = i === 0 && eerste ? eerste : kiesRecept(kandidaten, schema[i], { gekozen, dag: i }, random);
    if (!recept) return;
    gekozen.push(recept);
    // Het moment staat er enkel bij als het niet het gewone avondplan is.
    const momentVeld = momenten.length > 1 || moment !== 'avond' ? { moment } : {};
    planDagen.push({ dag, ...momentVeld, recept: naarPlanRecept(recept, verzoek.taal, porties) });
  });

  return {
    dagen: verzoek.frigo?.length ? markeerUitFrigo(planDagen, verzoek.frigo) : planDagen,
    kooktijden: verzoek.kooktijden,
    stijlen: verzoek.stijlen,
    ...(verzoek.vermijd?.length ? { vermijd: verzoek.vermijd } : {}),
    taal: verzoek.taal,
    porties,
    bron: 'lokaal',
    gemaaktOp: new Date().toISOString(),
    ...(versoepeld ? { versoepeld: true } : {}),
  };
}
