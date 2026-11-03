// Reset van één dag (WEEK-11): enkel die dag krijgt een nieuw recept, de rest van de week blijft staan.
// Het nieuwe recept houdt rekening met de andere dagen (variatie) en met de oorspronkelijke wensen. Lokaal, zonder AI (WEEK-116).
import { BankRecept, RECEPTENBANK } from '@/data/receptenbank';
import type { Profiel } from '@/lib/profiel';
import { filterOpKeuzes, naarPlanRecept, passendeRecepten, toeval } from './lokaal';
import { bankReceptVermijdt } from './vermijden';
import { isAfgewezen } from './afwijzen';
import { momentVan } from './moment';
import type { PlanVerzoek, Weekplan } from './types';

const naamSleutel = (naam: string) => naam.trim().toLocaleLowerCase();

/**
 * Kiest lokaal een vervangrecept voor dag `index`. Regels, van belangrijk naar minder belangrijk
 * (de minst belangrijke vallen weg als er anders niets overblijft):
 * 1. niet hetzelfde recept als ergens in de week (ook niet het huidige)
 * 2. niet dezelfde basis (pasta, rijst…) als de dag ervoor of erna
 * 3. elke basis maximaal twee keer per week
 * 4. dezelfde soort (vlees/vis/vegetarisch) als de dag die vervangen wordt, zodat de week in balans blijft
 * Harde wensen (geen vlees/vis) en de gekozen kooktijd/stijl gelden altijd zoals bij het plannen.
 */
export function kiesVervanging(
  plan: Weekplan,
  index: number,
  seed: number,
  bank: readonly BankRecept[] = RECEPTENBANK
): BankRecept | undefined {
  const huidig = plan.dagen[index];
  if (!huidig) return undefined;
  // Een ontbijt wordt weer een ontbijt, een avondrecept weer een avondrecept (WEEK-43).
  const moment = huidig.moment ?? 'avond';
  // WEEK-184: een eerder vervangen recept komt in deze week nergens meer terug.
  const toegestaan = bank.filter((r) => !bankReceptVermijdt(r, plan.vermijd ?? []) && !isAfgewezen(plan, r.id) && momentVan(r) === moment);
  const { recepten } = filterOpKeuzes(passendeRecepten(toegestaan), plan.kooktijden, plan.stijlen, 1);

  const andereDagen = plan.dagen.filter((_, i) => i !== index);
  const gebruikteIds = new Set(plan.dagen.map((d) => d.recept.id));
  const gebruikteNamen = new Set(plan.dagen.map((d) => naamSleutel(d.recept.naam)));
  const buren = [plan.dagen[index - 1], plan.dagen[index + 1]].filter(Boolean).map((d) => d.recept.basis);
  const basisTelling = (b: string) => andereDagen.filter((d) => d.recept.basis === b).length;
  const taalIndex = ['nl', 'fr', 'de', 'en', 'es', 'pt'].indexOf(plan.taal);

  const regels: ((r: BankRecept) => boolean)[] = [
    (r) => !gebruikteIds.has(r.id) && !gebruikteNamen.has(naamSleutel(r.namen[taalIndex])),
    (r) => !buren.includes(r.basis),
    (r) => basisTelling(r.basis) < 2,
    (r) => r.soort === huidig.recept.soort,
  ];

  const random = toeval(seed);
  for (let aantal = regels.length; aantal >= 1; aantal--) {
    const pool = recepten.filter((r) => regels.slice(0, aantal).every((regel) => regel(r)));
    if (pool.length) return pool[Math.floor(random() * pool.length)];
  }
  return undefined;
}

/** Vervangt dag `index` lokaal. Geeft het plan ongewijzigd terug als er geen enkel ander recept mogelijk is. */
export function resetDagLokaal(plan: Weekplan, index: number, seed: number = Date.now()): Weekplan {
  const nieuw = kiesVervanging(plan, index, seed);
  if (!nieuw) return plan;
  return {
    ...plan,
    dagen: plan.dagen.map((d, i) =>
      i === index ? { dag: d.dag, ...(d.moment ? { moment: d.moment } : {}), recept: naarPlanRecept(nieuw, plan.taal, plan.porties) } : d
    ),
  };
}
