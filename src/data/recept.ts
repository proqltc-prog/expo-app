// Gedeelde types en constanten van een recept (WEEK-208): soort, stijl, basis, eenheid en maaltijdmoment.
// De recepten zelf komen uitsluitend uit de databank (zie src/opslag/receptenbank.ts en src/lib/planner/db.ts).

export type Soort = 'vegetarisch' | 'vis' | 'vlees';
export type StijlCode = 'klassiek' | 'italiaans' | 'aziatisch' | 'mexicaans' | 'mediterraan' | 'thais' | 'japans' | 'koreaans';
export type Basis = 'pasta' | 'rijst' | 'aardappel' | 'brood' | 'wrap' | 'noedels' | 'granen';
export type Eenheid = 'g' | 'ml' | 'stuk' | 'teentje';
/** Wanneer het recept gegeten wordt. De app plant enkel avondeten (WEEK-189). */
export type Moment = 'avond';
export const MOMENTEN: readonly Moment[] = ['avond'];

// Stijlen van de databank. 'licht' en 'comfort' zijn verwijderd (WEEK-78).
export const STIJLEN: StijlCode[] = ['klassiek', 'italiaans', 'aziatisch', 'mexicaans', 'mediterraan', 'thais', 'japans', 'koreaans'];
