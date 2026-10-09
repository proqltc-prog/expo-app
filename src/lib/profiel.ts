// Gezinsprofiel: vaste gegevens die één keer ingevuld worden en daarna
// automatisch meegaan met elke AI-vraag (WEEK-7). Pure logica, zonder opslag.
import { isTaal, Taal } from '@/i18n';

export type Adres = {
  straat: string;
  postcode: string;
  gemeente: string;
  land: string;
};

export type Profiel = {
  volwassenen: number;
  /** Leeftijd van elk kind in jaren. */
  kinderen: number[];
  /** Budget voor de boodschappen per week in euro; undefined = geen budget opgegeven. */
  weekbudget?: number;
  /** Vrije omschrijving van de gezinssamenstelling, bv. "kinderen eten kleine porties". */
  samenstelling: string;
  adres: Adres;
  /** Taal van de app; undefined = taal van het toestel (WEEK-22). */
  taal?: Taal;
};

export const MAX_VOLWASSENEN = 10;
export const MAX_KINDEREN = 10;
export const MAX_LEEFTIJD_KIND = 17;

export function standaardProfiel(): Profiel {
  return {
    volwassenen: 2,
    kinderen: [],
    weekbudget: undefined,
    samenstelling: '',
    adres: { straat: '', postcode: '', gemeente: '', land: 'België' },
    taal: undefined,
  };
}

export function aantalPersonen(p: Profiel): number {
  return p.volwassenen + p.kinderen.length;
}

/**
 * Leest een bedrag zoals een gebruiker het typt: "120", "120,50", "€ 85.5", "1.250,00".
 * Geeft undefined bij lege invoer en NaN bij ongeldige invoer.
 */
export function leesBedrag(invoer: string): number | undefined {
  const t = invoer.replace(/[€\s]/g, '');
  if (t === '') return undefined;
  let genormaliseerd = t;
  if (t.includes(',') && t.includes('.')) {
    // Het laatste scheidingsteken is het decimaalteken.
    genormaliseerd = t.lastIndexOf(',') > t.lastIndexOf('.')
      ? t.replace(/\./g, '').replace(',', '.')
      : t.replace(/,/g, '');
  } else if (t.includes(',')) {
    genormaliseerd = t.replace(',', '.');
  }
  if (!/^\d+(\.\d+)?$/.test(genormaliseerd)) return NaN;
  return Math.round(Number(genormaliseerd) * 100) / 100;
}

export type ProfielFout =
  | 'volwassenen'
  | 'kinderen'
  | 'leeftijd'
  | 'budget'
  | 'postcode';

/** Controleert een profiel en geeft de lijst met fouten terug (leeg = in orde). */
export function valideerProfiel(p: Profiel): ProfielFout[] {
  const fouten: ProfielFout[] = [];
  if (!Number.isInteger(p.volwassenen) || p.volwassenen < 1 || p.volwassenen > MAX_VOLWASSENEN) fouten.push('volwassenen');
  if (p.kinderen.length > MAX_KINDEREN) fouten.push('kinderen');
  if (p.kinderen.some((l) => !Number.isInteger(l) || l < 0 || l > MAX_LEEFTIJD_KIND)) fouten.push('leeftijd');
  if (p.weekbudget !== undefined && (!Number.isFinite(p.weekbudget) || p.weekbudget <= 0)) fouten.push('budget');
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
  const kinderen = Array.isArray(r.kinderen)
    ? r.kinderen.filter((l): l is number => typeof l === 'number' && Number.isInteger(l) && l >= 0 && l <= MAX_LEEFTIJD_KIND).slice(0, MAX_KINDEREN)
    : basis.kinderen;
  const volwassenen = Math.min(MAX_VOLWASSENEN, Math.max(1, Math.round(getal(r.volwassenen, basis.volwassenen))));
  const budget = typeof r.weekbudget === 'number' && Number.isFinite(r.weekbudget) && r.weekbudget > 0 ? r.weekbudget : undefined;
  return {
    volwassenen,
    kinderen,
    weekbudget: budget,
    samenstelling: tekst(r.samenstelling),
    adres: {
      straat: tekst(adres.straat),
      postcode: tekst(adres.postcode),
      gemeente: tekst(adres.gemeente),
      land: tekst(adres.land, basis.adres.land),
    },
    taal: isTaal(r.taal) ? r.taal : undefined,
  };
}

/**
 * Context voor de AI-planner. Gaat automatisch mee met elke vraag, zodat de
 * gebruiker het gezin niet in zijn prompt hoeft te herhalen.
 * Privacy: enkel gemeente en land, nooit straat of postcode.
 */
export function profielContext(p: Profiel): string {
  const regels: string[] = [];
  const kinderTekst = p.kinderen.length
    ? `, ${p.kinderen.length} ${p.kinderen.length === 1 ? 'kind' : 'kinderen'} (${[...p.kinderen].sort((a, b) => a - b).map((l) => `${l} jaar`).join(', ')})`
    : '';
  regels.push(`Gezin: ${aantalPersonen(p)} personen – ${p.volwassenen} ${p.volwassenen === 1 ? 'volwassene' : 'volwassenen'}${kinderTekst}.`);
  if (p.weekbudget !== undefined) regels.push(`Budget voor boodschappen: € ${p.weekbudget.toFixed(2).replace('.', ',')} per week.`);
  if (p.samenstelling.trim()) regels.push(`Opmerkingen over het gezin: ${p.samenstelling.trim()}`);
  const plaats = [p.adres.gemeente.trim(), p.adres.land.trim()].filter(Boolean).join(', ');
  if (plaats) regels.push(`Woonplaats: ${plaats}.`);
  return regels.join('\n');
}
