// Favorieten / gezinskookboek (WEEK-21). Pure logica, zonder opslag.
import { STIJLEN, Soort, StijlCode } from '@/data/receptenbank';
import { AFDELINGEN, Afdeling } from '@/data/ingredienten';
import { rondAf } from '@/lib/planner/hoeveelheid';
import type { PlanDag, PlanIngredient, PlanRecept } from '@/lib/planner/types';

export type Favoriet = {
  id: string;
  naam: string;
  soort: Soort;
  stijlen: StijlCode[];
  /** Kooktijd in minuten. */
  minuten: number;
  basis?: PlanRecept['basis'];
  /** Hoeveelheden zoals in het weekplan, voor `porties` volwassen porties. */
  ingredienten: PlanIngredient[];
  /** Aantal personen in het gezin toen het recept bewaard werd. */
  personen: number;
  /** Aantal volwassen porties waarvoor de hoeveelheden gelden (kinderen tellen als kleinere porties). */
  porties: number;
  opgeslagenOp: string;
  /** Wie het recept bewaarde (gezinsruimte). */
  door?: string;
};

const klein = (t: string) => t.trim().toLocaleLowerCase();

/** Hetzelfde recept (zelfde naam) krijgt dezelfde id, zodat het maar één keer in het kookboek staat. */
export function favorietId(naam: string): string {
  return `fav:${klein(naam).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'recept'}`;
}

/** Maakt een favoriet van een (gekookt) recept uit het weekplan. */
export function favorietUitDag(dag: PlanDag, porties: number, personen: number, nu: Date, door?: string): Favoriet {
  const r = dag.recept;
  return {
    id: favorietId(r.naam),
    naam: r.naam,
    soort: r.soort,
    stijlen: [...r.stijlen],
    minuten: r.minuten,
    ...(r.basis ? { basis: r.basis } : {}),
    ingredienten: r.ingredienten.map((i) => ({ ...i })),
    personen,
    porties,
    opgeslagenOp: nu.toISOString(),
    ...(door ? { door } : {}),
  };
}

export function isFavoriet(favorieten: readonly Favoriet[], naam: string): boolean {
  const id = favorietId(naam);
  return favorieten.some((f) => f.id === id);
}

/** Voegt een favoriet toe; bestaat het recept al, dan wordt het bijgewerkt (op dezelfde plaats). */
export function bewaarFavoriet(favorieten: readonly Favoriet[], favoriet: Favoriet): Favoriet[] {
  return favorieten.some((f) => f.id === favoriet.id)
    ? favorieten.map((f) => (f.id === favoriet.id ? favoriet : f))
    : [...favorieten, favoriet];
}

export function verwijderFavoriet(favorieten: readonly Favoriet[], id: string): Favoriet[] {
  return favorieten.filter((f) => f.id !== id);
}

/** Het kookboek: alfabetisch op naam. */
export function kookboek(favorieten: readonly Favoriet[]): Favoriet[] {
  return [...favorieten].sort((a, b) => a.naam.localeCompare(b.naam));
}

/**
 * Een favoriet als recept voor het weekplan, met de hoeveelheden herrekend naar `porties`
 * (het gezin kan intussen groter of kleiner zijn).
 */
export function naarPlanRecept(f: Favoriet, porties: number): PlanRecept {
  const factor = f.porties > 0 ? porties / f.porties : 1;
  return {
    id: f.id,
    naam: f.naam,
    soort: f.soort,
    minuten: f.minuten,
    stijlen: [...f.stijlen],
    ...(f.basis ? { basis: f.basis } : {}),
    ingredienten: f.ingredienten.map((i) => ({ ...i, hoeveelheid: factor === 1 ? i.hoeveelheid : rondAf(i.hoeveelheid * factor, i.eenheid) })),
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const SOORTEN: Soort[] = ['vlees', 'vegetarisch', 'vis'];

/** Leest één favoriet veilig in (uit opslag of van een ander gezinslid); null als hij onbruikbaar is. */
export function leesFavoriet(ruw: unknown): Favoriet | null {
  if (!isObject(ruw) || typeof ruw.id !== 'string' || typeof ruw.naam !== 'string' || !ruw.naam.trim()) return null;
  if (!SOORTEN.includes(ruw.soort as Soort) || !Array.isArray(ruw.ingredienten)) return null;
  const ingredienten = ruw.ingredienten.flatMap((i): PlanIngredient[] => {
    if (!isObject(i) || typeof i.naam !== 'string' || !i.naam.trim()) return [];
    const hoeveelheid = typeof i.hoeveelheid === 'number' && Number.isFinite(i.hoeveelheid) && i.hoeveelheid >= 0 ? i.hoeveelheid : 0;
    const afdeling = AFDELINGEN.includes(i.afdeling as Afdeling) ? (i.afdeling as Afdeling) : 'droge-voeding';
    return [{ naam: i.naam, hoeveelheid, eenheid: typeof i.eenheid === 'string' ? i.eenheid : '', afdeling }];
  });
  if (!ingredienten.length) return null;
  const getal = (v: unknown, standaard: number) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : standaard);
  return {
    id: ruw.id,
    naam: ruw.naam.trim(),
    soort: ruw.soort as Soort,
    stijlen: Array.isArray(ruw.stijlen) ? STIJLEN.filter((s) => (ruw.stijlen as unknown[]).includes(s)) : [],
    minuten: Math.round(getal(ruw.minuten, 30)),
    ...(typeof ruw.basis === 'string' ? { basis: ruw.basis as PlanRecept['basis'] } : {}),
    ingredienten,
    personen: Math.round(getal(ruw.personen, 1)),
    porties: getal(ruw.porties, 1),
    opgeslagenOp: typeof ruw.opgeslagenOp === 'string' ? ruw.opgeslagenOp : new Date(0).toISOString(),
    ...(typeof ruw.door === 'string' && ruw.door ? { door: ruw.door } : {}),
  };
}

export function normaliseerFavorieten(ruw: unknown): Favoriet[] {
  return Array.isArray(ruw) ? ruw.map(leesFavoriet).filter((f): f is Favoriet => f !== null) : [];
}
