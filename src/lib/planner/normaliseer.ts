import { isGeldigeIso, plandagenVoorDatums } from '@/lib/planner/datums';
// Controle van een weekplan dat van buitenaf komt (opslag op het toestel of AI-antwoord).
import { AFDELINGEN, Afdeling } from '@/data/ingredienten';
import type { Vermijd } from '@/data/vermijden';
import { MOMENTEN, Moment, STIJLEN, StijlCode, Soort } from '@/data/receptenbank';
import { normaliseerMomenten } from './moment';
import { isTaal, type Taal } from '@/i18n';
import { normaliseerFrigo } from '@/lib/frigo';
import { normaliseerVermijd } from './vermijden';
import { normaliseerPeriode, PERIODE_STANDAARD } from './periode';
import { KOOKTIJD_IDS, STIJL_IDS } from './opties';
import { DagCode, KooktijdCode, KOOKTIJDEN, PlanDag, PlanIngredient, PlanRecept, Weekplan, WEEKDAGEN } from './types';

const SOORTEN: Soort[] = ['vlees', 'vegetarisch', 'vis'];

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const tekst = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Vertalingen van een plan-item; onbekende talen en lege teksten vallen weg (WEEK-154). */
function normaliseerVertalingen(ruw: unknown): Partial<Record<Taal, string>> | undefined {
  if (!isObject(ruw)) return undefined;
  const uit: Partial<Record<Taal, string>> = {};
  for (const [taal, waarde] of Object.entries(ruw)) {
    if (isTaal(taal) && tekst(waarde)) uit[taal] = tekst(waarde);
  }
  return Object.keys(uit).length ? uit : undefined;
}

export function normaliseerIngredient(ruw: unknown): PlanIngredient | null {
  if (!isObject(ruw)) return null;
  const naam = tekst(ruw.naam);
  const hoeveelheid = typeof ruw.hoeveelheid === 'number' && Number.isFinite(ruw.hoeveelheid) && ruw.hoeveelheid >= 0 ? ruw.hoeveelheid : 0;
  if (!naam) return null;
  const afdeling: Afdeling = AFDELINGEN.includes(ruw.afdeling as Afdeling) ? (ruw.afdeling as Afdeling) : 'droge-voeding';
  const ingredient: PlanIngredient = { naam, hoeveelheid, eenheid: tekst(ruw.eenheid), afdeling };
  if (tekst(ruw.code)) ingredient.code = tekst(ruw.code);
  const namen = normaliseerVertalingen(ruw.namen);
  if (namen) ingredient.namen = namen;
  return ingredient;
}

export function normaliseerRecept(ruw: unknown): PlanRecept | null {
  if (!isObject(ruw)) return null;
  const naam = tekst(ruw.naam);
  if (!naam || !SOORTEN.includes(ruw.soort as Soort)) return null;
  const ingredienten = Array.isArray(ruw.ingredienten)
    ? ruw.ingredienten.map(normaliseerIngredient).filter((i): i is PlanIngredient => i !== null)
    : [];
  if (!ingredienten.length) return null;
  const minuten = typeof ruw.minuten === 'number' && ruw.minuten > 0 && ruw.minuten < 24 * 60 ? Math.round(ruw.minuten) : 30;
  const stijlen = Array.isArray(ruw.stijlen) ? ruw.stijlen.filter((s): s is StijlCode => STIJLEN.includes(s as StijlCode)) : [];
  const recept: PlanRecept = {
    id: tekst(ruw.id) || naam.toLowerCase().replace(/\s+/g, '-'),
    naam,
    soort: ruw.soort as Soort,
    minuten,
    stijlen,
    basis: typeof ruw.basis === 'string' ? (ruw.basis as PlanRecept['basis']) : undefined,
    ingredienten,
  };
  const titels = normaliseerVertalingen(ruw.titels);
  if (titels) recept.titels = titels;
  return recept;
}

/** Leest een bewaard weekplan in; geeft null als het onbruikbaar is. */
export function normaliseerWeekplan(ruw: unknown): Weekplan | null {
  if (!isObject(ruw) || !Array.isArray(ruw.dagen)) return null;
  const dagen = ruw.dagen
    .map((d) => {
      if (!isObject(d) || !WEEKDAGEN.includes(d.dag as DagCode)) return null;
      const recept = normaliseerRecept(d.recept);
      if (!recept) return null;
      const dag: PlanDag = { dag: d.dag as DagCode, recept };
      if (MOMENTEN.includes(d.moment as Moment)) dag.moment = d.moment as Moment;
      if (isGeldigeIso(d.datum)) dag.datum = d.datum;
      const ontbreekt = Array.isArray(d.ontbreekt) ? d.ontbreekt.filter((n): n is string => typeof n === 'string' && !!n.trim()) : [];
      if (ontbreekt.length) dag.ontbreekt = ontbreekt;
      const uitFrigo = Array.isArray(d.uitFrigo) ? d.uitFrigo.filter((n): n is string => typeof n === 'string' && !!n.trim()) : [];
      if (uitFrigo.length) dag.uitFrigo = uitFrigo;
      if (d.bevestigd === true) dag.bevestigd = true;
      if (d.gedaan === true) {
        dag.gedaan = true;
        const verbruikt = normaliseerFrigo(d.verbruikt);
        if (verbruikt.length) dag.verbruikt = verbruikt;
      }
      return dag;
    })
    .filter((d): d is PlanDag => d !== null);
  if (!dagen.length) return null;
  return {
    dagen,
    kooktijden: Array.isArray(ruw.kooktijden) ? ruw.kooktijden.filter((k): k is KooktijdCode => KOOKTIJDEN.includes(k as KooktijdCode)) : [],
    stijlen: Array.isArray(ruw.stijlen) ? ruw.stijlen.filter((s): s is StijlCode => STIJLEN.includes(s as StijlCode)) : [],
    ...(normaliseerVermijd(ruw.vermijd).length ? { vermijd: normaliseerVermijd(ruw.vermijd) } : {}),
    taal: isTaal(ruw.taal) ? ruw.taal : 'nl',
    porties: typeof ruw.porties === 'number' && ruw.porties > 0 ? ruw.porties : 2,
    bron: ruw.bron === 'db' ? 'db' : 'lokaal', // oude AI-plannen en 'favorieten'-plannen (WEEK-72) worden lokaal
    gemaaktOp: tekst(ruw.gemaaktOp) || new Date(0).toISOString(),
    ...(ruw.versoepeld === true ? { versoepeld: true } : {}),
    ...(ruw.herhaald === true ? { herhaald: true } : {}),
    ...(ruw.kort === true ? { kort: true } : {}),
    ...(tekst(ruw.beheerder) ? { beheerder: tekst(ruw.beheerder) } : {}),
  };
}

/** Leest bewaarde keuzes voor kooktijd en stijl veilig in. */
export function normaliseerKeuzes(ruw: unknown): {
  kooktijden: string[];
  stijlen: string[];
  vermijd: Vermijd[];
  aantalDagen: number;
  momenten: Moment[];
  datums: string[];
  uitgesloten: string[];
} {
  if (!isObject(ruw)) return { kooktijden: [], stijlen: [], vermijd: [], aantalDagen: PERIODE_STANDAARD, momenten: ['avond'], datums: [], uitgesloten: [] };
  // Oude codes (snel/gemiddeld/uitgebreid, klassiek…) en de keuzes van het weekmenu blijven geldig.
  const kooktijdToegestaan = [...new Set<string>([...KOOKTIJDEN, ...KOOKTIJD_IDS])];
  const stijlToegestaan = [...new Set<string>([...STIJLEN, ...STIJL_IDS])];
  return {
    kooktijden: Array.isArray(ruw.kooktijden) ? kooktijdToegestaan.filter((k) => (ruw.kooktijden as unknown[]).includes(k)) : [],
    stijlen: Array.isArray(ruw.stijlen) ? stijlToegestaan.filter((s) => (ruw.stijlen as unknown[]).includes(s)) : [],
    vermijd: normaliseerVermijd(ruw.vermijd),
    aantalDagen: normaliseerPeriode(ruw.aantalDagen) ?? PERIODE_STANDAARD,
    momenten: normaliseerMomenten(ruw.momenten),
    datums: normaliseerDatums(ruw.datums),
    uitgesloten: normaliseerDatums(ruw.uitgesloten),
  };
}

/** Gekozen datums: geldig, uniek, gesorteerd en binnen 7 dagen (WEEK-97). */
function normaliseerDatums(ruw: unknown): string[] {
  if (!Array.isArray(ruw)) return [];
  return plandagenVoorDatums(ruw.filter((d): d is string => typeof d === 'string')).map((p) => p.datum);
}
