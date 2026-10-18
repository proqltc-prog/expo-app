// Tijdelijke brug tussen de keuzes in het weekmenu (opties.ts) en de codes die de planner nu gebruikt
// (KooktijdCode en StijlCode uit de database). Verdwijnt zodra WEEK-68 deel 4c de database en de codes gelijktrekt.
import type { Moment, StijlCode } from '@/data/receptenbank';
import { kooktijdOpties } from '@/lib/planner/opties';
import type { KooktijdCode } from '@/lib/planner/types';

/** Minuten-bereik van de databasecodes (zie kooktijdVan in types.ts). */
const DB_BEREIK: Record<KooktijdCode, { van: number; tot: number }> = {
  snel: { van: 0, tot: 20 },
  gemiddeld: { van: 21, tot: 40 },
  uitgebreid: { van: 41, tot: Number.POSITIVE_INFINITY },
};

/** Welke databasecodes een keuze-moment-combinatie dekt: alle codes waarvan het bereik overlapt met de gekozen kooktijd. */
export function kooktijdNaarDb(momenten: readonly Moment[], gekozen: readonly string[]): KooktijdCode[] {
  const uit = new Set<KooktijdCode>();
  for (const m of momenten) {
    for (const optie of kooktijdOpties(m)) {
      if (!gekozen.includes(optie.id)) continue;
      for (const code of Object.keys(DB_BEREIK) as KooktijdCode[]) {
        const bereik = DB_BEREIK[code];
        if (optie.van <= bereik.tot && optie.tot >= bereik.van) uit.add(code);
      }
    }
  }
  return (Object.keys(DB_BEREIK) as KooktijdCode[]).filter((c) => uit.has(c));
}

const STIJL_NAAR_DB: Record<string, StijlCode[]> = {
  mediterraan: ['mediterraan'],
  italiaans: ['italiaans'],
  frans: ['klassiek'],
  belgisch: ['klassiek'],
  mexicaans: ['mexicaans'],
  chinees: ['aziatisch'],
  japans: ['japans'],
  koreaans: ['koreaans'],
  thais: ['thais'],
  indiaas: ['aziatisch'],
  hartig: ['klassiek'],
  zoet: ['klassiek'],
};

/** De databasestijlen die bij de gekozen stijlen horen, zonder dubbele. Onbekende keuzes vallen weg. */
export function stijlNaarDb(gekozen: readonly string[]): StijlCode[] {
  const uit = new Set<StijlCode>();
  for (const id of gekozen) for (const code of STIJL_NAAR_DB[id] ?? []) uit.add(code);
  return [...uit];
}
