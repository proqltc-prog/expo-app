// Sleutels van de opslag op het toestel (AsyncStorage), op één plaats zodat de
// synchronisatie (src/opslag/sync.ts) dezelfde gegevens leest en schrijft als de schermen.
export const SLEUTEL = {
  lijst: 'boodschappenlijst:v1',
  lijstWeergave: 'lijstweergave:v1',
  frigo: 'frigo:v1',
  favorieten: 'favorieten:v1',
  /** Eigen recepten (WEEK-45): enkel op dit toestel, niet in de gezinssynchronisatie. */
  eigenRecepten: 'eigenrecepten:v1',
  plan: 'weekplan:v1',
  opdrachten: 'opdrachten:v1',
  keuzes: 'planningkeuzes:v1',
  profiel: 'gezinsprofiel:v1',
  gezin: 'gezin:v1',
  /** Aantal scans vandaag op dit toestel (WEEK-34). */
  scans: 'scans:v1',
  /** Synchronisatietoestand per soort/document (zie src/opslag/sync.ts). */
  sync: 'sync:v1',
} as const;
