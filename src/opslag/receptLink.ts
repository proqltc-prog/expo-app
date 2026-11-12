// WEEK-247: een receptpagina laten ophalen door de Supabase-functie recept-link. Eén vraag per tik op "Inlezen".
import { RuwRecept, vindRecept } from '@/lib/receptLink';
import { supabase, zorgVoorSessie } from '@/opslag/supabase';

export type LinkFout = 'ongeldige_link' | 'limiet' | 'niet_bereikbaar' | 'geen_recept' | 'te_groot' | 'geen_verbinding';

export async function haalReceptOp(url: string): Promise<{ ok: true; recept: RuwRecept } | { ok: false; fout: LinkFout }> {
  const sb = supabase();
  if (!sb) return { ok: false, fout: 'geen_verbinding' };
  try {
    await zorgVoorSessie();
    const { data, error } = await sb.functions.invoke<{ blokken?: string[]; taal?: string; fout?: LinkFout }>('recept-link', { body: { url } });
    if (error) {
      // Bij een foutcode zit de reden in het antwoord van de functie.
      const ctx = (error as { context?: Response }).context;
      const body = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => undefined) : undefined;
      const fout = (body as { fout?: LinkFout } | undefined)?.fout;
      return { ok: false, fout: fout && fout !== 'geen_verbinding' ? fout : 'niet_bereikbaar' };
    }
    const recept = vindRecept(data?.blokken ?? [], data?.taal);
    return recept ? { ok: true, recept } : { ok: false, fout: 'geen_recept' };
  } catch {
    return { ok: false, fout: 'geen_verbinding' };
  }
}
