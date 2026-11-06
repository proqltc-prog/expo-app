// Kooktijd (WEEK-199): één indeling voor de hele app, pure logica zonder React Native.
// snel: tot 30 min · gemiddeld: 31–45 min · uitgebreid: 46–60 min. Een recept duurt nooit langer dan een uur.
// Het weekmenu, het Kies-scherm, de planner en het formulier voor eigen recepten gebruiken allemaal deze indeling.

export type KooktijdCode = 'snel' | 'gemiddeld' | 'uitgebreid';
export const KOOKTIJDEN: KooktijdCode[] = ['snel', 'gemiddeld', 'uitgebreid'];

/** Harde bovengrens: recepten die langer duren dan een uur komen niet in de app. */
export const MAX_KOOKTIJD_MIN = 60;

export type KooktijdBereik = { van: number; tot: number };

/** Het bereik in minuten per kooktijd, zoals de app het toont ("Gemiddeld (31–45 min)"). */
export const KOOKTIJD_BEREIK: Record<KooktijdCode, KooktijdBereik> = {
  snel: { van: 1, tot: 30 },
  gemiddeld: { van: 31, tot: 45 },
  uitgebreid: { van: 46, tot: MAX_KOOKTIJD_MIN },
};

/** Welke kooktijd bij dit aantal minuten hoort. Boven de bovengrens telt als uitgebreid; zie binnenKooktijd. */
export function kooktijdVan(minuten: number): KooktijdCode {
  if (minuten <= KOOKTIJD_BEREIK.snel.tot) return 'snel';
  if (minuten <= KOOKTIJD_BEREIK.gemiddeld.tot) return 'gemiddeld';
  return 'uitgebreid';
}

/** Past een recept van zoveel minuten binnen de app: een geheel aantal minuten van 1 tot en met 60? */
export function binnenKooktijd(minuten: number): boolean {
  return Number.isInteger(minuten) && minuten >= 1 && minuten <= MAX_KOOKTIJD_MIN;
}

/**
 * De vaste schatting per kooktijd: het gemiddelde van de databankrecepten in die kooktijd op 4 november 2026.
 * Geldt zolang de databank niet geladen is, of voor een kooktijd zonder recepten.
 */
export const KOOKTIJD_SCHATTING_STANDAARD: Record<KooktijdCode, number> = { snel: 25, gemiddeld: 40, uitgebreid: 56 };

/**
 * De geschatte tijd per kooktijd uit de databank: het afgeronde gemiddelde van de recepten in die kooktijd.
 * Recepten buiten de bovengrens tellen niet mee. Een kooktijd zonder recepten houdt de vaste schatting.
 */
export function kooktijdSchattingen(minutenLijst: readonly number[]): Record<KooktijdCode, number> {
  const uit = { ...KOOKTIJD_SCHATTING_STANDAARD };
  for (const code of KOOKTIJDEN) {
    const inBereik = minutenLijst.filter((m) => binnenKooktijd(m) && kooktijdVan(m) === code);
    if (inBereik.length) uit[code] = Math.round(inBereik.reduce((a, b) => a + b, 0) / inBereik.length);
  }
  return uit;
}

/**
 * WEEK-218: op het scherm "Nieuw recept" kiest de gebruiker enkel een kooktijd; de minuten zijn de geschatte tijd ervan.
 * Een bestaand recept houdt zijn eigen minuten (en dus zijn kooktijd) als die binnen het bereik liggen.
 */
export function minutenVoorKooktijd(code: KooktijdCode, schattingen: Record<KooktijdCode, number> = KOOKTIJD_SCHATTING_STANDAARD): number {
  const m = schattingen[code];
  return binnenKooktijd(m) && kooktijdVan(m) === code ? m : KOOKTIJD_SCHATTING_STANDAARD[code];
}
