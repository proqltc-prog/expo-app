// Zelf kiezen en verwijderen van een maaltijd in het weekmenu (WEEK-44).
// Pure logica: het scherm schrijft het resultaat weg.
import { Moment, MOMENTEN, StijlCode } from '@/data/recept';
import type { Vermijd } from '@/data/vermijden';
import type { Taal } from '@/i18n';
import { afdelingVanEigen, EigenRecept } from '@/lib/eigenrecepten';
import type { LijstItem } from '@/lib/lijst';
import { geschaaldeHoeveelheid, Gezin } from '@/lib/schaal';
import type { DbPoolRecept } from './dbplan';
import { kooktijdVan, DagCode, KooktijdCode, PlanDag, PlanRecept, Weekplan, WEEKDAGEN } from './types';
import { momentVan } from './moment';
import { heeftVermijdNaam } from './vermijden';

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

const momentVolgorde = (m: Moment) => MOMENTEN.indexOf(m);

/**
 * Recepten uit de databank (WEEK-191, tab "Ontdek"), gefilterd op de voorkeuren en de zoekterm.
 * Het moment, de kooktijd, de stijl, de vermijd-ingrediënten en de zoekterm bepalen de lijst.
 */
export function kiesbarePoolRecepten(pool: readonly DbPoolRecept[], f: KiesFilter): DbPoolRecept[] {
  const zoek = zoeksleutel(f.zoek);
  return pool.filter(
    (k) =>
      k.moment === f.moment &&
      (!f.kooktijden.length || f.kooktijden.includes(k.kooktijd)) &&
      (!f.stijlen.length || k.stijlen.some((s) => f.stijlen.includes(s))) &&
      !heeftVermijdNaam(k.recept.ingredienten, f.vermijd) &&
      (!f.enkelVegetarisch || k.soort === 'vegetarisch') &&
      (!zoek || zoeksleutel(k.recept.naam).includes(zoek))
  );
}

/**
 * Eigen recepten van het gezin (WEEK-191, tab "Ons gezin"). Eigen recepten gelden als avondeten.
 * De gezinsstijl (WEEK-192) laat het stijl-filter altijd door; andere eigen recepten vallen onder de gekozen stijlen.
 */
export function kiesbareEigenRecepten(lijst: readonly EigenRecept[], f: KiesFilter): EigenRecept[] {
  const zoek = zoeksleutel(f.zoek);
  return lijst.filter(
    (r) =>
      f.moment === 'avond' &&
      (!f.kooktijden.length || f.kooktijden.includes(kooktijdVan(r.minuten))) &&
      (!f.stijlen.length || r.gezinStijl === true || r.stijlen.some((s) => f.stijlen.includes(s))) &&
      !heeftVermijdNaam(r.ingredienten, f.vermijd) &&
      (!f.enkelVegetarisch || r.soort === 'vegetarisch') &&
      (!zoek || zoeksleutel(r.naam).includes(zoek))
  );
}

/** Zet een eigen recept om naar een planrecept, met de gezinsgrootte als schaal (zoals de databank). */
export function eigenNaarPlanRecept(r: EigenRecept, gezin: Gezin): PlanRecept {
  return {
    id: r.id,
    naam: r.naam,
    soort: r.soort,
    minuten: r.minuten,
    stijlen: [...r.stijlen],
    ingredienten: r.ingredienten.map((i) => ({
      naam: i.naam,
      hoeveelheid: geschaaldeHoeveelheid(i.hoeveelheid, gezin, i.eenheid),
      eenheid: i.eenheid,
      ...(afdelingVanEigen(i) ? { afdeling: afdelingVanEigen(i) } : {}),
      ...(i.code ? { code: i.code } : {}),
    })),
  };
}

/** Zet een ander recept op dezelfde plek: dag, moment en datum blijven, de voortgang (gekookt, frigo) gaat weg. */
export function vervangDoorPlanRecept(plan: Weekplan, index: number, recept: PlanRecept): Weekplan {
  const huidig = plan.dagen[index];
  if (!huidig) return plan;
  const nieuw: PlanDag = {
    dag: huidig.dag,
    ...(huidig.moment ? { moment: huidig.moment } : {}),
    ...(huidig.datum ? { datum: huidig.datum } : {}), // WEEK-204: de datum bleef vroeger niet bewaard
    recept,
  };
  return { ...plan, dagen: plan.dagen.map((d, i) => (i === index ? nieuw : d)) };
}

/**
 * Voegt een maaltijd toe op de eerste vrije weekdag voor dat moment.
 * Geeft undefined als er voor dat moment geen dag meer vrij is.
 */
export function voegPlanReceptToe(plan: Weekplan, recept: PlanRecept, moment: Moment): Weekplan | undefined {
  const bezet = new Set<DagCode>(plan.dagen.filter((d) => momentVan(d) === moment).map((d) => d.dag));
  const dag = WEEKDAGEN.find((d) => !bezet.has(d));
  if (!dag) return undefined;
  const nieuw: PlanDag = {
    dag,
    ...(moment !== 'avond' ? { moment } : {}),
    recept,
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
