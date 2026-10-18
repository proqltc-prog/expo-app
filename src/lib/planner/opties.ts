// Keuzes per moment in het weekmenu (WEEK-68, deel 4): kooktijd, stijl en vermijden hangen af van het moment.
// Pure logica. De schermen tonen de lijsten; de planner filtert er later op.
import type { Moment } from '@/data/receptenbank';

export type KooktijdOptie = { id: string; naam: string; van: number; tot: number };
export type Optie = { id: string; naam: string };

// Ochtend: korte tijden. Middag en avond: snel tot 30 minuten, daarna verfijnde recepten tot 50 minuten.
const MIDDAG_AVOND_KOOKTIJD: KooktijdOptie[] = [
  { id: 'snel', naam: 'Snel', van: 0, tot: 30 },
  { id: 'verfijnd', naam: 'Verfijnd', van: 31, tot: 50 },
];

const KOOKTIJD: Record<Moment, KooktijdOptie[]> = {
  ontbijt: [
    { id: 'snel', naam: 'Snel', van: 0, tot: 5 },
    { id: 'rustig', naam: 'Rustig', van: 6, tot: 15 },
    { id: 'uitgebreid', naam: 'Uitgebreid', van: 16, tot: 30 },
  ],
  middag: MIDDAG_AVOND_KOOKTIJD,
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
  ontbijt: [
    { id: 'hartig', naam: 'Hartig' },
    { id: 'zoet', naam: 'Zoet' },
    { id: 'mediterraan', naam: 'Mediterraan' },
    { id: 'belgisch', naam: 'Belgisch' },
  ],
  middag: MIDDAG_AVOND_STIJL,
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
  ontbijt: [
    { id: 'zuivel', naam: 'Zuivel' },
    { id: 'eieren', naam: 'Eieren' },
    { id: 'noten', naam: 'Noten' },
  ],
  middag: MIDDAG_AVOND_VERMIJD,
  avond: MIDDAG_AVOND_VERMIJD,
};

const STANDAARD_STIJL: Record<Moment, string[]> = {
  ontbijt: ['hartig'],
  middag: ['mediterraan'],
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

/** Alle kooktijd-ids die het scherm kan opslaan (van alle momenten samen). */
export const KOOKTIJD_IDS: string[] = unie([KOOKTIJD.ontbijt, KOOKTIJD.middag]).map((o) => o.id);

/** Alle stijl-ids die het scherm kan opslaan (van alle momenten samen). */
export const STIJL_IDS: string[] = unie([STIJL.ontbijt, STIJL.middag]).map((o) => o.id);
