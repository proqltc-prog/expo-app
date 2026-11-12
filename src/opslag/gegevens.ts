// WEEK-252: gegevens uit de databank op het toestel bewaren en enkel opnieuw ophalen als ze gewijzigd zijn.
// Bij het opstarten: eerst wat op het toestel staat gebruiken (werkt ook zonder internet), dan één kleine vraag naar
// Supabase (tabel data_versie). Enkel als een versie veranderd is, wordt die soort opnieuw opgehaald en bewaard.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type IngredientInfo, zetIngredientenUitDatabank } from '@/data/ingredienten';
import { leesIngredientRijen, leesVersies, moetOphalen, type Versies } from '@/lib/gegevensVersie';
import { SLEUTEL } from './sleutels';
import { supabase } from './supabase';

type BewaardeIngredienten = { versie: number; lijst: Record<string, IngredientInfo> };

let versies: Promise<Versies | undefined> | undefined;

/** De versies in de databank, één keer per start opgevraagd. Undefined zonder internet of backend. */
export function versiesInDatabank(): Promise<Versies | undefined> {
  if (!versies) {
    versies = (async () => {
      const sb = supabase();
      if (!sb) return undefined;
      const { data, error } = await sb.from('data_versie').select('naam, versie');
      return error ? undefined : leesVersies(data);
    })().catch(() => undefined);
  }
  return versies;
}

async function leesBewaard<T>(sleutel: string): Promise<T | undefined> {
  try {
    const ruw = await AsyncStorage.getItem(sleutel);
    return ruw ? (JSON.parse(ruw) as T) : undefined;
  } catch {
    return undefined;
  }
}

let ingredientenKlaar: Promise<void> | undefined;

/**
 * Vult de ingrediëntenlijst aan met de databank: eerst de kopie op het toestel, dan (enkel bij een nieuwe versie)
 * een verse kopie uit Supabase. Fouten worden genegeerd: de app werkt dan met wat ze heeft.
 * Eén keer per start; andere delen van de app kunnen erop wachten (bv. de recepten, WEEK-253).
 */
export function startIngredienten(): Promise<void> {
  if (!ingredientenKlaar) {
    ingredientenKlaar = (async () => {
      const bewaard = await leesBewaard<BewaardeIngredienten>(SLEUTEL.ingredientenDb);
      if (bewaard?.lijst) zetIngredientenUitDatabank(leesIngredientRijenUitBewaard(bewaard.lijst));
      const inDatabank = (await versiesInDatabank())?.ingredienten;
      if (inDatabank === undefined || !moetOphalen(bewaard?.versie, inDatabank)) return;
      const sb = supabase();
      if (!sb) return;
      const { data, error } = await sb.from('ingredienten').select('code, categorie, eenheid, ingredient_vertalingen(taal, naam)');
      if (error || !Array.isArray(data)) return;
      const lijst = leesIngredientRijen(data);
      // Een lege of verminkte lijst nooit bewaren: dan blijft de vorige kopie.
      if (!Object.keys(lijst).length) return;
      zetIngredientenUitDatabank(lijst);
      await AsyncStorage.setItem(SLEUTEL.ingredientenDb, JSON.stringify({ versie: inDatabank, lijst } satisfies BewaardeIngredienten));
    })().catch(() => undefined);
  }
  return ingredientenKlaar;
}

/** Een bewaarde kopie wordt opnieuw nagekeken (ze kan van een oudere app-versie komen). */
function leesIngredientRijenUitBewaard(lijst: Record<string, IngredientInfo>): Record<string, IngredientInfo> {
  return leesIngredientRijen(
    Object.entries(lijst).map(([code, [categorie, eenheid, namen]]) => ({
      code,
      categorie,
      eenheid,
      ingredient_vertalingen: ['nl', 'fr', 'de', 'en'].map((taal, i) => ({ taal, naam: namen?.[i] })),
    })),
  );
}
