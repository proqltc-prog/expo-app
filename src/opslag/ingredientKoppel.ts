// WEEK-254: onbekende ingrediënten laten opzoeken (en zo nodig toevoegen) door de Supabase-functie ingredient-koppel.
// Gevonden of nieuwe ingrediënten komen meteen in de lijst van de app, zodat ze direct bruikbaar zijn.
import { voegIngredientenToe } from '@/data/ingredienten';
import type { Taal } from '@/i18n';
import { infoUit, type KoppelFout, type KoppelResultaat, leesKoppelAntwoord, MAX_KOPPEL_NAMEN } from '@/lib/ingredientKoppel';
import { meldbareNaam } from '@/lib/ingredientMelding';
import { supabase, zorgVoorSessie } from '@/opslag/supabase';

export async function koppelOnbekend(namen: readonly string[], taal: Taal): Promise<{ ok: true; resultaten: KoppelResultaat[] } | { ok: false; fout: KoppelFout }> {
  // Zelfde opkuis als bij het melden (WEEK-248): geen cijfers, tekens of zinnen naar de AI.
  const schoon = [...new Set(namen.map((n) => meldbareNaam(n)).filter((n): n is string => !!n))].slice(0, MAX_KOPPEL_NAMEN);
  if (!schoon.length) return { ok: true, resultaten: [] };
  const sb = supabase();
  if (!sb) return { ok: false, fout: 'geen_verbinding' };
  try {
    await zorgVoorSessie();
    const { data, error } = await sb.functions.invoke<unknown>('ingredient-koppel', { body: { namen: schoon, taal } });
    if (error) {
      const ctx = (error as { context?: Response }).context;
      const body = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => undefined) : undefined;
      const fout = (body as { fout?: string } | undefined)?.fout;
      return { ok: false, fout: fout === 'limiet' || fout === 'niet_ingesteld' ? fout : 'niet_bereikbaar' };
    }
    const resultaten = leesKoppelAntwoord(data);
    voegIngredientenToe(infoUit(resultaten));
    return { ok: true, resultaten };
  } catch {
    return { ok: false, fout: 'geen_verbinding' };
  }
}
