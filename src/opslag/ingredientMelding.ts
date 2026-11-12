// WEEK-248: een overgeslagen onbekend ingrediënt anoniem melden via de databankfunctie famenu_meld_ingredient.
// Eén vraag per overgeslagen ingrediënt, nooit twee keer hetzelfde in één sessie; een fout wordt stil genegeerd
// (het melden is een hulp voor de beheerder, de gebruiker merkt er niets van).
import { meldingSleutel, teMelden } from '@/lib/ingredientMelding';
import type { NakijkRegel } from '@/lib/receptLink';
import { supabase, zorgVoorSessie } from '@/opslag/supabase';

const gemeld = new Set<string>();

export async function meldOvergeslagen(regel: NakijkRegel): Promise<void> {
  const m = teMelden(regel);
  if (!m) return;
  const sleutel = meldingSleutel(m);
  if (gemeld.has(sleutel)) return;
  gemeld.add(sleutel);
  const sb = supabase();
  if (!sb) return;
  try {
    await zorgVoorSessie();
    await sb.rpc('famenu_meld_ingredient', { p_naam: m.naam, p_taal: m.taal });
  } catch {
    // Geen verbinding: niet erg, er wordt niets opnieuw geprobeerd.
  }
}
