// De voornaam van de gebruiker (WEEK-163). Pure logica, zonder React Native.
// Max. 20 tekens, enkel letters (ook met accenten), met spaties, koppelteken of apostrof tussen de letters.
// Andere leestekens en symbolen (. : , £ % ¨ * ? ; …) worden geweigerd.

export const MAX_VOORNAAM = 20;

export type VoornaamFout = 'leeg' | 'teLang' | 'ongeldig';

/** Letters, met één scheidingsteken (spatie, - of ') tussen twee letters. */
const TOEGESTAAN = /^\p{L}+(?:[ '-]\p{L}+)*$/u;

export function valideerVoornaam(invoer: string): { ok: true; naam: string } | { ok: false; fout: VoornaamFout } {
  const naam = invoer.trim().replace(/\s+/g, ' ');
  if (!naam) return { ok: false, fout: 'leeg' };
  if ([...naam].length > MAX_VOORNAAM) return { ok: false, fout: 'teLang' };
  if (!TOEGESTAAN.test(naam)) return { ok: false, fout: 'ongeldig' };
  return { ok: true, naam };
}

/**
 * WEEK-283: de voornaam waarmee iemand een gezinsruimte maakt of lid wordt. Verplicht.
 * Wat in het veld staat, gaat voor (ook als het nog niet opgeslagen is); een leeg veld valt terug op de opgeslagen naam.
 * Geen geldige naam: dezelfde fout als bij opslaan, en er wordt niets gemaakt of vervoegd.
 */
export function naamVoorGezinsruimte(opgeslagen: string, invoer: string): { ok: true; naam: string } | { ok: false; fout: VoornaamFout } {
  return valideerVoornaam(invoer.trim() ? invoer : opgeslagen);
}

/** WEEK-283: in een gezinsruimte zonder eigen voornaam vraagt de app die op te geven. */
export function vraagVoornaamInGezin(inGezin: boolean, opgeslagen: string): boolean {
  return inGezin && !valideerVoornaam(opgeslagen).ok;
}
