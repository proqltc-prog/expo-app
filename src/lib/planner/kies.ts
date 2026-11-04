// Zelf kiezen en verwijderen van een maaltijd in het weekmenu (WEEK-44).
// Pure logica: het scherm schrijft het resultaat weg.
import { BankRecept, Moment, MOMENTEN, StijlCode } from '@/data/receptenbank';
import type { Vermijd } from '@/data/vermijden';
import type { Taal } from '@/i18n';
import type { LijstItem } from '@/lib/lijst';
import { kooktijdVan, DagCode, KooktijdCode, PlanDag, Weekplan, WEEKDAGEN } from './types';
import { momentVan } from './moment';
import { bankReceptVermijdt } from './vermijden';
import { naarPlanRecept } from './lokaal';

const TAAL_INDEX: Taal[] = ['nl', 'fr', 'de', 'en', 'es', 'pt'];

/** Kleine letters, zonder accenten, zodat "croque" ook "Croqué" vindt. */
export const zoeksleutel = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase();

export type KiesFilter = {
  moment: Moment;
  kooktijden: readonly KooktijdCode[];
  stijlen: readonly StijlCode[];
  vermijd: readonly Vermijd[];
  /** WEEK-190: enkel vegetarische recepten. */
  enkelVegetarisch?: boolean;
  zoek: string;
  taal: Taal;
};

/** Recepten die passen bij het moment, de voorkeuren als filter, en de zoekterm. */
export function kiesbareRecepten(bank: readonly BankRecept[], f: KiesFilter): BankRecept[] {
  const zoek = zoeksleutel(f.zoek);
  const idx = Math.max(0, TAAL_INDEX.indexOf(f.taal));
  return bank.filter(
    (r) =>
      momentVan(r) === f.moment &&
      (!f.kooktijden.length || f.kooktijden.includes(kooktijdVan(r.minuten))) &&
      (!f.stijlen.length || r.stijlen.some((s) => f.stijlen.includes(s))) &&
      !bankReceptVermijdt(r, f.vermijd) &&
      (!f.enkelVegetarisch || r.soort === 'vegetarisch') &&
      (!zoek || zoeksleutel(r.namen[idx] ?? r.namen[0]).includes(zoek))
  );
}

const momentVolgorde = (m: Moment) => MOMENTEN.indexOf(m);

/** Zet een ander recept op dezelfde plek: dag en moment blijven, de voortgang (gekookt, frigo) gaat weg. */
export function vervangDoorRecept(plan: Weekplan, index: number, recept: BankRecept): Weekplan {
  const huidig = plan.dagen[index];
  if (!huidig) return plan;
  const nieuw: PlanDag = {
    dag: huidig.dag,
    ...(huidig.moment ? { moment: huidig.moment } : {}),
    recept: naarPlanRecept(recept, plan.taal, plan.porties),
  };
  return { ...plan, dagen: plan.dagen.map((d, i) => (i === index ? nieuw : d)) };
}

/**
 * Voegt een maaltijd toe op de eerste vrije weekdag voor dat moment.
 * Geeft undefined als er voor dat moment geen dag meer vrij is.
 */
export function voegToe(plan: Weekplan, recept: BankRecept, moment: Moment): Weekplan | undefined {
  const bezet = new Set<DagCode>(plan.dagen.filter((d) => momentVan(d) === moment).map((d) => d.dag));
  const dag = WEEKDAGEN.find((d) => !bezet.has(d));
  if (!dag) return undefined;
  const nieuw: PlanDag = {
    dag,
    ...(moment !== 'avond' ? { moment } : {}),
    recept: naarPlanRecept(recept, plan.taal, plan.porties),
  };
  const dagen = [...plan.dagen, nieuw].sort(
    (a, b) =>
      WEEKDAGEN.indexOf(a.dag) - WEEKDAGEN.indexOf(b.dag) || momentVolgorde(momentVan(a)) - momentVolgorde(momentVan(b))
  );
  return { ...plan, dagen };
}

/**
 * Verwijdert de maaltijd op `index`. Enkel als die nog niet gekookt is en nog hetzelfde is als wat het scherm toonde;
 * anders blijft het plan ongewijzigd (een ander gezinslid kan het intussen veranderd hebben).
 */
export function verwijderDag(plan: Weekplan, index: number, verwacht: { gemaaktOp: string; receptNaam: string }): Weekplan {
  const huidig = plan.dagen[index];
  if (!huidig || huidig.gedaan || plan.gemaaktOp !== verwacht.gemaaktOp || huidig.recept.naam !== verwacht.receptNaam) return plan;
  return { ...plan, dagen: plan.dagen.filter((_, i) => i !== index) };
}

/** Haalt de ingrediënten van één recept van de boodschappenlijst. Geeft het aantal verwijderde items terug. */
export function zonderReceptVanLijst(
  items: readonly LijstItem[],
  dag: DagCode,
  naam: string
): { over: LijstItem[]; verwijderd: number } {
  const over: LijstItem[] = items.filter((i) => !(i.recept && i.recept.dag === dag && i.recept.naam === naam));
  return { over, verwijderd: items.length - over.length };
}
