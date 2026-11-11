/**
 * De voedingstabel van het scanresultaat, gegroepeerd (WEEK-220):
 *  - plus: wat goed is (laag in vet, verzadigd vet, suikers of zout; veel vezels; veel eiwit);
 *  - min: wat te veel (eerst) of gemiddeld is;
 *  - overig: wat geen officiële grens heeft of onbekend is (energie, koolhydraten, ...).
 * Dezelfde drempels als de eigen score (`src/lib/score.ts`), zodat tabel en score altijd overeenkomen.
 */
import type { Product } from '@/lib/openfoodfacts';
import { DREMPELS, EIWIT_VEEL_ENERGIE, niveauVan, VEZELS_VEEL, type Stof } from '@/lib/score';

export type RijSleutel = 'kcal' | 'vet' | 'verzadigd' | 'koolhydraten' | 'suikers' | 'vezels' | 'eiwitten' | 'zout';
export type Beoordeling = 'goed' | 'gemiddeld' | 'teVeel' | 'info';

/** Waarom een rij goed of slecht is; het scherm vertaalt dit (sleutel `grens.<code>`). */
export type Grens =
  | { code: 'laag'; max: number }
  | { code: 'midden'; min: number; max: number }
  | { code: 'hoog'; min: number }
  | { code: 'vezels'; min: number }
  | { code: 'eiwit'; procent: number };

export type TabelRij = { sleutel: RijSleutel; waarde?: number; beoordeling: Beoordeling; grens?: Grens };
export type Voedingstabel = { plus: TabelRij[]; min: TabelRij[]; overig: TabelRij[] };

/** Volgorde zoals op een etiket. */
export const VOLGORDE: RijSleutel[] = ['kcal', 'vet', 'verzadigd', 'koolhydraten', 'suikers', 'vezels', 'eiwitten', 'zout'];
const STOFFEN: Partial<Record<RijSleutel, Stof>> = { vet: 'vet', verzadigd: 'verzadigd', suikers: 'suikers', zout: 'zout' };
const KCAL_PER_G_EIWIT = 4;

function waardeVan(p: Product, sleutel: RijSleutel): number | undefined {
  return p[sleutel];
}

export function beoordeelRij(p: Product, sleutel: RijSleutel, drank: boolean): TabelRij {
  const waarde = waardeVan(p, sleutel);
  const info: TabelRij = { sleutel, waarde, beoordeling: 'info' };
  if (waarde === undefined) return info; // onbekend: niets schatten

  const stof = STOFFEN[sleutel];
  if (stof) {
    const [laag, hoog] = DREMPELS[drank ? 'drank' : 'voeding'][stof];
    const niveau = niveauVan(stof, waarde, drank);
    if (niveau === 'laag') return { sleutel, waarde, beoordeling: 'goed', grens: { code: 'laag', max: laag } };
    if (niveau === 'hoog') return { sleutel, waarde, beoordeling: 'teVeel', grens: { code: 'hoog', min: hoog } };
    return { sleutel, waarde, beoordeling: 'gemiddeld', grens: { code: 'midden', min: laag, max: hoog } };
  }
  if (sleutel === 'vezels' && waarde >= VEZELS_VEEL) {
    return { sleutel, waarde, beoordeling: 'goed', grens: { code: 'vezels', min: VEZELS_VEEL } };
  }
  if (sleutel === 'eiwitten' && p.kcal && (waarde * KCAL_PER_G_EIWIT) / p.kcal >= EIWIT_VEEL_ENERGIE) {
    return { sleutel, waarde, beoordeling: 'goed', grens: { code: 'eiwit', procent: Math.round(EIWIT_VEEL_ENERGIE * 100) } };
  }
  return info;
}

export function voedingstabel(p: Product, drank: boolean): Voedingstabel {
  const rijen = VOLGORDE.map((s) => beoordeelRij(p, s, drank));
  return {
    plus: rijen.filter((r) => r.beoordeling === 'goed'),
    // Te veel eerst, dan gemiddeld; binnen elke soort de volgorde van het etiket.
    min: [...rijen.filter((r) => r.beoordeling === 'teVeel'), ...rijen.filter((r) => r.beoordeling === 'gemiddeld')],
    overig: rijen.filter((r) => r.beoordeling === 'info'),
  };
}
