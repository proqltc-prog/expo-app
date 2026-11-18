// WEEK-303: twee producten naast elkaar. Per rij het beste product (of geen, bij gelijk of onbekend). Pure logica.
import type { Product } from '@/lib/openfoodfacts';
import { additievenGekend } from '@/lib/score';
import { allergenenStatus } from '@/lib/allergenen';

export type VergelijkSleutel =
  | 'nutriscore' | 'nova' | 'kcal' | 'suikers' | 'verzadigd' | 'zout' | 'vezels' | 'eiwitten' | 'additieven' | 'allergenen';

export type VergelijkRij = {
  sleutel: VergelijkSleutel;
  /** Ruwe waarde per product; undefined = niet gekend. Nutri-Score als letter, de rest als getal. */
  a: number | string | undefined;
  b: number | string | undefined;
  beste: 'a' | 'b' | null;
};

type Richting = 'laag' | 'hoog' | 'geen';

const RICHTING: Record<VergelijkSleutel, Richting> = {
  nutriscore: 'laag', // a < e
  nova: 'laag',
  kcal: 'laag',
  suikers: 'laag',
  verzadigd: 'laag',
  zout: 'laag',
  vezels: 'hoog',
  eiwitten: 'hoog',
  additieven: 'laag',
  allergenen: 'geen', // enkel ter info: wat "beter" is, hangt van het gezin af
};

function waarde(p: Product, sleutel: VergelijkSleutel): number | string | undefined {
  switch (sleutel) {
    case 'nutriscore': return p.nutriscore;
    case 'additieven': return additievenGekend(p) || p.additieven.length ? p.additieven.length : undefined;
    case 'allergenen': {
      const s = allergenenStatus(p);
      return s.soort === 'onbekend' ? undefined : s.soort === 'geen' ? 0 : s.bevat.length;
    }
    default: return p[sleutel];
  }
}

function beste(a: number | string | undefined, b: number | string | undefined, richting: Richting): 'a' | 'b' | null {
  if (richting === 'geen' || a === undefined || b === undefined || a === b) return null;
  const aKleiner = a < b;
  return richting === 'laag' ? (aKleiner ? 'a' : 'b') : aKleiner ? 'b' : 'a';
}

export const VERGELIJK_RIJEN: readonly VergelijkSleutel[] = [
  'nutriscore', 'nova', 'kcal', 'suikers', 'verzadigd', 'zout', 'vezels', 'eiwitten', 'additieven', 'allergenen',
];

export function vergelijk(a: Product, b: Product): VergelijkRij[] {
  return VERGELIJK_RIJEN.map((sleutel) => {
    const va = waarde(a, sleutel);
    const vb = waarde(b, sleutel);
    return { sleutel, a: va, b: vb, beste: beste(va, vb, RICHTING[sleutel]) };
  });
}

/** Hoeveel rijen elk product wint: een korte samenvatting bovenaan. */
export function telWinst(rijen: readonly VergelijkRij[]): { a: number; b: number } {
  return { a: rijen.filter((r) => r.beste === 'a').length, b: rijen.filter((r) => r.beste === 'b').length };
}
