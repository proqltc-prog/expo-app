// Keuzes voor het avondeten in het weekmenu (WEEK-68, deel 4; WEEK-189: enkel avond). Pure logica.
// Pure logica. De schermen tonen de lijsten; de planner filtert er later op.
import type { Moment } from '@/data/recept';
import { KOOKTIJD_BEREIK, KOOKTIJDEN, KooktijdCode } from '@/lib/kooktijd';

export type KooktijdOptie = { id: string; naam: string; van: number; tot: number };
export type Optie = { id: string; naam: string };

// WEEK-199: dezelfde drie kooktijden als in de databank, met het bereik uit src/lib/kooktijd.ts.
const KOOKTIJD_NAAM: Record<KooktijdCode, string> = { snel: 'Snel', gemiddeld: 'Gemiddeld', uitgebreid: 'Uitgebreid' };
const MIDDAG_AVOND_KOOKTIJD: KooktijdOptie[] = KOOKTIJDEN.map((id) => ({ id, naam: KOOKTIJD_NAAM[id], ...KOOKTIJD_BEREIK[id] }));

/** Keuzes uit eerdere versies en wat ze nu betekenen: "verfijnd" (31–50 min) dekte gemiddeld en uitgebreid. */
const VEROUDERDE_KOOKTIJD: Record<string, KooktijdCode[]> = { verfijnd: ['gemiddeld', 'uitgebreid'] };

const KOOKTIJD: Record<Moment, KooktijdOptie[]> = {
  avond: MIDDAG_AVOND_KOOKTIJD,
};

const MIDDAG_AVOND_STIJL: Optie[] = [
  { id: 'mediterraan', naam: 'Mediterraan' },
  { id: 'chinees', naam: 'Chinees' },
  { id: 'indiaas', naam: 'Indiaas' },
  { id: 'frans', naam: 'Frans' },
  { id: 'mexicaans', naam: 'Mexicaans' },
  { id: 'italiaans', naam: 'Italiaans' },
  { id: 'koreaans', naam: 'Koreaans' },
  { id: 'thais', naam: 'Thais' },
  { id: 'japans', naam: 'Japans' },
  { id: 'belgisch', naam: 'Belgisch' },
];

const STIJL: Record<Moment, Optie[]> = {
  avond: MIDDAG_AVOND_STIJL,
};

const MIDDAG_AVOND_VERMIJD: Optie[] = [
  { id: 'varkensvlees', naam: 'Varkensvlees' },
  { id: 'schaaldieren', naam: 'Schaaldieren' },
  { id: 'zuivel', naam: 'Zuivel' },
  { id: 'vis', naam: 'Vis' },
  { id: 'eieren', naam: 'Eieren' },
  { id: 'noten', naam: 'Noten' },
];

const VERMIJD: Record<Moment, Optie[]> = {
  avond: MIDDAG_AVOND_VERMIJD,
};

const STANDAARD_STIJL: Record<Moment, string[]> = {
  avond: ['mediterraan'],
};

/** De kooktijden die bij dit moment horen, in volgorde van kort naar lang. */
export function kooktijdOpties(moment: Moment): KooktijdOptie[] {
  return KOOKTIJD[moment];
}

/** Welke kooktijd bij een recept van dit aantal minuten hoort voor dit moment. Undefined als geen keuze past. */
export function kooktijdVan(moment: Moment, minuten: number): string | undefined {
  return KOOKTIJD[moment].find((o) => minuten >= o.van && minuten <= o.tot)?.id;
}

/** De stijlen die bij dit moment horen. */
export function stijlOpties(moment: Moment): Optie[] {
  return STIJL[moment];
}

/** De ingrediënten die je bij dit moment kunt vermijden. */
export function vermijdOpties(moment: Moment): Optie[] {
  return VERMIJD[moment];
}

/** De stijl die bij een nieuw moment vooraf gekozen staat. */
export function standaardStijlen(moment: Moment): string[] {
  return [...STANDAARD_STIJL[moment]];
}

/**
 * Houdt alleen de keuzes over die bij het nieuwe moment nog bestaan.
 * Zo blijft een keuze die ook bij het nieuwe moment hoort staan, en valt de rest weg.
 */
export function behoudGeldige(gekozen: readonly string[], opties: readonly Optie[]): string[] {
  const ids = new Set(opties.map((o) => o.id));
  return gekozen.filter((id) => ids.has(id));
}

/** Alle kooktijden van de gekozen momenten, zonder dubbele, in volgorde. */
export function kooktijdVoorMomenten(momenten: readonly Moment[]): KooktijdOptie[] {
  return unie(momenten.map((m) => KOOKTIJD[m]));
}

/** Alle stijlen van de gekozen momenten, zonder dubbele, in volgorde. */
export function stijlVoorMomenten(momenten: readonly Moment[]): Optie[] {
  return unie(momenten.map((m) => STIJL[m]));
}

/** Alle vermijd-keuzes van de gekozen momenten, zonder dubbele, in volgorde. */
export function vermijdVoorMomenten(momenten: readonly Moment[]): Optie[] {
  return unie(momenten.map((m) => VERMIJD[m]));
}

function unie<T extends { id: string }>(lijsten: readonly (readonly T[])[]): T[] {
  const gezien = new Set<string>();
  const uit: T[] = [];
  for (const lijst of lijsten) {
    for (const o of lijst) {
      if (gezien.has(o.id)) continue;
      gezien.add(o.id);
      uit.push(o);
    }
  }
  return uit;
}

/** Alle kooktijd-ids die het scherm kan opslaan. */
export const KOOKTIJD_IDS: string[] = unie([KOOKTIJD.avond]).map((o) => o.id);

/** Zet opgeslagen kooktijdkeuzes om naar de huidige ids, in vaste volgorde en zonder dubbele; onbekende vallen weg (WEEK-199). */
export function vernieuwKooktijden(gekozen: readonly unknown[]): string[] {
  const gewenst = new Set<string>();
  for (const k of gekozen) {
    if (typeof k !== 'string') continue;
    for (const id of VEROUDERDE_KOOKTIJD[k] ?? [k]) gewenst.add(id);
  }
  return KOOKTIJD_IDS.filter((id) => gewenst.has(id));
}

/** Alle stijl-ids die het scherm kan opslaan. */
export const STIJL_IDS: string[] = unie([STIJL.avond]).map((o) => o.id);
