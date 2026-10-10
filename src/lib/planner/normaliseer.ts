// Controle van een weekplan dat van buitenaf komt (opslag op het toestel of AI-antwoord).
import { AFDELINGEN, Afdeling } from '@/data/ingredienten';
import { STIJLEN, StijlCode, Soort } from '@/data/receptenbank';
import { isTaal } from '@/i18n';
import { normaliseerFrigo } from '@/lib/frigo';
import { DagCode, KooktijdCode, KOOKTIJDEN, PlanDag, PlanIngredient, PlanRecept, Weekplan, WEEKDAGEN } from './types';

const SOORTEN: Soort[] = ['vlees', 'vegetarisch', 'vis'];

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const tekst = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function normaliseerIngredient(ruw: unknown): PlanIngredient | null {
  if (!isObject(ruw)) return null;
  const naam = tekst(ruw.naam);
  const hoeveelheid = typeof ruw.hoeveelheid === 'number' && Number.isFinite(ruw.hoeveelheid) && ruw.hoeveelheid >= 0 ? ruw.hoeveelheid : 0;
  if (!naam) return null;
  const afdeling: Afdeling = AFDELINGEN.includes(ruw.afdeling as Afdeling) ? (ruw.afdeling as Afdeling) : 'droge-voeding';
  return { naam, hoeveelheid, eenheid: tekst(ruw.eenheid), afdeling };
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
  return {
    id: tekst(ruw.id) || naam.toLowerCase().replace(/\s+/g, '-'),
    naam,
    soort: ruw.soort as Soort,
    minuten,
    stijlen,
    basis: typeof ruw.basis === 'string' ? (ruw.basis as PlanRecept['basis']) : undefined,
    ingredienten,
  };
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
      const ontbreekt = Array.isArray(d.ontbreekt) ? d.ontbreekt.filter((n): n is string => typeof n === 'string' && !!n.trim()) : [];
      if (ontbreekt.length) dag.ontbreekt = ontbreekt;
      const uitFrigo = Array.isArray(d.uitFrigo) ? d.uitFrigo.filter((n): n is string => typeof n === 'string' && !!n.trim()) : [];
      if (uitFrigo.length) dag.uitFrigo = uitFrigo;
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
    opdracht: tekst(ruw.opdracht),
    kooktijden: Array.isArray(ruw.kooktijden) ? ruw.kooktijden.filter((k): k is KooktijdCode => KOOKTIJDEN.includes(k as KooktijdCode)) : [],
    stijlen: Array.isArray(ruw.stijlen) ? ruw.stijlen.filter((s): s is StijlCode => STIJLEN.includes(s as StijlCode)) : [],
    taal: isTaal(ruw.taal) ? ruw.taal : 'nl',
    porties: typeof ruw.porties === 'number' && ruw.porties > 0 ? ruw.porties : 2,
    bron: ruw.bron === 'ai' ? 'ai' : 'lokaal',
    gemaaktOp: tekst(ruw.gemaaktOp) || new Date(0).toISOString(),
    ...(ruw.versoepeld === true ? { versoepeld: true } : {}),
    ...(ruw.terugval === true ? { terugval: true } : {}),
  };
}

/** Leest bewaarde keuzes voor kooktijd en stijl veilig in. */
export function normaliseerKeuzes(ruw: unknown): { kooktijden: KooktijdCode[]; stijlen: StijlCode[] } {
  if (!isObject(ruw)) return { kooktijden: [], stijlen: [] };
  return {
    kooktijden: Array.isArray(ruw.kooktijden) ? KOOKTIJDEN.filter((k) => (ruw.kooktijden as unknown[]).includes(k)) : [],
    stijlen: Array.isArray(ruw.stijlen) ? STIJLEN.filter((s) => (ruw.stijlen as unknown[]).includes(s)) : [],
  };
}
