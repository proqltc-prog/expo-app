// Het weekmenu als stappen (WEEK-68 deel 4b): periode, moment, stijl, vermijden, plan.
// Pure logica: het scherm toont de stap, deze module bepaalt de volgorde en wat er mag.
import type { Moment } from '@/data/receptenbank';
import { behoudGeldige, kooktijdVoorMomenten, stijlVoorMomenten, standaardStijlen, vermijdVoorMomenten } from '@/lib/planner/opties';

export const FASEN = ['periode', 'moment', 'stijl', 'vermijden', 'plan'] as const;
export type Fase = (typeof FASEN)[number];

export type Keuzes = {
  aantalDagen: number;
  /** De gekozen datums van de periode (WEEK-97). */
  datums: string[];
  /** Dagen binnen het bereik die de gebruiker uitgeschakeld heeft (WEEK-97). */
  uitgesloten: string[];
  momenten: Moment[];
  kooktijden: string[];
  stijlen: string[];
  vermijd: string[];
};

/** De stap na deze, of undefined bij de laatste. */
export function volgendeFase(fase: Fase): Fase | undefined {
  return FASEN[FASEN.indexOf(fase) + 1];
}

/** De stap ervoor, of undefined bij de eerste. */
export function vorigeFase(fase: Fase): Fase | undefined {
  const i = FASEN.indexOf(fase);
  return i > 0 ? FASEN[i - 1] : undefined;
}

/**
 * Mag de gebruiker naar de volgende stap?
 * Periode is altijd gekozen. Moment vraagt minstens één moment en één kooktijd.
 * Stijl vraagt minstens één stijl. Vermijden is optioneel.
 */
export function kanVerder(fase: Fase, keuzes: Keuzes): boolean {
  switch (fase) {
    case 'periode':
      return keuzes.aantalDagen >= 1;
    case 'moment':
      return keuzes.momenten.length > 0 && keuzes.kooktijden.length > 0;
    case 'stijl':
      return keuzes.stijlen.length > 0;
    case 'vermijden':
    case 'plan':
      return true;
  }
}

/**
 * Welke melding hoort er onder de knop "Volgende" als de gebruiker nog niet verder kan?
 * undefined als er niets ontbreekt of de stap altijd mag.
 */
export function ontbrekendeVoorkeur(fase: Fase, keuzes: Keuzes): 'planning.meld.moment' | 'planning.meld.stijl' | undefined {
  if (kanVerder(fase, keuzes)) return undefined;
  if (fase === 'moment') return 'planning.meld.moment';
  if (fase === 'stijl') return 'planning.meld.stijl';
  return undefined;
}

/**
 * Past de keuzes aan als de momenten veranderen: een kooktijd, stijl of vermijd-keuze die bij geen
 * enkel gekozen moment meer hoort, valt weg. Blijft een stijl leeg, dan krijgt die de standaard van het eerste moment.
 */
export function wijzigMomenten(keuzes: Keuzes, momenten: Moment[]): Keuzes {
  const kooktijden = behoudGeldige(keuzes.kooktijden, kooktijdVoorMomenten(momenten));
  let stijlen = behoudGeldige(keuzes.stijlen, stijlVoorMomenten(momenten));
  if (!stijlen.length && momenten.length) {
    stijlen = standaardStijlen(momenten[0]).filter((id) => stijlVoorMomenten(momenten).some((o) => o.id === id));
  }
  const vermijd = behoudGeldige(keuzes.vermijd, vermijdVoorMomenten(momenten));
  return { ...keuzes, momenten, kooktijden, stijlen, vermijd };
}
