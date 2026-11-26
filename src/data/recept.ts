// Gedeelde types en constanten van een recept (WEEK-208): soort, stijl, basis, eenheid en maaltijdmoment.
// De recepten zelf komen uitsluitend uit de databank (zie src/opslag/receptenbank.ts en src/lib/planner/db.ts).

export type Soort = 'vegetarisch' | 'vis' | 'vlees';
/** WEEK-216: de soorten in de volgorde van de filterknoppen. */
export const SOORTEN: readonly Soort[] = ['vis', 'vegetarisch', 'vlees'];
// WEEK-341: de databank kent ook indiaas, chinees, belgisch en frans (fijnere stijlen dan aziatisch en klassiek).
export type StijlCode = 'klassiek' | 'italiaans' | 'aziatisch' | 'mexicaans' | 'mediterraan' | 'thais' | 'japans' | 'koreaans' | 'indiaas' | 'chinees' | 'belgisch' | 'frans';
export type Basis = 'pasta' | 'rijst' | 'aardappel' | 'brood' | 'wrap' | 'noedels' | 'granen';
export type Eenheid = 'g' | 'ml' | 'stuk' | 'teentje';
/** Wanneer het recept gegeten wordt. De app plant enkel avondeten (WEEK-189). */
export type Moment = 'avond';
export const MOMENTEN: readonly Moment[] = ['avond'];

// Stijlen van de databank. 'licht' en 'comfort' zijn verwijderd (WEEK-78).
/** De stijlen om een eigen gerecht te kenmerken (keuze bij Eigen gerecht). */
export const STIJLEN: StijlCode[] = ['klassiek', 'italiaans', 'aziatisch', 'mexicaans', 'mediterraan', 'thais', 'japans', 'koreaans'];
/** WEEK-341: alle stijlen die in de databank en in een bewaard weekmenu kunnen staan. */
export const DB_STIJLEN: StijlCode[] = [...STIJLEN, 'indiaas', 'chinees', 'belgisch', 'frans'];
