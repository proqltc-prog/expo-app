// Seizoenen van de planner (WEEK-156). Pure logica, zonder netwerk.
// Een recept met een lege seizoenenlijst geldt het hele jaar.
import { Seizoen, SEIZOENEN, SEIZOENSPRODUCT } from '@/data/seizoenen';

const ISO_MAAND = /^\d{4}-(\d{2})-\d{2}$/;

/** Het meteorologische seizoen van een ISO-datum (YYYY-MM-DD). Geeft undefined bij een ongeldige datum. */
export function seizoenVan(iso: string | undefined): Seizoen | undefined {
  if (!iso) return undefined;
  const deel = ISO_MAAND.exec(iso);
  if (!deel) return undefined;
  const maand = Number(deel[1]);
  if (maand >= 3 && maand <= 5) return 'lente';
  if (maand >= 6 && maand <= 8) return 'zomer';
  if (maand >= 9 && maand <= 11) return 'herfst';
  if (maand === 12 || maand <= 2) return 'winter';
  return undefined;
}

/**
 * De seizoenen waarin een recept past, op basis van de seizoensgroenten en -fruit in de ingrediënten.
 * Enkel de seizoensproducten tellen mee: het recept past in de seizoenen die alle seizoensproducten gemeen hebben.
 * Geen seizoensproduct, of geen gemeenschappelijk seizoen: een lege lijst (het hele jaar).
 */
export function seizoenenVoorIngredienten(codes: readonly string[]): Seizoen[] {
  let gemeen: Seizoen[] | undefined;
  for (const code of codes) {
    const seizoenen = SEIZOENSPRODUCT[code];
    if (!seizoenen) continue;
    gemeen = gemeen ? gemeen.filter((s) => seizoenen.includes(s)) : [...seizoenen];
  }
  if (!gemeen?.length) return [];
  return SEIZOENEN.filter((s) => gemeen!.includes(s));
}

/** Past een recept in dit seizoen? Een recept zonder seizoen past altijd; het is het hele jaar te maken. */
export function seizoenPasst(seizoenen: readonly Seizoen[] | undefined, seizoen: Seizoen): boolean {
  return !seizoenen?.length || seizoenen.includes(seizoen);
}
