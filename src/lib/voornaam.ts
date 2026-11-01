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
