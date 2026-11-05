// Brug tussen de keuzes in het weekmenu (opties.ts) en de codes die de planner gebruikt (KooktijdCode en StijlCode uit de database).
// WEEK-199: de kooktijden zijn nu dezelfde codes als in de databank; enkel de stijlen worden nog vertaald.
import type { Moment, StijlCode } from '@/data/recept';
import { KOOKTIJDEN, KooktijdCode } from '@/lib/kooktijd';
import { kooktijdOpties } from '@/lib/planner/opties';

/** De gekozen kooktijden als databasecodes, in vaste volgorde. Enkel keuzes die bij de momenten horen; onbekende vallen weg. */
export function kooktijdNaarDb(momenten: readonly Moment[], gekozen: readonly string[]): KooktijdCode[] {
  const beschikbaar = new Set(momenten.flatMap((m) => kooktijdOpties(m).map((o) => o.id)));
  return KOOKTIJDEN.filter((code) => beschikbaar.has(code) && gekozen.includes(code));
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
