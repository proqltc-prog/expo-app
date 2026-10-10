// Virtuele frigo (WEEK-4): wat het gezin in huis heeft. Pure logica, zonder opslag.
// Opslag op het toestel staat in src/opslag/frigo.ts.
import { AFDELINGEN, Afdeling } from '@/data/ingredienten';
import { afdelingVan, LijstItem } from '@/lib/lijst';

export type FrigoItem = {
  id: string;
  naam: string;
  hoeveelheid?: number;
  eenheid?: string;
  /** Winkelafdeling, of "overig" voor alles zonder afdeling. */
  afdeling: Afdeling | 'overig';
  /** ISO-tijdstip waarop het product in de frigo kwam; de oudste producten gaan eerst op. */
  toegevoegdOp: string;
  /** Het lijstitem waaruit dit product kwam, zodat een vinkje ongedaan maken het weer weghaalt. */
  lijstId?: string;
};

/** Een regel op het frigo-scherm: hetzelfde product samengeteld. */
export type FrigoRegel = {
  sleutel: string;
  naam: string;
  hoeveelheid?: number;
  eenheid?: string;
  afdeling: Afdeling | 'overig';
  /** Tijdstip van het oudste exemplaar. */
  oudsteOp: string;
  ids: string[];
};

export type FrigoSectie = { afdeling: Afdeling | 'overig'; regels: FrigoRegel[] };

const klein = (t: string) => t.trim().toLocaleLowerCase();

/** Categorieën van de boodschappenlijst die niet in de frigo horen (geen voeding). */
const GEEN_VOEDING = new Set(['huishouden', 'Huishouden']);

/** Hoort een gekocht lijstitem in de frigo? Huishoudproducten (wc-papier, tandpasta…) niet. */
export function hoortInFrigo(item: LijstItem): boolean {
  return !GEEN_VOEDING.has(item.categorie);
}

function isAfdeling(a: string): a is Afdeling {
  return (AFDELINGEN as string[]).includes(a);
}

export function frigoItemUitLijst(item: LijstItem, nu: Date): FrigoItem {
  const afdeling = afdelingVan(item);
  return {
    id: `lijst:${item.id}`,
    naam: item.naam,
    ...(item.hoeveelheid !== undefined ? { hoeveelheid: item.hoeveelheid } : {}),
    ...(item.eenheid ? { eenheid: item.eenheid } : {}),
    afdeling: isAfdeling(afdeling) ? afdeling : 'overig',
    toegevoegdOp: nu.toISOString(),
    lijstId: item.id,
  };
}

/**
 * Past de frigo aan na het (af)vinken op de boodschappenlijst (WEEK-18).
 * - `items` zijn de lijstitems zoals ze vóór het vinken waren; `afgevinkt` is de nieuwe status.
 * - Afvinken (= gekocht) zet elk item dat echt van status verandert in de frigo, één keer.
 * - Een vinkje ongedaan maken haalt het product weer uit de frigo.
 */
export function pasFrigoAan(frigo: readonly FrigoItem[], items: readonly LijstItem[], afgevinkt: boolean, nu: Date): FrigoItem[] {
  const gewijzigd = items.filter((i) => i.afgevinkt !== afgevinkt);
  if (afgevinkt) {
    const alInFrigo = new Set(frigo.map((f) => f.lijstId).filter(Boolean));
    const nieuw = gewijzigd.filter((i) => hoortInFrigo(i) && !alInFrigo.has(i.id)).map((i) => frigoItemUitLijst(i, nu));
    return [...frigo, ...nieuw];
  }
  const terug = new Set(gewijzigd.map((i) => i.id));
  return frigo.filter((f) => !f.lijstId || !terug.has(f.lijstId));
}

/** Voegt een product toe dat de gebruiker zelf in de frigo zet (bv. wat al in huis was). */
export function voegZelfToe(frigo: readonly FrigoItem[], naam: string, nu: Date): FrigoItem[] {
  const n = naam.trim();
  if (!n) return [...frigo];
  return [...frigo, { id: `zelf:${nu.getTime()}:${frigo.length}`, naam: n, afdeling: 'overig', toegevoegdOp: nu.toISOString() }];
}

/**
 * Het frigo-scherm: per winkelafdeling (in winkelvolgorde, "overig" achteraan),
 * hetzelfde product (naam + eenheid) samengeteld, alfabetisch.
 */
export function frigoSecties(frigo: readonly FrigoItem[]): FrigoSectie[] {
  const regels = new Map<string, FrigoRegel>();
  for (const f of frigo) {
    const sleutel = `${f.afdeling}|${klein(f.naam)}|${f.eenheid ?? ''}`;
    const regel = regels.get(sleutel);
    if (!regel) {
      regels.set(sleutel, {
        sleutel,
        naam: f.naam,
        hoeveelheid: f.hoeveelheid,
        eenheid: f.eenheid,
        afdeling: f.afdeling,
        oudsteOp: f.toegevoegdOp,
        ids: [f.id],
      });
      continue;
    }
    if (f.hoeveelheid !== undefined) regel.hoeveelheid = Math.round(((regel.hoeveelheid ?? 0) + f.hoeveelheid) * 100) / 100;
    if (f.toegevoegdOp < regel.oudsteOp) regel.oudsteOp = f.toegevoegdOp;
    regel.ids.push(f.id);
  }
  const volgorde: string[] = [...AFDELINGEN, 'overig'];
  const perAfdeling = new Map<Afdeling | 'overig', FrigoRegel[]>();
  for (const r of regels.values()) perAfdeling.set(r.afdeling, [...(perAfdeling.get(r.afdeling) ?? []), r]);
  return [...perAfdeling.entries()]
    .sort(([a], [b]) => volgorde.indexOf(a) - volgorde.indexOf(b))
    .map(([afdeling, rs]) => ({ afdeling, regels: rs.sort((a, b) => a.naam.localeCompare(b.naam)) }));
}

/** Aantal verschillende producten in de frigo (zoals op het scherm). */
export function aantalProducten(frigo: readonly FrigoItem[]): number {
  return frigoSecties(frigo).reduce((som, s) => som + s.regels.length, 0);
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Leest een bewaarde frigo veilig in; onbruikbare items worden overgeslagen. */
export function normaliseerFrigo(ruw: unknown): FrigoItem[] {
  if (!Array.isArray(ruw)) return [];
  return ruw.flatMap((r): FrigoItem[] => {
    if (!isObject(r) || typeof r.id !== 'string' || typeof r.naam !== 'string' || !r.naam.trim()) return [];
    const toegevoegdOp = typeof r.toegevoegdOp === 'string' && !Number.isNaN(Date.parse(r.toegevoegdOp)) ? r.toegevoegdOp : new Date(0).toISOString();
    const hoeveelheid = typeof r.hoeveelheid === 'number' && Number.isFinite(r.hoeveelheid) && r.hoeveelheid > 0 ? r.hoeveelheid : undefined;
    return [{
      id: r.id,
      naam: r.naam.trim(),
      ...(hoeveelheid !== undefined ? { hoeveelheid } : {}),
      ...(typeof r.eenheid === 'string' && r.eenheid ? { eenheid: r.eenheid } : {}),
      afdeling: typeof r.afdeling === 'string' && isAfdeling(r.afdeling) ? r.afdeling : 'overig',
      toegevoegdOp,
      ...(typeof r.lijstId === 'string' ? { lijstId: r.lijstId } : {}),
    }];
  });
}
