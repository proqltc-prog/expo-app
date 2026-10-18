// Schaalfactor van een recept (WEEK-70).
// Elk recept is opgeslagen voor 1 volwassene. De factor voor het gezin:
// 1 per volwassene (vanaf 13 jaar), 0,5 per kind van 0 tot 12 jaar.
import { rondAf } from './planner/hoeveelheid';

export const VOLWASSENE_FACTOR = 1;
export const KIND_FACTOR = 0.5;

export type Gezin = { volwassenen: number; kinderen: number };

/** Hoeveel "volwassen porties" het gezin eet. Negatieve of ongeldige aantallen tellen als 0. */
export function schaalFactor(gezin: Gezin): number {
  const volwassenen = Math.max(0, Math.floor(gezin.volwassenen));
  const kinderen = Math.max(0, Math.floor(gezin.kinderen));
  return volwassenen * VOLWASSENE_FACTOR + kinderen * KIND_FACTOR;
}

/** Hoeveelheid voor het gezin, afgerond op iets dat je kan kopen (zie rondAf). */
export function geschaaldeHoeveelheid(basis: number, gezin: Gezin, eenheid: string): number {
  return rondAf(basis * schaalFactor(gezin), eenheid);
}
