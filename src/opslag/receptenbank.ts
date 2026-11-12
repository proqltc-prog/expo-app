// Ophalen van de goedgekeurde recepten uit de Supabase-database (WEEK-68).
// Lezen is openbaar (RLS): enkel recepten met status "goedgekeurd" komen mee.
// Het netwerk zit hier; de omzetting staat in src/lib/planner/db.ts.
// WEEK-253: de recepten blijven op het toestel bewaard en worden enkel opnieuw opgehaald als de receptversie in de
// databank (tabel data_versie) veranderd is. Zonder internet gebruikt de app de recepten op het toestel.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { inBlokken, moetOphalen, uitBlokken } from '@/lib/gegevensVersie';
import { DbRecept, leesDbRecept } from '@/lib/planner/db';
import { startIngredienten, versiesInDatabank } from '@/opslag/gegevens';
import { SLEUTEL } from '@/opslag/sleutels';
import { supabase } from '@/opslag/supabase';

// WEEK-253: zonder de namen van de ingrediënten (die komen uit de ingrediëntenlijst, WEEK-252): ± 1,6 MB in plaats van 2,2 MB.
// Bij duizenden recepten moet het zoeken op de server gefilterd en per pagina gelezen worden (volgende stap van WEEK-68).
const SELECTIE =
  'id, porties, kooktijd_min, moment, stijl, soort, basis, foto_pad, seizoenen, ' +
  'recept_vertalingen(taal, titel), ' +
  'recept_bereidingen(taal, stappen), ' +
  'recept_ingredienten(hoeveelheid, eenheid, optioneel, ingredienten(code, categorie))';

/** Op het toestel: een inhoud (versie + aantal blokken) en de blokken met de ruwe rijen uit de databank. */
type Inhoud = { versie: number; blokken: number };
const blokSleutel = (i: number) => `${SLEUTEL.receptenDb}:${i}`;

let cache: DbRecept[] | undefined;
let bezig: Promise<DbRecept[]> | undefined;

async function leesVanToestel(): Promise<{ versie: number; rijen: unknown[] } | undefined> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL.receptenDb);
    const inhoud = ruw ? (JSON.parse(ruw) as Inhoud) : undefined;
    if (!inhoud || !Number.isInteger(inhoud.versie) || !Number.isInteger(inhoud.blokken)) return undefined;
    const paren = await AsyncStorage.multiGet(Array.from({ length: inhoud.blokken }, (_, i) => blokSleutel(i)));
    const rijen = uitBlokken<unknown>(paren.map(([, v]) => (v ? JSON.parse(v) : undefined)), inhoud.blokken);
    return rijen ? { versie: inhoud.versie, rijen } : undefined;
  } catch {
    return undefined;
  }
}

async function bewaarOpToestel(versie: number, rijen: unknown[]): Promise<void> {
  try {
    const vorige = await leesInhoud();
    const blokken = inBlokken(rijen);
    // Eerst de blokken, dan de inhoud: zo wijst de inhoud nooit naar blokken die er nog niet zijn.
    await AsyncStorage.multiSet(blokken.map((b, i) => [blokSleutel(i), JSON.stringify(b)]));
    await AsyncStorage.setItem(SLEUTEL.receptenDb, JSON.stringify({ versie, blokken: blokken.length } satisfies Inhoud));
    if (vorige && vorige.blokken > blokken.length) {
      await AsyncStorage.multiRemove(Array.from({ length: vorige.blokken - blokken.length }, (_, i) => blokSleutel(blokken.length + i)));
    }
  } catch {
    // Geen plaats op het toestel: niet erg, de volgende start haalt ze opnieuw op.
  }
}

async function leesInhoud(): Promise<Inhoud | undefined> {
  const ruw = await AsyncStorage.getItem(SLEUTEL.receptenDb).catch(() => null);
  try {
    return ruw ? (JSON.parse(ruw) as Inhoud) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Alle goedgekeurde recepten. Het resultaat wordt bewaard tot de app opnieuw start, en op het toestel tot de databank
 * verandert (WEEK-253). Geeft een lege lijst als er geen backend ingesteld is; gooit een fout als er geen internet is
 * en er ook nog niets op het toestel staat.
 */
export function laadDbRecepten(): Promise<DbRecept[]> {
  if (cache) return Promise.resolve(cache);
  if (!bezig) {
    bezig = (async () => {
      // De namen van de ingrediënten komen uit de ingrediëntenlijst: die eerst aanvullen (WEEK-252).
      await startIngredienten();
      const bewaard = await leesVanToestel();
      const inDatabank = (await versiesInDatabank())?.recepten;
      let rijen: unknown[];
      if (bewaard && !moetOphalen(bewaard.versie, inDatabank)) {
        rijen = bewaard.rijen;
      } else {
        const sb = supabase();
        if (!sb) return [];
        try {
          const { data, error } = await sb.from('recepten').select(SELECTIE).eq('status', 'goedgekeurd');
          if (error) throw error;
          rijen = data ?? [];
          if (inDatabank !== undefined && rijen.length) await bewaarOpToestel(inDatabank, rijen);
        } catch (fout) {
          // Geen internet: liever de (oudere) recepten op het toestel dan niets.
          if (!bewaard) throw fout;
          rijen = bewaard.rijen;
        }
      }
      cache = rijen.map(leesDbRecept).filter((r): r is DbRecept => !!r);
      return cache;
    })().finally(() => {
      bezig = undefined;
    });
  }
  return bezig;
}

/** Vergeet de cache, bv. na een wijziging in de database. */
export function wisDbReceptenCache(): void {
  cache = undefined;
}
