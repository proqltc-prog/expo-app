// Virtuele frigo (WEEK-4): wat het gezin in huis heeft. Pure logica, zonder opslag.
// Opslag op het toestel staat in src/opslag/frigo.ts.
import { AFDELINGEN, Afdeling } from '@/data/ingredienten';
import { afdelingVan, LijstItem } from '@/lib/lijst';
import type { Product } from '@/lib/openfoodfacts';
import { isoDatum } from '@/lib/houdbaarheid';

/**
 * Soort frigo-item (WEEK-71).
 * - planner: uit de catalogus van de database of uit de boodschappenlijst; telt mee bij het koken.
 * - los: vrij ingegeven of gescand; telt niet mee, de gebruiker beheert en verwijdert deze zelf.
 */
export type FrigoBron = 'planner' | 'los';

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
  /** Productdetails uit de scanner (WEEK-49); ontbreekt als het product niet gescand is. */
  product?: Product;
  /** Houdbaar tot, yyyy-mm-dd, zoals ingevuld of van de verpakking; ontbreekt = niet gekend (WEEK-20). */
  houdbaarTot?: string;
  /** Soort item (WEEK-71). Ontbreekt in oude data: afgeleid via frigoBron(). */
  bron?: FrigoBron;
  /** Vaste ingrediëntcode van een product uit de weekplanning (WEEK-159); taalonafhankelijk. */
  code?: string;
};

/** Het soort van een item. Oude items zonder soort: uit de boodschappenlijst = planner, de rest = los. */
export function frigoBron(f: FrigoItem): FrigoBron {
  return f.bron ?? (f.lijstId ? 'planner' : 'los');
}

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
  /** De details van het eerste exemplaar dat gescand is. */
  product?: Product;
  /** De vroegste houdbaarheidsdatum in deze groep (het product dat het eerst vervalt). */
  houdbaarTot?: string;
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
    bron: 'planner',
    ...(item.code ? { code: item.code } : {}),
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

/** Extra gegevens bij zelf toevoegen (WEEK-35). */
export type ZelfExtra = { hoeveelheid?: number; eenheid?: string; afdeling?: Afdeling | 'overig'; product?: Product; houdbaarTot?: string; bron?: FrigoBron };

/** Eenheden die je kan kiezen bij zelf toevoegen. */
export const ZELF_EENHEDEN = ['g', 'ml', 'stuk'] as const;

/**
 * Voegt een product toe dat de gebruiker zelf in de frigo zet (bv. wat al in huis was).
 * Een naam is genoeg. Daarnaast kan je hoeveelheid, eenheid en afdeling meegeven (manueel of via de scanner).
 */
export function voegZelfToe(frigo: readonly FrigoItem[], naam: string, nu: Date, extra: ZelfExtra = {}): FrigoItem[] {
  const n = naam.trim().slice(0, 100);
  if (!n) return [...frigo];
  const h = extra.hoeveelheid;
  const hoeveelheid = typeof h === 'number' && Number.isFinite(h) && h > 0 ? Math.round(h * 100) / 100 : undefined;
  const eenheid = hoeveelheid !== undefined && extra.eenheid?.trim() ? extra.eenheid.trim() : undefined;
  const afdeling = extra.afdeling && (extra.afdeling === 'overig' || isAfdeling(extra.afdeling)) ? extra.afdeling : 'overig';
  return [
    ...frigo,
    {
      id: `zelf:${nu.getTime()}:${frigo.length}`,
      naam: n,
      ...(hoeveelheid !== undefined ? { hoeveelheid } : {}),
      ...(eenheid ? { eenheid } : {}),
      afdeling,
      toegevoegdOp: nu.toISOString(),
      bron: extra.bron ?? 'los',
      ...(extra.product ? { product: extra.product } : {}),
      ...(isoDatum(extra.houdbaarTot) ? { houdbaarTot: extra.houdbaarTot } : {}),
    },
  ];
}

/** Leest een hoeveelheid zoals de gebruiker ze typt ("1,5" of "250"); undefined als het geen positief getal is. */
export function leesHoeveelheid(tekst: string): number | undefined {
  const n = Number(tekst.trim().replace(',', '.'));
  return tekst.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
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
        ...(f.product ? { product: f.product } : {}),
        ...(f.houdbaarTot ? { houdbaarTot: f.houdbaarTot } : {}),
      });
      continue;
    }
    if (!regel.product && f.product) regel.product = f.product;
    if (f.houdbaarTot && (!regel.houdbaarTot || f.houdbaarTot < regel.houdbaarTot)) regel.houdbaarTot = f.houdbaarTot;
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

/** Leest bewaarde productdetails veilig in (WEEK-49); ongeldige velden worden weggelaten, een product zonder barcode of naam niet. */
export function leesProduct(ruw: unknown): Product | undefined {
  if (!isObject(ruw) || typeof ruw.barcode !== 'string' || !ruw.barcode || typeof ruw.naam !== 'string') return undefined;
  const p: Product = {
    barcode: ruw.barcode,
    naam: ruw.naam,
    additieven: Array.isArray(ruw.additieven) ? ruw.additieven.filter((a): a is string => typeof a === 'string') : [],
  };
  if (typeof ruw.merk === 'string' && ruw.merk) p.merk = ruw.merk;
  if (typeof ruw.nutriscore === 'string' && ruw.nutriscore) p.nutriscore = ruw.nutriscore;
  for (const k of ['nova', 'kcal', 'suikers', 'eiwitten', 'vet', 'zout'] as const) {
    const v = ruw[k];
    if (typeof v === 'number' && Number.isFinite(v)) p[k] = v;
  }
  if (Array.isArray(ruw.categorieen)) p.categorieen = ruw.categorieen.filter((c): c is string => typeof c === 'string');
  return p;
}

/** Koppelt gescande productdetails aan een bestaand frigo-item (WEEK-49). Onbekend id: ongewijzigd. */
export function voegProductToe(frigo: readonly FrigoItem[], id: string, product: Product): FrigoItem[] {
  return frigo.map((f) => (f.id === id ? { ...f, product } : { ...f }));
}
/** Leest een bewaarde frigo veilig in; onbruikbare items worden overgeslagen. */
export function normaliseerFrigo(ruw: unknown): FrigoItem[] {
  if (!Array.isArray(ruw)) return [];
  return ruw.flatMap((r): FrigoItem[] => {
    if (!isObject(r) || typeof r.id !== 'string' || typeof r.naam !== 'string' || !r.naam.trim()) return [];
    const toegevoegdOp = typeof r.toegevoegdOp === 'string' && !Number.isNaN(Date.parse(r.toegevoegdOp)) ? r.toegevoegdOp : new Date(0).toISOString();
    const hoeveelheid = typeof r.hoeveelheid === 'number' && Number.isFinite(r.hoeveelheid) && r.hoeveelheid > 0 ? r.hoeveelheid : undefined;
    const product = leesProduct(r.product);
    const houdbaarTot = isoDatum(r.houdbaarTot);
    return [{
      id: r.id,
      naam: r.naam.trim(),
      ...(hoeveelheid !== undefined ? { hoeveelheid } : {}),
      ...(typeof r.eenheid === 'string' && r.eenheid ? { eenheid: r.eenheid } : {}),
      afdeling: typeof r.afdeling === 'string' && isAfdeling(r.afdeling) ? r.afdeling : 'overig',
      toegevoegdOp,
      ...(typeof r.lijstId === 'string' ? { lijstId: r.lijstId } : {}),
      ...(r.bron === 'planner' || r.bron === 'los' ? { bron: r.bron } : {}),
      ...(typeof r.code === 'string' && r.code ? { code: r.code } : {}),
      ...(product ? { product } : {}),
      ...(houdbaarTot ? { houdbaarTot } : {}),
    }];
  });
}

// ── Verbruiken (WEEK-19) ──

const rond = (n: number) => Math.round(n * 100) / 100;

/** Wat een recept nodig heeft; dezelfde vorm als een ingrediënt in het weekplan. */
export type Benodigd = { naam: string; hoeveelheid?: number; eenheid?: string; code?: string };

/**
 * Hoort dit product bij dit ingrediënt? Heeft beide een vaste code, dan telt die (taalonafhankelijk, WEEK-159).
 * Anders dezelfde naam (hoofdletters maken niet uit). Als beide een eenheid hebben, moet die ook gelijk zijn.
 */
export function pastBij(f: FrigoItem, ing: Benodigd): boolean {
  const zelfde = f.code && ing.code ? f.code === ing.code : klein(f.naam) === klein(ing.naam);
  return zelfde && (!f.eenheid || !ing.eenheid || f.eenheid === ing.eenheid);
}

/**
 * Enkel de producten van de planner (van de lijst of uit de catalogus) tellen mee voor recepten van de weekplanner.
 * Losse producten worden nooit voor een recept gebruikt: die beheert de gebruiker zelf (WEEK-158).
 */
export function receptFrigo(frigo: readonly FrigoItem[]): FrigoItem[] {
  return frigo.filter((f) => frigoBron(f) === 'planner');
}

/**
 * Haalt de ingrediënten van een gekookt recept uit de frigo, de oudste producten eerst.
 * - Met gekende hoeveelheden wordt enkel afgetrokken wat het recept nodig heeft.
 * - Is de hoeveelheid van het product of van het recept niet gekend, dan gaat het hele (oudste) product eruit.
 * Geeft de nieuwe frigo terug en wat er verbruikt werd (om het ongedaan te kunnen maken).
 */
export function verbruik(frigo: readonly FrigoItem[], ingredienten: readonly Benodigd[]): { frigo: FrigoItem[]; verbruikt: FrigoItem[] } {
  let rest = frigo.map((f) => ({ ...f }));
  const verbruikt: FrigoItem[] = [];
  for (const ing of ingredienten) {
    let nodig = ing.hoeveelheid !== undefined && ing.hoeveelheid > 0 ? ing.hoeveelheid : undefined;
    // Losse producten (WEEK-71) tellen niet mee: die beheert de gebruiker zelf.
    const kandidaten = rest.filter((f) => frigoBron(f) === 'planner' && pastBij(f, ing)).sort((a, b) => a.toegevoegdOp.localeCompare(b.toegevoegdOp));
    for (const f of kandidaten) {
      if (nodig === undefined || f.hoeveelheid === undefined) {
        rest = rest.filter((r) => r !== f);
        verbruikt.push({ ...f });
        break;
      }
      const neem = rond(Math.min(nodig, f.hoeveelheid));
      verbruikt.push({ ...f, hoeveelheid: neem });
      f.hoeveelheid = rond(f.hoeveelheid - neem);
      if (f.hoeveelheid <= 0) rest = rest.filter((r) => r !== f);
      nodig = rond(nodig - neem);
      if (nodig <= 0) break;
    }
  }
  return { frigo: rest, verbruikt };
}

/** Zet verbruikte producten terug (een recept terug op "niet gedaan"). */
export function herstel(frigo: readonly FrigoItem[], verbruikt: readonly FrigoItem[]): FrigoItem[] {
  const resultaat = frigo.map((f) => ({ ...f }));
  for (const v of verbruikt) {
    const bestaand = resultaat.find((f) => f.id === v.id);
    if (!bestaand) {
      resultaat.push({ ...v });
    } else if (bestaand.hoeveelheid !== undefined && v.hoeveelheid !== undefined) {
      bestaand.hoeveelheid = rond(bestaand.hoeveelheid + v.hoeveelheid);
    }
  }
  return resultaat;
}

/** Zet of wist de houdbaarheidsdatum van één frigo-item (WEEK-20). `undefined` wist de datum. Onbekend id: ongewijzigd. */
export function zetHoudbaarheid(frigo: readonly FrigoItem[], id: string, houdbaarTot: string | undefined): FrigoItem[] {
  return frigo.map((f) => {
    const kopie: FrigoItem = { ...f };
    delete kopie.houdbaarTot;
    if (f.id === id && houdbaarTot) kopie.houdbaarTot = houdbaarTot;
    return kopie;
  });
}

/** Haalt producten handmatig uit de frigo (op, weggegooid…). */
export function verwijderUitFrigo(frigo: readonly FrigoItem[], ids: readonly string[]): FrigoItem[] {
  const weg = new Set(ids);
  return frigo.filter((f) => !weg.has(f.id));
}

// ── Wat al in huis is (WEEK-12) ──

export type Dekking = { gedekt: 'geheel' | 'deels' | 'niet'; rest?: number };

/**
 * Hoeveel van wat nodig is, ligt al in de frigo? Loopt de behoeften in volgorde af en verdeelt
 * de voorraad (zonder ze aan te passen). Een product zonder gekende hoeveelheid dekt alles met die naam.
 * Geeft per behoefte terug of ze geheel, deels of niet gedekt is, en wat er nog gekocht moet worden.
 */
export function verdeelFrigo(behoeften: readonly Benodigd[], frigo: readonly FrigoItem[]): Dekking[] {
  const voorraad = receptFrigo(frigo).map((f) => ({ ...f }));
  return behoeften.map((b): Dekking => {
    const passend = voorraad.filter((f) => pastBij(f, b));
    if (!passend.length) return { gedekt: 'niet', ...(b.hoeveelheid !== undefined ? { rest: b.hoeveelheid } : {}) };
    if (b.hoeveelheid === undefined || passend.some((f) => f.hoeveelheid === undefined)) return { gedekt: 'geheel' };
    let nodig = b.hoeveelheid;
    for (const f of passend) {
      const neem = Math.min(nodig, f.hoeveelheid ?? 0);
      f.hoeveelheid = rond((f.hoeveelheid ?? 0) - neem);
      nodig = rond(nodig - neem);
      if (nodig <= 0) break;
    }
    if (nodig <= 0) return { gedekt: 'geheel' };
    return nodig < b.hoeveelheid ? { gedekt: 'deels', rest: nodig } : { gedekt: 'niet', rest: nodig };
  });
}

/**
 * Trekt wat al in huis is af van de items die op de boodschappenlijst komen.
 * Geheel gedekt = niet op de lijst; deels gedekt = enkel het verschil.
 * Producten die uit precies deze lijstitems gekocht werden, tellen niet mee
 * (anders zou opnieuw overzetten wat je net kocht van de lijst halen).
 */
export function trekFrigoAf(items: readonly LijstItem[], frigo: readonly FrigoItem[]): LijstItem[] {
  const eigen = new Set(items.map((i) => i.id));
  const dekking = verdeelFrigo(items, frigo.filter((f) => !f.lijstId || !eigen.has(f.lijstId)));
  return items.flatMap((i, n) => {
    const d = dekking[n];
    if (d.gedekt === 'geheel') return [];
    if (d.gedekt === 'deels' && d.rest !== undefined) return [{ ...i, hoeveelheid: d.rest }];
    return [i];
  });
}
