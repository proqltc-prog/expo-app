// Maaltijdmoment van een plan. De planner kiest enkel avondeten (WEEK-189).
// Recepten zonder moment zijn avondrecepten.
import { BankRecept, Moment, MOMENTEN } from '@/data/receptenbank';

export const MOMENT_STANDAARD: Moment[] = ['avond'];

export function momentVan(recept: Pick<BankRecept, 'moment'>): Moment {
  return recept.moment ?? 'avond';
}

/** Geldige momenten; leeg of onbekend geeft avond. */
export function normaliseerMomenten(ruw: unknown): Moment[] {
  const geldig = Array.isArray(ruw) ? MOMENTEN.filter((m) => (ruw as unknown[]).includes(m)) : [];
  return geldig.length ? [...geldig] : [...MOMENT_STANDAARD];
}

/** true als het plan enkel avondrecepten vraagt (ook als er geen keuze is). */
export function isAlleenAvond(momenten: readonly Moment[] | undefined): boolean {
  return !momenten || momenten.every((m) => m === 'avond');
}
