/**
 * Onze eigen gezondheidsscore (WEEK-220). Los van het Nutri-Score, zodat niets dubbel meetelt.
 *
 * Officieel zijn de DREMPELS:
 *  - vet, verzadigd vet, suikers, zout: richtlijn voor voedingskleuren van de Britse overheid
 *    ("Guide to creating a front of pack nutrition label", november 2016, Open Government Licence).
 *    Per 100 g voor voeding, per 100 ml voor drank.
 *  - veel vezels (minstens 6 g per 100 g) en veel eiwit (minstens 20 % van de energie):
 *    voedingsclaims uit Verordening (EG) 1924/2006.
 * De PUNTEN die aan een drempel hangen zijn onze eigen keuze; de app zegt dat ook.
 */
import type { Product } from '@/lib/openfoodfacts';

export type Niveau = 'laag' | 'midden' | 'hoog';
export type Stof = 'vet' | 'verzadigd' | 'suikers' | 'zout';
export type RedenCode =
  | 'vetMidden' | 'vetHoog'
  | 'verzadigdMidden' | 'verzadigdHoog'
  | 'suikersMidden' | 'suikersHoog'
  | 'zoutMidden' | 'zoutHoog'
  | 'nova4' | 'vezels' | 'eiwit';

/** Een reden is taalonafhankelijk; het scherm vertaalt ze (sleutel `reden.<code>`). */
export type Reden = { code: RedenCode; punten: number; waarde?: number };
export type OordeelLabel = 'goed' | 'matig' | 'slecht';
export type Oordeel = { score: number; label: OordeelLabel; redenen: Reden[] };

/** [laag tot en met, hoog vanaf boven] per stof. */
export const DREMPELS: Record<'voeding' | 'drank', Record<Stof, [number, number]>> = {
  voeding: { vet: [3, 17.5], verzadigd: [1.5, 5], suikers: [5, 22.5], zout: [0.3, 1.5] },
  drank: { vet: [1.5, 8.75], verzadigd: [0.75, 2.5], suikers: [2.5, 11.25], zout: [0.3, 0.75] },
};

export const PUNTEN = { midden: -10, hoog: -25, nova4: -15, vezels: 5, eiwit: 5 } as const;
export const VEZELS_VEEL = 6; // g per 100 g
export const EIWIT_VEEL_ENERGIE = 0.2; // aandeel van de energie
const KCAL_PER_G_EIWIT = 4;

export function niveauVan(stof: Stof, waarde: number, drank: boolean): Niveau {
  const [laag, hoog] = DREMPELS[drank ? 'drank' : 'voeding'][stof];
  if (waarde <= laag) return 'laag';
  return waarde > hoog ? 'hoog' : 'midden';
}

export function labelVoor(score: number): OordeelLabel {
  return score >= 65 ? 'goed' : score >= 40 ? 'matig' : 'slecht';
}

export function berekenScore(p: Product, drank: boolean): Oordeel {
  const redenen: Reden[] = [];
  const waarden: Record<Stof, number | undefined> = { vet: p.vet, verzadigd: p.verzadigd, suikers: p.suikers, zout: p.zout };
  // Een onbekende waarde telt niet mee: we schatten niets.
  for (const stof of ['vet', 'verzadigd', 'suikers', 'zout'] as Stof[]) {
    const v = waarden[stof];
    if (v === undefined) continue;
    const niveau = niveauVan(stof, v, drank);
    if (niveau === 'laag') continue;
    const punten = niveau === 'hoog' ? PUNTEN.hoog : PUNTEN.midden;
    const code = `${stof}${niveau === 'hoog' ? 'Hoog' : 'Midden'}` as RedenCode;
    redenen.push({ code, punten, waarde: v });
  }
  if (p.nova === 4) redenen.push({ code: 'nova4', punten: PUNTEN.nova4 });
  if ((p.vezels ?? 0) >= VEZELS_VEEL) redenen.push({ code: 'vezels', punten: PUNTEN.vezels, waarde: p.vezels });
  if (p.eiwitten !== undefined && p.kcal && (p.eiwitten * KCAL_PER_G_EIWIT) / p.kcal >= EIWIT_VEEL_ENERGIE) {
    redenen.push({ code: 'eiwit', punten: PUNTEN.eiwit, waarde: p.eiwitten });
  }
  const totaal = 100 + redenen.reduce((som, r) => som + r.punten, 0);
  const score = Math.max(0, Math.min(100, Math.round(totaal)));
  return { score, label: labelVoor(score), redenen };
}
