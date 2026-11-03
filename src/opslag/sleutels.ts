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
  keuzes: 'planningkeuzes:v1',
  profiel: 'gezinsprofiel:v1',
  /** Welkomstscherm gezien op dit toestel (WEEK-79): enkel lokaal, niet in de gezinssynchronisatie. */
  welkom: 'welkom:v1',
  /** Taal van de app op dit toestel (WEEK-80): niet in het gezin en niet op andere toestellen. */
  taal: 'taal:v1',
  /** Versie van de taalregel op dit toestel (WEEK-186): bij een nieuwe versie wordt de oude taalkeuze eenmalig losgelaten. */
  taalVersie: 'taalversie:v1',
  /** Voornaam van de gebruiker op dit toestel (WEEK-163): wordt bij aansluiten meegestuurd naar het gezin. */
  voornaam: 'voornaam:v1',
  gezin: 'gezin:v1',
  /** Aantal scans vandaag op dit toestel (WEEK-34). */
  scans: 'scans:v1',
  /** Winkels van eerdere zoekopdrachten per postcode (WEEK-148): enkel lokaal, niet in de gezinssynchronisatie. */
  winkelCache: 'winkelcache:v1',
  /** Synchronisatietoestand per soort/document (zie src/opslag/sync.ts). */
  sync: 'sync:v1',
} as const;
