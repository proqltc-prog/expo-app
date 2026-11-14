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
  weekplan: 1,
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

/** Hoe hoog de foto bovenaan is, als deel van de schermhoogte (start en Aan de slag), met een minimum in pixels. */
export const HERO_DEEL = 0.44;
export const HERO_MIN = 260;
export function heroHoogte(schermHoogte: number): number {
  return Math.max(HERO_MIN, Math.round(schermHoogte * HERO_DEEL));
}

/** Welke foto bij een uitlegscherm hoort: de sleutel zit in de titel ("uitleg.weekplan.titel" → "weekplan"). */
export function uitlegFoto(scherm: Pick<UitlegScherm, 'titel'>): FotoSleutel | null {
  const sleutel = scherm.titel.split('.')[1];
  return (FOTO_SLEUTELS as readonly string[]).includes(sleutel) ? (sleutel as FotoSleutel) : null;
}

/**
 * Plan je week (WEEK-289): zeven borden, elk volledig zichtbaar op een lichte achtergrond, met de dag eronder
 * (zoals de eigenaar vroeg: geen label op het eten). Uitgesneden uit Pexels 9738985: assets/welkom/bord-<dag>.jpg.
 * Bovenaan vier borden, onderaan drie.
 */
export const WEEKPLAN_BORDEN: readonly DagCode[] = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
export const BORDEN_BOVEN = 4;

/** Plan je week heeft geen gewone foto: het scherm toont de borden (zie WEEKPLAN_BORDEN). */
export function heeftEigenFoto(sleutel: FotoSleutel): boolean {
  return sleutel !== 'weekplan';
}

/** De korte dagnaam op een blaadje: de eerste twee letters in hoofdletters (MA, DI … / LU, MA … / MO, TU …). */
export function dagKort(naam: string): string {
  return naam.trim().slice(0, 2).toLocaleUpperCase();
}

/**
 * Het woordmerk in twee kleuren (WEEK-289): "Fa" (familie) en "menu". Een andere merknaam blijft één geheel.
 */
export function merkDelen(merk: string): [string, string] {
  const m = merk.trim();
  return /^fa.*menu$/i.test(m) ? [m.slice(0, m.length - 4), m.slice(-4)] : [m, ''];
}

/** De drie kenmerken onder de slogan op de startpagina: icoon (Ionicons) en tekstsleutel. */
export const START_KENMERKEN: readonly { icoon: string; tekst: 'welkom.kenmerk.week' | 'welkom.kenmerk.lijst' | 'welkom.kenmerk.gezond' }[] = [
  { icoon: 'calendar-outline', tekst: 'welkom.kenmerk.week' },
  { icoon: 'cart-outline', tekst: 'welkom.kenmerk.lijst' },
  { icoon: 'leaf-outline', tekst: 'welkom.kenmerk.gezond' },
];
