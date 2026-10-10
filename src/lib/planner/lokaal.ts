// Lokale planner: stelt een weekplan samen uit de receptenbank, zonder internet.
// Wordt gebruikt als er geen AI-planner is ingesteld of als die faalt.
import { afdelingVan, ingredientNaam } from '@/data/ingredienten';
import { BankRecept, RECEPTENBANK, Soort } from '@/data/receptenbank';
import type { Taal } from '@/i18n';
import { leesOpdracht, Wensen } from './opdracht';
import { porties as berekenPorties, rondAf } from './hoeveelheid';
import { DagCode, KooktijdCode, kooktijdVan, PlanDag, PlanRecept, PlanVerzoek, Weekplan, WEEKDAGEN } from './types';
import type { StijlCode } from '@/data/receptenbank';
import { kiesEersteDag, markeerUitFrigo } from './frigovoorrang';

export const STANDAARD_AANTAL_DAGEN = 6;

/** Ingrediënten die het recept duur maken (voor "goedkoop"). */
const DUUR = new Set(['zalmfilet', 'scampi', 'rundvlees', 'kabeljauw']);

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

export function toegestaneSoorten(w: Wensen): Soort[] {
  const soorten: Soort[] = [];
  if (!w.zonderVlees) soorten.push('vlees');
  soorten.push('vegetarisch');
  if (!w.zonderVis) soorten.push('vis');
  return soorten;
}

/** Volgorde van soorten over de week: afwisselend, met extra vis als dat gevraagd is. */
export function soortenSchema(w: Wensen, aantal: number): Soort[] {
  const basis = toegestaneSoorten(w);
  const cyclus = w.meerVis && basis.includes('vis') ? [...basis, 'vis' as Soort] : basis;
  return Array.from({ length: aantal }, (_, i) => cyclus[i % cyclus.length]);
}

/** Recepten die passen bij de harde wensen (nooit vlees of vis als dat niet mag). */
export function passendeRecepten(w: Wensen, bank: readonly BankRecept[] = RECEPTENBANK): BankRecept[] {
  const soorten = toegestaneSoorten(w);
  return bank.filter((r) => soorten.includes(r.soort));
}

/** Score voor zachte wensen: hoger = beter. */
function voorkeurScore(r: BankRecept, w: Wensen): number {
  let score = 0;
  if (w.snel) score += r.minuten <= 20 ? 3 : r.minuten <= 30 ? 1 : -3;
  if (w.gezond) score += (r.stijlen.includes('licht') ? 2 : 0) - (r.stijlen.includes('comfort') ? 2 : 0);
  if (w.goedkoop) score -= r.ingredienten.some(([code]) => DUUR.has(code)) ? 3 : 0;
  // Standaard: liefst geen uren in de keuken op een weekdag.
  if (!w.snel && r.minuten > 60) score -= 1;
  return score;
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
  w: Wensen,
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
    if (pool.length) return kiesBeste(pool, w, random);
  }
  // Alles is al gebruikt: dan mag een recept toch terugkomen.
  return kandidaten.length ? kiesBeste(kandidaten, w, random) : undefined;
}

function kiesBeste(pool: BankRecept[], w: Wensen, random: () => number): BankRecept {
  const scores = pool.map((r) => voorkeurScore(r, w));
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
  const w = leesOpdracht(verzoek.opdracht);
  const dagen = dagenVoorPlan(w.aantalDagen ?? STANDAARD_AANTAL_DAGEN);
  const random = toeval(verzoek.seed ?? Date.now());
  const { recepten: kandidaten, versoepeld } = filterOpKeuzes(
    passendeRecepten(w, bank),
    verzoek.kooktijden,
    verzoek.stijlen,
    dagen.length
  );
  const schema = soortenSchema(w, dagen.length);
  const porties = berekenPorties(verzoek.profiel);

  const gekozen: BankRecept[] = [];
  const planDagen: PlanDag[] = [];
  // Frigo-voorrang (WEEK-12): dag 1 maakt op wat al (het langst) in huis is.
  const eerste = verzoek.frigo?.length ? kiesEersteDag(kandidaten, verzoek.frigo, verzoek.taal, new Date()) : undefined;
  dagen.forEach((dag, i) => {
    const recept = i === 0 && eerste ? eerste : kiesRecept(kandidaten, schema[i], { gekozen, dag: i }, w, random);
    if (!recept) return;
    gekozen.push(recept);
    planDagen.push({ dag, recept: naarPlanRecept(recept, verzoek.taal, porties) });
  });

  return {
    dagen: verzoek.frigo?.length ? markeerUitFrigo(planDagen, verzoek.frigo) : planDagen,
    opdracht: verzoek.opdracht,
    kooktijden: verzoek.kooktijden,
    stijlen: verzoek.stijlen,
    taal: verzoek.taal,
    porties,
    bron: 'lokaal',
    gemaaktOp: new Date().toISOString(),
    ...(versoepeld ? { versoepeld: true } : {}),
  };
}
