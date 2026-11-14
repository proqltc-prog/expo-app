// WEEK-288: voorstellen bij het zoeken in "Andere producten", uit producten die het gezin eerder invulde.
// Zoals in gangbare boodschappen-apps: tijdens het typen verschijnen eerdere producten met hun hoeveelheid,
// eenheid en categorie; staat het er niet bij, dan voeg je het als nieuw product toe.
import type { Afdeling } from '@/data/ingredienten';
import { normaliseer } from '@/lib/frigoSheets';

export type LosVoorstel = {
  naam: string;
  hoeveelheid?: number;
  eenheid?: string;
  afdeling: Afdeling | 'overig';
  /** ISO-tijdstip waarop het product het laatst ingevuld werd; het recentste gaat voor. */
  laatst: string;
};

/** Zoveel eerdere producten onthoudt het toestel; het oudste valt weg. */
export const MAX_BEWAARD = 200;
/** Zoveel voorstellen staan er hoogstens onder het zoekveld, zodat de lijst kort blijft op een smartphone. */
export const MAX_GETOOND = 8;

/** Onthoudt een ingevuld product vooraan; dezelfde naam (zonder hoofdletters of accenten) vervangt de oude. */
export function onthoudLos(lijst: readonly LosVoorstel[], v: Omit<LosVoorstel, 'laatst'>, nu: Date): LosVoorstel[] {
  const naam = v.naam.trim();
  if (!naam) return [...lijst];
  const n = normaliseer(naam);
  const nieuw: LosVoorstel = { ...v, naam, laatst: nu.toISOString() };
  return [nieuw, ...lijst.filter((x) => normaliseer(x.naam) !== n)].slice(0, MAX_BEWAARD);
}

/** Voegt bronnen samen (bewaarde voorstellen, de lijst, In huis); per naam blijft het recentste. */
export function voegSamen(...bronnen: readonly (readonly LosVoorstel[])[]): LosVoorstel[] {
  const perNaam = new Map<string, LosVoorstel>();
  for (const v of bronnen.flat()) {
    const n = normaliseer(v.naam);
    if (!n) continue;
    const oud = perNaam.get(n);
    if (!oud || v.laatst > oud.laatst) perNaam.set(n, v);
  }
  return [...perNaam.values()].sort((a, b) => (a.laatst < b.laatst ? 1 : a.laatst > b.laatst ? -1 : 0));
}

/**
 * Voorstellen bij wat de gebruiker typt: eerst namen die ermee beginnen, dan een woord dat ermee begint,
 * dan de rest die het bevat; binnen elke groep het recentste eerst. Leeg zoekveld: geen voorstellen.
 */
export function zoekLos(lijst: readonly LosVoorstel[], zoek: string, max = MAX_GETOOND): LosVoorstel[] {
  const q = normaliseer(zoek);
  if (!q) return [];
  const rang = (naam: string): number => {
    const n = normaliseer(naam);
    if (n.startsWith(q)) return 0;
    if (n.split(/[\s-]+/).some((w) => w.startsWith(q))) return 1;
    return n.includes(q) ? 2 : -1;
  };
  return voegSamen(lijst)
    .map((v) => ({ v, r: rang(v.naam) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r)
    .slice(0, max)
    .map((x) => x.v);
}

/** Staat precies deze naam al bij de voorstellen? Zo niet, dan toont het zoekveld "toevoegen als nieuw product". */
export function heeftExact(voorstellen: readonly LosVoorstel[], zoek: string): boolean {
  const q = normaliseer(zoek);
  return !!q && voorstellen.some((v) => normaliseer(v.naam) === q);
}

/** Leest de bewaarde voorstellen; alles wat er niet op lijkt, valt weg. */
export function leesVoorstellen(ruw: unknown): LosVoorstel[] {
  if (!Array.isArray(ruw)) return [];
  const uit: LosVoorstel[] = [];
  for (const x of ruw) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    if (typeof o.naam !== 'string' || !o.naam.trim() || typeof o.laatst !== 'string') continue;
    uit.push({
      naam: o.naam,
      laatst: o.laatst,
      afdeling: (typeof o.afdeling === 'string' ? o.afdeling : 'overig') as LosVoorstel['afdeling'],
      ...(typeof o.hoeveelheid === 'number' && Number.isFinite(o.hoeveelheid) ? { hoeveelheid: o.hoeveelheid } : {}),
      ...(typeof o.eenheid === 'string' && o.eenheid ? { eenheid: o.eenheid } : {}),
    });
  }
  return uit.slice(0, MAX_BEWAARD);
}

/** Andere producten die nu op de lijst staan, als voorstel (zonder datum: na de bewaarde voorstellen). */
export function uitLijst(items: readonly { naam: string; hoeveelheid?: number; eenheid?: string; afdeling?: Afdeling; recept?: unknown; code?: string }[]): LosVoorstel[] {
  return items
    .filter((i) => !i.recept && !i.code)
    .map((i) => ({ naam: i.naam, afdeling: i.afdeling ?? 'overig', laatst: '', ...(i.hoeveelheid !== undefined ? { hoeveelheid: i.hoeveelheid } : {}), ...(i.eenheid ? { eenheid: i.eenheid } : {}) }));
}

/** Andere producten die nu in huis zijn, als voorstel. */
export function uitFrigo(items: readonly { naam: string; hoeveelheid?: number; eenheid?: string; afdeling: Afdeling | 'overig'; toegevoegdOp: string; bron?: string; lijstId?: string }[]): LosVoorstel[] {
  return items
    .filter((f) => (f.bron ?? (f.lijstId ? 'planner' : 'los')) === 'los')
    .map((f) => ({ naam: f.naam, afdeling: f.afdeling, laatst: f.toegevoegdOp, ...(f.hoeveelheid !== undefined ? { hoeveelheid: f.hoeveelheid } : {}), ...(f.eenheid ? { eenheid: f.eenheid } : {}) }));
}

/** Staat dit andere product er al (zelfde naam, zonder hoofdletters of accenten)? Dan krijgt het voorstel een vinkje. */
export function staatErAl(namen: readonly string[], naam: string): boolean {
  const n = normaliseer(naam);
  return namen.some((x) => normaliseer(x) === n);
}
