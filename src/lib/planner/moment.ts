// Maaltijdmoment van een plan: ontbijt, middag en/of avond (WEEK-43).
// Recepten zonder moment zijn avondrecepten; zo blijven de bestaande recepten ongewijzigd.
import { BankRecept, Moment, MOMENTEN } from '@/data/receptenbank';

export const MOMENT_STANDAARD: Moment[] = ['avond'];

export function momentVan(recept: Pick<BankRecept, 'moment'>): Moment {
  return recept.moment ?? 'avond';
}

/** Geldige momenten in vaste volgorde (ontbijt, middag, avond); leeg of onbekend geeft avond. */
export function normaliseerMomenten(ruw: unknown): Moment[] {
  const geldig = Array.isArray(ruw) ? MOMENTEN.filter((m) => (ruw as unknown[]).includes(m)) : [];
  return geldig.length ? [...geldig] : [...MOMENT_STANDAARD];
}

/** true als het plan enkel avondrecepten vraagt (ook als er geen keuze is). */
export function isAlleenAvond(momenten: readonly Moment[] | undefined): boolean {
  return !momenten || momenten.every((m) => m === 'avond');
}
