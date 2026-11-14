// Sfeerfoto's op de startpagina en de uitlegschermen (WEEK-289). Pure logica, zonder React Native.
// De foto's zelf staan in assets/welkom/ (gratis Pexels-licentie, bronnen in assets/welkom/BRONNEN.md);
// src/ui/welkomFotos.ts koppelt elke sleutel aan het bestand.
import type { DagCode } from '@/lib/planner/types';
import type { UitlegScherm } from '@/lib/welkom';

export const FOTO_SLEUTELS = ['start', 'weekplan', 'huishouden', 'frigo', 'lijst', 'scan', 'seizoen', 'winkels'] as const;
export type FotoSleutel = (typeof FOTO_SLEUTELS)[number];

/** Breedte gedeeld door hoogte van elk bestand in assets/welkom/ (zoals het in de app staat). */
export const FOTO_VERHOUDING: Record<FotoSleutel, number> = {
  start: 800 / 503,
  weekplan: 800 / 542,
  huishouden: 640 / 800,
  frigo: 800 / 534,
  lijst: 1,
  scan: 800 / 370,
  seizoen: 800 / 534,
  winkels: 800 / 600,
};

/** Herkomst: Pexels-nummer(s). De collage van de winkels bestaat uit vijf foto's. */
export const FOTO_BRON: Record<FotoSleutel, readonly number[]> = {
  start: [38431262],
  weekplan: [9738985],
  huishouden: [8279641],
  frigo: [6508357],
  lijst: [9070110],
  scan: [8476600],
  seizoen: [109277],
  winkels: [7447278, 35993723, 30488545, 15685763, 29412671],
};

/**
 * Alle fotokaarten op de uitlegschermen hebben dezelfde verhouding, zodat titel en tekst niet verspringen bij Volgende.
 * Het is die van Plan je week: daar mag niets wegvallen, want de kalenderblaadjes liggen op de borden. De andere foto's
 * worden in het midden bijgesneden.
 */
export const KAART_VERHOUDING = FOTO_VERHOUDING.weekplan;

/** De verhouding van de fotokaart op een uitlegscherm. */
export function kaartVerhouding(_sleutel: FotoSleutel): number {
  return KAART_VERHOUDING;
}

/** Welke foto bij een uitlegscherm hoort: de sleutel zit in de titel ("uitleg.weekplan.titel" → "weekplan"). */
export function uitlegFoto(scherm: Pick<UitlegScherm, 'titel'>): FotoSleutel | null {
  const sleutel = scherm.titel.split('.')[1];
  return (FOTO_SLEUTELS as readonly string[]).includes(sleutel) ? (sleutel as FotoSleutel) : null;
}

/**
 * Plan je week: een kalenderblaadje per dag op een bord van de foto (in procent van breedte en hoogte, het midden van het blaadje).
 * Gemeten op Pexels 9738985. Het blaadje kantelt licht, afwisselend links en rechts.
 */
export const WEEKPLAN_BLAADJES: readonly { dag: DagCode; x: number; y: number; kanteling: number }[] = [
  { dag: 'maandag', x: 21, y: 20, kanteling: -6 },
  { dag: 'dinsdag', x: 65, y: 18, kanteling: 5 },
  { dag: 'woensdag', x: 39, y: 60, kanteling: -4 },
  { dag: 'donderdag', x: 62, y: 48, kanteling: 6 },
  { dag: 'vrijdag', x: 84, y: 37, kanteling: -5 },
  { dag: 'zaterdag', x: 18, y: 58, kanteling: 4 },
  { dag: 'zondag', x: 86, y: 78, kanteling: -3 },
];

/** De korte dagnaam op een blaadje: de eerste twee letters in hoofdletters (MA, DI … / LU, MA … / MO, TU …). */
export function dagKort(naam: string): string {
  return naam.trim().slice(0, 2).toLocaleUpperCase();
}
