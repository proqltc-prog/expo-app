// Ophalen van de goedgekeurde recepten uit de Supabase-database (WEEK-68).
// Lezen is openbaar (RLS): enkel recepten met status "goedgekeurd" komen mee.
// Het netwerk zit hier; de omzetting staat in src/lib/planner/db.ts.
import { DbRecept, leesDbRecept } from '@/lib/planner/db';
import { supabase } from '@/opslag/supabase';

// Let op: nu worden alle goedgekeurde recepten in één keer opgehaald. Bij duizenden recepten
// moet het zoeken op de server gefilterd en per pagina gelezen worden (volgende stap van WEEK-68).
const SELECTIE =
  'id, porties, kooktijd_min, moment, stijl, soort, basis, foto_pad, seizoenen, ' +
  'recept_vertalingen(taal, titel), ' +
  'recept_bereidingen(taal, stappen), ' +
  'recept_ingredienten(hoeveelheid, eenheid, optioneel, ingredienten(code, categorie, ingredient_vertalingen(taal, naam)))';

let cache: DbRecept[] | undefined;

/**
 * Alle goedgekeurde recepten. Het resultaat wordt bewaard tot de app opnieuw start.
 * Geeft een lege lijst als er geen backend ingesteld is; gooit een fout bij netwerkproblemen.
 */
export async function laadDbRecepten(): Promise<DbRecept[]> {
  if (cache) return cache;
  const sb = supabase();
  if (!sb) return [];
  const { data, error } = await sb.from('recepten').select(SELECTIE).eq('status', 'goedgekeurd');
  if (error) throw error;
  cache = (data ?? []).map(leesDbRecept).filter((r): r is DbRecept => !!r);
  return cache;
}

/** Vergeet de cache, bv. na een wijziging in de database. */
export function wisDbReceptenCache(): void {
  cache = undefined;
}
