// Gezinsprofiel: vaste gegevens die één keer ingevuld worden en daarna
// automatisch meegaan met elke AI-vraag (WEEK-7). Pure logica, zonder opslag.
// WEEK-69: budget en maximale afstand zijn verwijderd. Oude waarden in de opslag worden genegeerd.
export type Adres = {
  postcode: string;
  gemeente: string;
  land: string;
};

export type Profiel = {
  volwassenen: number;
  /** Aantal kinderen van 0 tot 12 jaar. Elk kind telt als een halve portie (WEEK-40). */
  kinderen: number;
  adres: Adres;
};

export const MAX_VOLWASSENEN = 10;
export const MAX_KINDEREN = 10;

export function standaardProfiel(): Profiel {
  // WEEK-91: een nieuw gezin start leeg (0 en 0); de gebruiker vult zelf in.
  return {
    volwassenen: 0,
    kinderen: 0,
    adres: { postcode: '', gemeente: '', land: 'België' },
  };
}

export function aantalPersonen(p: Profiel): number {
  return p.volwassenen + p.kinderen;
}

export type ProfielFout = 'volwassenen' | 'kinderen' | 'postcode';

/** Controleert een profiel en geeft de lijst met fouten terug (leeg = in orde). */
export function valideerProfiel(p: Profiel): ProfielFout[] {
  const fouten: ProfielFout[] = [];
  if (!Number.isInteger(p.volwassenen) || p.volwassenen < 1 || p.volwassenen > MAX_VOLWASSENEN) fouten.push('volwassenen');
  if (!Number.isInteger(p.kinderen) || p.kinderen < 0 || p.kinderen > MAX_KINDEREN) fouten.push('kinderen');
  if (p.adres.postcode.trim() !== '' && !/^[0-9A-Za-z -]{3,10}$/.test(p.adres.postcode.trim())) fouten.push('postcode');
  return fouten;
}

const getal = (v: unknown, standaard: number) => (typeof v === 'number' && Number.isFinite(v) ? v : standaard);
const tekst = (v: unknown, standaard = '') => (typeof v === 'string' ? v : standaard);

/**
 * Zet ruwe (bewaarde) data om naar een geldig profiel. Ontbrekende of foute
 * velden krijgen de standaardwaarde, zodat oude of beschadigde opslag de app niet breekt.
 */
export function normaliseerProfiel(ruw: unknown): Profiel {
  const basis = standaardProfiel();
  if (!ruw || typeof ruw !== 'object') return basis;
  const r = ruw as Record<string, unknown>;
  const adres = (r.adres && typeof r.adres === 'object' ? r.adres : {}) as Record<string, unknown>;
  // Oude profielen bewaarden de leeftijd van elk kind: dan telt het aantal items.
  const kinderen = Array.isArray(r.kinderen)
    ? Math.min(MAX_KINDEREN, r.kinderen.length)
    : Math.min(MAX_KINDEREN, Math.max(0, Math.round(getal(r.kinderen, basis.kinderen))));
  const volwassenen = Math.min(MAX_VOLWASSENEN, Math.max(1, Math.round(getal(r.volwassenen, basis.volwassenen))));
  return {
    volwassenen,
    kinderen,
    adres: {
      postcode: tekst(adres.postcode),
      gemeente: tekst(adres.gemeente),
      land: tekst(adres.land, basis.adres.land),
    },
  };
}

/**
 * Context voor de AI-planner. Gaat automatisch mee met elke vraag, zodat de
 * gebruiker het gezin niet in zijn prompt hoeft te herhalen.
 * Privacy: enkel gemeente en land, nooit de postcode.
 */
export function profielContext(p: Profiel): string {
  const regels: string[] = [];
  const kinderTekst = p.kinderen ? `, ${p.kinderen} ${p.kinderen === 1 ? 'kind' : 'kinderen'} (0 tot 12 jaar)` : '';
  regels.push(`Gezin: ${aantalPersonen(p)} personen – ${p.volwassenen} ${p.volwassenen === 1 ? 'volwassene' : 'volwassenen'}${kinderTekst}.`);
  const plaats = [p.adres.gemeente.trim(), p.adres.land.trim()].filter(Boolean).join(', ');
  if (plaats) regels.push(`Woonplaats: ${plaats}.`);
  return regels.join('\n');
}
