// Virtuele frigo (WEEK-4): wat het gezin in huis heeft. Pure logica, zonder opslag.
// Opslag op het toestel staat in src/opslag/frigo.ts.
import { AFDELINGEN, Afdeling, dbCodeVan, dbCodeVanNaam, gewichtPerStuk, naarDbCode } from '@/data/ingredienten';
import { afdelingVan, LijstItem } from '@/lib/lijst';
import type { Product } from '@/lib/openfoodfacts';
import { isoDatum, leesDatum } from '@/lib/houdbaarheid';

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
    // Recepten van de lijst horen bij de planner-frigo; losse producten bij de losse producten (WEEK-182).
    bron: item.recept || item.code ? 'planner' : 'los',
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
export type ZelfExtra = { hoeveelheid?: number; eenheid?: string; afdeling?: Afdeling | 'overig'; product?: Product; houdbaarTot?: string; bron?: FrigoBron; code?: string };

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
  // Een eenheid hoort bij een hoeveelheid, of bij een planner-product met vaste code (WEEK-160: ook zonder hoeveelheid).
  const eenheid = (hoeveelheid !== undefined || extra.code) && extra.eenheid?.trim() ? extra.eenheid.trim() : undefined;
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
      ...(extra.code ? { code: extra.code } : {}),
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
  // WEEK-181: "overig" (nog niet ingedeeld) staat bovenaan, daarna de winkelafdelingen.
  const volgorde: string[] = ['overig', ...AFDELINGEN];
  const perAfdeling = new Map<Afdeling | 'overig', FrigoRegel[]>();
  for (const r of regels.values()) perAfdeling.set(r.afdeling, [...(perAfdeling.get(r.afdeling) ?? []), r]);
  return [...perAfdeling.entries()]
    .sort(([a], [b]) => volgorde.indexOf(a) - volgorde.indexOf(b))
    .map(([afdeling, rs]) => ({ afdeling, regels: [...rs].sort(vergelijkRegels) }));
}

/** WEEK-181: alfabetisch op naam; bij gelijke naam eerst de oudste houdbaarheid (zonder datum achteraan), dan de eenheid. */
export function vergelijkRegels(a: FrigoRegel, b: FrigoRegel): number {
  const naam = a.naam.localeCompare(b.naam, 'nl', { sensitivity: 'base' });
  if (naam) return naam;
  if (a.houdbaarTot && b.houdbaarTot && a.houdbaarTot !== b.houdbaarTot) return a.houdbaarTot < b.houdbaarTot ? -1 : 1;
  if (a.houdbaarTot && !b.houdbaarTot) return -1;
  if (!a.houdbaarTot && b.houdbaarTot) return 1;
  return (a.eenheid ?? '').localeCompare(b.eenheid ?? '');
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
  // Ook verzadigd vet, koolhydraten en vezels (WEEK-220), anders toont de frigo ze als onbekend en klopt de score niet.
  for (const k of ['nova', 'kcal', 'suikers', 'eiwitten', 'vet', 'zout', 'verzadigd', 'koolhydraten', 'vezels'] as const) {
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
      ...(typeof r.code === 'string' && r.code ? { code: naarDbCode(r.code) } : {}), // WEEK-205: oude catalogus-codes worden databankcodes
      ...(product ? { product } : {}),
      ...(houdbaarTot ? { houdbaarTot } : {}),
    }];
  });
}

// ── Verbruiken (WEEK-19) ──

const rond = (n: number) => Math.round(n * 100) / 100;

/** Wat een recept nodig heeft; dezelfde vorm als een ingrediënt in het weekplan. */
export type Benodigd = { naam: string; hoeveelheid?: number; eenheid?: string; code?: string };

/** Massa- en volume-eenheden die onderling om te rekenen zijn (WEEK-160). Stuk of teentje kan niet zonder gewicht. */
const OMREKENING: Readonly<Record<string, { familie: 'gewicht' | 'volume'; basis: number }>> = {
  g: { familie: 'gewicht', basis: 1 },
  kg: { familie: 'gewicht', basis: 1000 },
  ml: { familie: 'volume', basis: 1 },
  l: { familie: 'volume', basis: 1000 },
};

/**
 * Hoeveel keer een hoeveelheid in `van` moet vermenigvuldigd om in `naar` te komen (WEEK-160).
 * Zonder eenheid aan één kant, of gelijke eenheden: 1. Binnen dezelfde familie (g/kg, ml/l): de omrekening.
 * Anders undefined: zo'n product telt niet mee (bv. stuk tegen gram, we kennen het gewicht per stuk niet).
 */
export function omrekenFactor(van: string | undefined, naar: string | undefined): number | undefined {
  if (!van || !naar || van === naar) return 1;
  const a = OMREKENING[van];
  const b = OMREKENING[naar];
  if (!a || !b || a.familie !== b.familie) return undefined;
  return a.basis / b.basis;
}

/** De databankcode van een frigo-item of ingrediënt: de eigen code, anders afgeleid van de naam in een taal (WEEK-160). */
export function codeVan(x: { naam: string; code?: string }): string | undefined {
  return x.code ? dbCodeVan(x.code) : dbCodeVanNaam(x.naam);
}

/**
 * Factor om de hoeveelheid van het ingrediënt naar de eenheid van het product om te rekenen (WEEK-161).
 * Zoals omrekenFactor, maar ook stuk ↔ gram/kg via het gemiddelde stukgewicht. Zo koppelt een product in gram
 * (bv. van vóór de omschakeling naar stuk) toch aan een recept op stuk. Undefined als het niet te herleiden is.
 */
export function omrekenVoor(ing: Benodigd, f: FrigoItem): number | undefined {
  const direct = omrekenFactor(ing.eenheid, f.eenheid);
  if (direct !== undefined) return direct;
  const gewicht = gewichtPerStuk(codeVan(ing) ?? codeVan(f) ?? '');
  const basisVan = (eenheid: string | undefined): { familie: string; basis: number } | undefined => {
    if (eenheid === 'stuk') return gewicht !== undefined ? { familie: 'gewicht', basis: gewicht } : undefined;
    const o = eenheid ? OMREKENING[eenheid] : undefined;
    return o ? { familie: o.familie, basis: o.basis } : undefined;
  };
  const van = basisVan(ing.eenheid);
  const naar = basisVan(f.eenheid);
  if (!van || !naar || van.familie !== naar.familie) return undefined;
  return van.basis / naar.basis;
}

/**
 * Hoort dit product bij dit ingrediënt? Heeft beide een code, dan telt die (taalonafhankelijk, WEEK-159/160).
 * Zonder code: dezelfde naam (hoofdletters maken niet uit). Eenheden moeten te herleiden zijn (zie omrekenFactor).
 */
export function pastBij(f: FrigoItem, ing: Benodigd): boolean {
  const cf = codeVan(f);
  const ci = codeVan(ing);
  const zelfde = cf && ci ? cf === ci : klein(f.naam) === klein(ing.naam);
  return zelfde && omrekenVoor(ing, f) !== undefined;
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
 * - Met gekende hoeveelheden wordt enkel afgetrokken wat het recept nodig heeft, omgerekend naar de eenheid van het product (WEEK-160).
 * - Heeft het product een hoeveelheid maar het recept niet, dan blijft dat product staan (we weten niet hoeveel het nodig heeft).
 * - Heeft het product geen hoeveelheid, dan gaat het hele (oudste) product eruit.
 * Geeft de nieuwe frigo terug en wat er verbruikt werd (om het ongedaan te kunnen maken).
 */
export function verbruik(frigo: readonly FrigoItem[], ingredienten: readonly Benodigd[]): { frigo: FrigoItem[]; verbruikt: FrigoItem[] } {
  let rest = frigo.map((f) => ({ ...f }));
  const verbruikt: FrigoItem[] = [];
  for (const ing of ingredienten) {
    // Hoeveelheid van het recept, in de eenheid van het ingrediënt.
    let nodig = ing.hoeveelheid !== undefined && ing.hoeveelheid > 0 ? ing.hoeveelheid : undefined;
    // Losse producten (WEEK-71) tellen niet mee: die beheert de gebruiker zelf.
    const kandidaten = rest.filter((f) => frigoBron(f) === 'planner' && pastBij(f, ing)).sort((a, b) => a.toegevoegdOp.localeCompare(b.toegevoegdOp));
    for (const f of kandidaten) {
      if (nodig === undefined) {
        if (f.hoeveelheid !== undefined) continue;
        rest = rest.filter((r) => r !== f);
        verbruikt.push({ ...f });
        break;
      }
      if (f.hoeveelheid === undefined) {
        rest = rest.filter((r) => r !== f);
        verbruikt.push({ ...f });
        break;
      }
      const factor = omrekenVoor(ing, f) ?? 1;
      const neem = rond(Math.min(nodig * factor, f.hoeveelheid));
      verbruikt.push({ ...f, hoeveelheid: neem });
      f.hoeveelheid = rond(f.hoeveelheid - neem);
      if (f.hoeveelheid <= 0) rest = rest.filter((r) => r !== f);
      nodig = rond(nodig - neem / factor);
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

/** Grootste hoeveelheid die je voor een los product invult (WEEK-181): een getal boven dit is een invoerfout. */
export const MAX_LOS_HOEVEELHEID = 9999;

/** Wijziging van een los product in de popup (WEEK-181). Undefined betekent: leeg maken. */
export type LosWijziging = {
  hoeveelheid: number | undefined;
  eenheid: string | undefined;
  afdeling: Afdeling | 'overig';
  houdbaarTot: string | undefined;
};

/**
 * Past de wijziging toe op alle exemplaren van een regel (zelfde naam en eenheid).
 * De hoeveelheid is het totaal van de regel en staat op het eerste exemplaar; de rest krijgt geen hoeveelheid.
 */
export function wijzigLos(frigo: readonly FrigoItem[], ids: readonly string[], w: LosWijziging): FrigoItem[] {
  return frigo.map((f) => {
    if (!ids.includes(f.id)) return f;
    const kopie: FrigoItem = { ...f, afdeling: w.afdeling };
    delete kopie.hoeveelheid;
    delete kopie.eenheid;
    delete kopie.houdbaarTot;
    if (w.eenheid) kopie.eenheid = w.eenheid;
    if (w.houdbaarTot) kopie.houdbaarTot = w.houdbaarTot;
    if (f.id === ids[0] && w.hoeveelheid !== undefined) kopie.hoeveelheid = w.hoeveelheid;
    return kopie;
  });
}

export type LosInvoer = { hoeveelheid: number | undefined; houdbaarTot: string | undefined; fout?: 'hoeveelheid' | 'houdbaar' };

/** Leest de velden van de popup (WEEK-181). Leeg is geldig en betekent "niet ingevuld". */
export function leesLosInvoer(hoeveelheidTekst: string, houdbaarTekst: string): LosInvoer {
  const h = leesHoeveelheid(hoeveelheidTekst);
  if (hoeveelheidTekst.trim() && (h === undefined || h > MAX_LOS_HOEVEELHEID)) return { hoeveelheid: undefined, houdbaarTot: undefined, fout: 'hoeveelheid' };
  if (!houdbaarTekst.trim()) return { hoeveelheid: h, houdbaarTot: undefined };
  const iso = leesDatum(houdbaarTekst);
  if (!iso) return { hoeveelheid: h, houdbaarTot: undefined, fout: 'houdbaar' };
  return { hoeveelheid: h, houdbaarTot: iso };
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
    // `nodig` in de eenheid van het ingrediënt; per product omgerekend naar de eenheid van het product (WEEK-160).
    let nodig = b.hoeveelheid;
    for (const f of passend) {
      const factor = omrekenVoor(b, f) ?? 1;
      const neem = Math.min(nodig * factor, f.hoeveelheid ?? 0);
      f.hoeveelheid = rond((f.hoeveelheid ?? 0) - neem);
      nodig = rond(nodig - neem / factor);
      if (nodig <= 0) break;
    }
    if (nodig <= 0) return { gedekt: 'geheel' };
    return nodig < b.hoeveelheid ? { gedekt: 'deels', rest: nodig } : { gedekt: 'niet', rest: nodig };
  });
}

/**
 * Trekt wat al in huis is af van de items die op de boodschappenlijst komen.
 * Geheel gedekt = niet op de lijst; deels gedekt = enkel het verschil.
 * Producten die uit precies deze lijstitems gekocht werden, tellen niet mee in de dekking
 * (anders zou opnieuw overzetten wat je net kocht van de lijst halen); dat item komt als gekocht (afgevinkt) terug (WEEK-204),
 * zodat het na "Wissen" niet opnieuw als open boodschap verschijnt.
 */
export function trekFrigoAf(items: readonly LijstItem[], frigo: readonly FrigoItem[]): LijstItem[] {
  const eigen = new Set(items.map((i) => i.id));
  const gekocht = new Set(frigo.map((f) => f.lijstId).filter((id): id is string => !!id && eigen.has(id)));
  const dekking = verdeelFrigo(items, frigo.filter((f) => !f.lijstId || !eigen.has(f.lijstId)));
  return items.flatMap((i, n) => {
    if (gekocht.has(i.id)) return [{ ...i, afgevinkt: true }];
    const d = dekking[n];
    if (d.gedekt === 'geheel') return [];
    if (d.gedekt === 'deels' && d.rest !== undefined) return [{ ...i, hoeveelheid: d.rest }];
    return [i];
  });
}
