// Recepten uit de Supabase-database omzetten naar het formaat van het weekplan (WEEK-68).
// Pure logica: geen netwerk. Het ophalen zit in src/opslag/receptenbank.ts.
// Hoeveelheden in de database gelden voor 1 volwassene; hier worden ze geschaald naar het gezin (WEEK-67).
import type { Afdeling } from '@/data/ingredienten';
import type { Basis, Moment, Soort, StijlCode } from '@/data/receptenbank';
import type { Taal } from '@/i18n';
import { geschaaldeHoeveelheid, Gezin } from '@/lib/schaal';
import type { PlanIngredient, PlanRecept } from '@/lib/planner/types';

/** Teksten per taal. Ontbreekt de gekozen taal, dan nl, en anders de eerste beschikbare. */
export type Vertalingen = Partial<Record<Taal, string>>;

export type DbIngredient = {
  code: string;
  /** Categorie uit de database (bv. groente, vlees, zuivel). */
  categorie: string;
  namen: Vertalingen;
  hoeveelheid: number;
  eenheid: string;
};

export type DbRecept = {
  id: number;
  porties: number;
  kooktijdMin: number;
  moment: Moment;
  stijl: StijlCode;
  soort: Soort;
  basis: Basis | null;
  titels: Vertalingen;
  ingredienten: DbIngredient[];
  /** Bereidingsstappen per taal (WEEK-121). Ontbreekt het veld, dan zijn er geen stappen. */
  bereidingen?: Partial<Record<Taal, string[]>>;
};

const TALEN: Taal[] = ['nl', 'fr', 'en'];
const ALLE_TALEN: readonly Taal[] = ['nl', 'fr', 'de', 'en', 'es', 'pt'];

/** Kiest de tekst in de gevraagde taal, met terugval op nl en daarna op de eerste beschikbare. */
export function kiesTekst(vertalingen: Vertalingen, taal: Taal): string | undefined {
  const gevonden = [taal, 'nl', ...TALEN].map((t) => vertalingen[t as Taal]?.trim()).find((v) => v);
  if (gevonden) return gevonden;
  return Object.values(vertalingen).map((v) => v?.trim()).find((v) => v);
}

/** Afdeling van de winkel voor een categorie uit de database. Onbekend = droge voeding. */
export function afdelingVoorCategorie(categorie: string): Afdeling {
  switch (categorie) {
    case 'groente':
      return 'groenten-fruit';
    case 'vlees':
    case 'vis':
      return 'vlees-vis';
    case 'zuivel':
    case 'ei':
    case 'eiwit':
      return 'zuivel-eieren';
    case 'condiment':
    case 'vet':
      return 'conserven-sauzen';
    default:
      return 'droge-voeding';
  }
}

/**
 * Zet een recept uit de database om naar een weekplan-recept voor het gezin.
 * Geeft undefined als het recept geen naam in een taal heeft (dan kan het niet getoond worden).
 */
export function naarPlanRecept(r: DbRecept, taal: Taal, gezin: Gezin): PlanRecept | undefined {
  const naam = kiesTekst(r.titels, taal);
  if (!naam) return undefined;
  const ingredienten: PlanIngredient[] = r.ingredienten.map((i) => ({
    naam: kiesTekst(i.namen, taal) ?? i.code,
    hoeveelheid: geschaaldeHoeveelheid(i.hoeveelheid, gezin, i.eenheid),
    eenheid: i.eenheid,
    afdeling: afdelingVoorCategorie(i.categorie),
  }));
  return {
    id: `db-${r.id}`,
    naam,
    soort: r.soort,
    minuten: r.kooktijdMin,
    stijlen: [r.stijl],
    basis: r.basis ?? undefined,
    ingredienten,
  };
}

/** Maakt van een ruwe rij uit Supabase een DbRecept. Onbruikbare rijen geven undefined. */
export function leesDbRecept(ruw: unknown): DbRecept | undefined {
  if (!ruw || typeof ruw !== 'object') return undefined;
  const r = ruw as Record<string, unknown>;
  if (typeof r.id !== 'number' || typeof r.kooktijd_min !== 'number') return undefined;
  const vertalingen = leesVertalingen(r.recept_vertalingen, 'titel');
  const ingredienten = (Array.isArray(r.recept_ingredienten) ? r.recept_ingredienten : [])
    .map(leesDbIngredient)
    .filter((i): i is DbIngredient => !!i);
  return {
    id: r.id,
    porties: typeof r.porties === 'number' ? r.porties : 1,
    kooktijdMin: r.kooktijd_min,
    moment: r.moment as Moment,
    stijl: r.stijl as StijlCode,
    soort: r.soort as Soort,
    basis: (r.basis as Basis | null) ?? null,
    titels: vertalingen,
    ingredienten,
    bereidingen: leesBereidingen(r.recept_bereidingen),
  };
}

/** De bereidingsstappen van een DB-recept in de gevraagde taal (WEEK-121). Terugval: nl, dan de eerste beschikbare taal. */
export function bereidingVoorDbRecept(r: DbRecept, taal: Taal): string[] | null {
  const bron = r.bereidingen ?? {};
  const stappen = bron[taal] ?? bron.nl ?? Object.values(bron).find((s) => !!s && s.length > 0);
  return stappen && stappen.length ? [...stappen] : null;
}

/** Leest [{taal, stappen}] naar een map per taal; onbekende talen en lege stappen vallen weg. */
export function leesBereidingen(ruw: unknown): Partial<Record<Taal, string[]>> {
  const uit: Partial<Record<Taal, string[]>> = {};
  if (!Array.isArray(ruw)) return uit;
  for (const rij of ruw) {
    if (!rij || typeof rij !== 'object') continue;
    const r = rij as Record<string, unknown>;
    const taal = r.taal;
    const stappen = Array.isArray(r.stappen)
      ? r.stappen.filter((s): s is string => typeof s === 'string' && s.trim() !== '').map((s) => s.trim())
      : [];
    if (typeof taal === 'string' && ALLE_TALEN.includes(taal as Taal) && stappen.length > 0) {
      uit[taal as Taal] = stappen;
    }
  }
  return uit;
}

function leesDbIngredient(ruw: unknown): DbIngredient | undefined {
  if (!ruw || typeof ruw !== 'object') return undefined;
  const r = ruw as Record<string, unknown>;
  const ing = r.ingredienten as Record<string, unknown> | undefined;
  if (!ing || typeof ing.code !== 'string' || typeof r.hoeveelheid !== 'number' || typeof r.eenheid !== 'string') return undefined;
  return {
    code: ing.code,
    categorie: typeof ing.categorie === 'string' ? ing.categorie : '',
    namen: leesVertalingen(ing.ingredient_vertalingen, 'naam'),
    hoeveelheid: r.hoeveelheid,
    eenheid: r.eenheid,
  };
}

/** Leest [{taal, <veld>}] naar een Vertalingen-map; onbekende talen en lege teksten vallen weg. */
function leesVertalingen(ruw: unknown, veld: string): Vertalingen {
  const uit: Vertalingen = {};
  if (!Array.isArray(ruw)) return uit;
  for (const rij of ruw) {
    if (!rij || typeof rij !== 'object') continue;
    const r = rij as Record<string, unknown>;
    const taal = r.taal;
    const tekst = r[veld];
    if (typeof taal === 'string' && TALEN.includes(taal as Taal) && typeof tekst === 'string' && tekst.trim()) {
      uit[taal as Taal] = tekst;
    }
  }
  return uit;
}
