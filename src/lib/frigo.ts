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

/** Extra gegevens bij zelf toevoegen (betalende versie, WEEK-35). */
export type ZelfExtra = { hoeveelheid?: number; eenheid?: string; afdeling?: Afdeling | 'overig' };

/** Eenheden die je kan kiezen bij zelf toevoegen. */
export const ZELF_EENHEDEN = ['g', 'ml', 'stuk'] as const;

/**
 * Voegt een product toe dat de gebruiker zelf in de frigo zet (bv. wat al in huis was).
 * Gratis: enkel een naam. Betalend (WEEK-35): ook hoeveelheid, eenheid en afdeling (manueel of via de scanner).
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

// ── Verbruiken (WEEK-19) ──

const rond = (n: number) => Math.round(n * 100) / 100;

/** Wat een recept nodig heeft; dezelfde vorm als een ingrediënt in het weekplan. */
export type Benodigd = { naam: string; hoeveelheid?: number; eenheid?: string };

/** Hoort dit product bij dit ingrediënt? Zelfde naam (hoofdletters maken niet uit) en, als beide een eenheid hebben, dezelfde eenheid. */
export function pastBij(f: FrigoItem, ing: Benodigd): boolean {
  return klein(f.naam) === klein(ing.naam) && (!f.eenheid || !ing.eenheid || f.eenheid === ing.eenheid);
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
    const kandidaten = rest.filter((f) => pastBij(f, ing)).sort((a, b) => a.toegevoegdOp.localeCompare(b.toegevoegdOp));
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
  const voorraad = frigo.map((f) => ({ ...f }));
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
