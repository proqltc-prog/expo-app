export type Product = {
  barcode: string;
  naam: string;
  merk?: string;
  nutriscore?: string; // a–e
  nova?: number; // 1–4 (4 = ultrabewerkt)
  additieven: string[];
  kcal?: number; // per 100 g
  suikers?: number; // g per 100 g
  eiwitten?: number; // g per 100 g
  vet?: number;
  zout?: number;
};

export type Oordeel = {
  score: number; // 0–100, hoger = gezonder
  label: 'Goed' | 'Matig' | 'Liever niet';
  redenen: string[];
};

const BASIS = 'https://world.openfoodfacts.org/api/v2/product';
const VELDEN = 'product_name,product_name_nl,brands,nutriscore_grade,nova_group,additives_tags,nutriments';

export async function zoekProduct(barcode: string): Promise<Product | null> {
  const res = await fetch(`${BASIS}/${encodeURIComponent(barcode)}.json?fields=${VELDEN}`, {
    headers: { 'User-Agent': 'GezondBoodschappen/0.1 (github.com/Proqltc-prog/expo-app)' },
  });
  if (!res.ok) return null;
  const data: any = await res.json();
  if (data.status !== 1 || !data.product) return null;
  const p = data.product;
  const n = p.nutriments ?? {};
  const getal = (v: unknown) => (typeof v === 'number' ? v : undefined);
  return {
    barcode,
    naam: p.product_name_nl || p.product_name || 'Onbekend product',
    merk: p.brands,
    nutriscore: typeof p.nutriscore_grade === 'string' && /^[a-e]$/.test(p.nutriscore_grade) ? p.nutriscore_grade : undefined,
    nova: getal(p.nova_group),
    additieven: (p.additives_tags ?? []).map((t: string) => t.replace(/^en:/, '').toUpperCase()),
    kcal: getal(n['energy-kcal_100g']),
    suikers: getal(n.sugars_100g),
    eiwitten: getal(n.proteins_100g),
    vet: getal(n.fat_100g),
    zout: getal(n.salt_100g),
  };
}

const NUTRI_PUNTEN: Record<string, number> = { a: 100, b: 80, c: 60, d: 35, e: 15 };

/** Eenvoudige, uitlegbare gezondheidsscore. Geen medisch advies. */
export function beoordeel(p: Product): Oordeel {
  const redenen: string[] = [];
  let score = p.nutriscore ? NUTRI_PUNTEN[p.nutriscore] : 60;
  if (p.nutriscore) redenen.push(`Nutri-Score ${p.nutriscore.toUpperCase()}`);

  if (p.nova === 4) { score -= 15; redenen.push('Ultrabewerkt (NOVA 4)'); }
  if (p.additieven.length >= 3) { score -= 10; redenen.push(`${p.additieven.length} additieven`); }
  if ((p.suikers ?? 0) > 22.5) { score -= 10; redenen.push(`Veel suiker (${p.suikers} g/100 g)`); }
  if ((p.zout ?? 0) > 1.5) { score -= 5; redenen.push(`Veel zout (${p.zout} g/100 g)`); }
  if ((p.eiwitten ?? 0) >= 10) { score += 5; redenen.push(`Eiwitrijk (${p.eiwitten} g/100 g)`); }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const label = score >= 65 ? 'Goed' : score >= 40 ? 'Matig' : 'Liever niet';
  return { score, label, redenen };
}
