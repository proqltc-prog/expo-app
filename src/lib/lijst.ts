import type { Afdeling } from '@/data/ingredienten';
import { AFDELINGEN } from '@/data/ingredienten';
import { VAST_AFDELING, VASTE_ITEMS } from '@/data/vasteItems';
import { Sleutel, Taal, vertaal } from '@/i18n';
import { DagCode, PlanDag, WEEKDAGEN } from '@/lib/planner/types';

// Pure logica voor de boodschappenlijst (zonder opslag), zodat ze los testbaar is.
// Opslag op het toestel staat in src/opslag/lijst.ts.

export type LijstItem = {
  id: string;
  naam: string;
  /** Categoriecode (bv. "avondeten", "fruit", "extra"); het scherm toont de vertaalde naam via categorieNaam(). */
  categorie: string;
  afgevinkt: boolean;
  hoeveelheid?: number;
  eenheid?: string;
  /** Winkelafdeling, voor de weergave per categorie in de winkel. */
  afdeling?: Afdeling;
  /** Het recept waar dit ingrediënt bij hoort (enkel voor items uit de weekplanning). */
  recept?: { dag: DagCode; naam: string };
  /** Naam van het gezinslid dat het item zelf toevoegde (gedeelde lijst, WEEK-17). */
  door?: string;
  /** Naam van het gezinslid dat het item afvinkte (gedeelde lijst, WEEK-17). */
  afgevinktDoor?: string;
};

/** Een regel zoals hij op het scherm staat: hetzelfde ingrediënt uit verschillende recepten samengeteld. */
export type LijstRegel = {
  sleutel: string;
  naam: string;
  categorie: string;
  hoeveelheid?: number;
  eenheid?: string;
  afdeling?: Afdeling;
  /** Afgevinkt als alle onderliggende items afgevinkt zijn. */
  afgevinkt: boolean;
  /** Ids van de onderliggende items (om samen af te vinken). */
  ids: string[];
  /** Namen van de recepten waar het ingrediënt in zit. */
  recepten: string[];
  /** Wie het item zelf toevoegde (gedeelde lijst). */
  door?: string;
  /** Wie de onderliggende items afvinkte (gedeelde lijst), zonder dubbels. */
  afgevinktDoor: string[];
};

const klein = (t: string) => t.trim().toLocaleLowerCase();

/**
 * Sleutel van een weekplan (uit het tijdstip waarop het gemaakt werd), zodat lijstitems van verschillende
 * weken nooit dezelfde id krijgen (WEEK-29). Hetzelfde plan geeft altijd dezelfde sleutel.
 */
export function planSleutel(plan: { gemaaktOp: string }): string {
  const t = Date.parse(plan.gemaaktOp);
  return Number.isNaN(t) ? klein(plan.gemaaktOp).replace(/[^a-z0-9]+/g, '') || 'plan' : t.toString(36);
}

/**
 * Eén item per ingrediënt per recept, zodat de lijst later ook per recept getoond kan worden.
 * Staat hetzelfde ingrediënt (naam + eenheid) twee keer in één recept, dan wordt het samengeteld (WEEK-29).
 * `sleutel`: zie planSleutel(); zonder sleutel het oude id-formaat.
 */
export function itemsUitPlan(dagen: readonly PlanDag[], sleutel?: string): LijstItem[] {
  const items: LijstItem[] = [];
  for (const { dag, recept } of dagen) {
    for (const ing of recept.ingredienten) {
      const id = `recept-${sleutel ? `${sleutel}-` : ''}${dag}-${klein(ing.naam)}-${ing.eenheid}`;
      const bestaand = items.find((i) => i.id === id);
      if (bestaand) {
        bestaand.hoeveelheid = Math.round(((bestaand.hoeveelheid ?? 0) + ing.hoeveelheid) * 100) / 100;
        continue;
      }
      items.push({
        id,
        naam: ing.naam,
        categorie: 'avondeten',
        afgevinkt: false,
        hoeveelheid: ing.hoeveelheid,
        eenheid: ing.eenheid,
        afdeling: ing.afdeling,
        recept: { dag, naam: recept.naam },
      });
    }
  }
  return items;
}

/** De vaste items (ontbijt, school, huishouden) in de taal van de gebruiker. */
export function vasteItems(taal: Taal): LijstItem[] {
  return VASTE_ITEMS.flatMap(({ categorie, items: codes }) =>
    codes.map((code) => ({
      id: `${categorie}-${code}`,
      naam: vertaal(taal, `item.${code}` as Sleutel),
      categorie,
      afgevinkt: false,
      ...(VAST_AFDELING[code] ? { afdeling: VAST_AFDELING[code] } : {}),
    }))
  );
}

/**
 * Zet de recepten van een goedgekeurd weekplan op de boodschappenlijst (WEEK-15).
 * - Items van een vorig weekplan worden vervangen door die van dit plan.
 * - Zelf toegevoegde en gescande items blijven staan, net als vaste items.
 * - Wie hetzelfde plan opnieuw overzet, krijgt geen dubbels en verliest zijn vinkjes niet.
 * - Een vast item dat ook in een recept zit (bv. brood), komt er niet nog eens apart bij.
 * - `aanpassing` past de items uit het plan aan vóór ze op de lijst komen
 *   (bv. aftrekken wat al in de frigo ligt, WEEK-12).
 */
export function voegPlanToe(
  bestaand: readonly LijstItem[],
  dagen: readonly PlanDag[],
  taal: Taal,
  aanpassing: (items: LijstItem[]) => LijstItem[] = (i) => i,
  sleutel?: string
): LijstItem[] {
  const oud = new Map(bestaand.map((i) => [i.id, i]));
  const volledig = itemsUitPlan(dagen, sleutel);
  const receptNamen = new Set(volledig.map((i) => klein(i.naam)));
  const uitPlan = aanpassing(volledig).map((i) => {
    const was = oud.get(i.id);
    return was?.afgevinkt ? { ...i, afgevinkt: true, ...(was.afgevinktDoor ? { afgevinktDoor: was.afgevinktDoor } : {}) } : i;
  });

  const behouden = bestaand.filter(
    (i) =>
      !i.recept &&
      // items van een weekmenu uit een oudere versie (zonder recept-koppeling) horen bij het vorige plan
      i.categorie !== 'avondeten' &&
      !(isVastItemId(i.id) && receptNamen.has(klein(i.naam)))
  );
  const aanwezig = new Set([...behouden.map((i) => i.id), ...behouden.map((i) => klein(i.naam))]);
  const ontbrekendVast = vasteItems(taal).filter(
    (v) => !aanwezig.has(v.id) && !aanwezig.has(klein(v.naam)) && !receptNamen.has(klein(v.naam))
  );
  return [...uitPlan, ...behouden, ...ontbrekendVast];
}

const VASTE_IDS = new Set(VASTE_ITEMS.flatMap(({ categorie, items }) => items.map((c) => `${categorie}-${c}`)));
function isVastItemId(id: string): boolean {
  return VASTE_IDS.has(id);
}

/**
 * Voegt items met dezelfde naam, eenheid en categorie samen tot één regel en telt de hoeveelheden op.
 * Volgorde: zoals ze voor het eerst in de lijst voorkomen.
 */
export function samenvoegen(items: readonly LijstItem[], { overCategorieen = false } = {}): LijstRegel[] {
  const regels = new Map<string, LijstRegel>();
  for (const i of items) {
    const sleutel = `${overCategorieen ? '' : i.categorie}|${klein(i.naam)}|${i.eenheid ?? ''}`;
    const regel = regels.get(sleutel);
    if (!regel) {
      regels.set(sleutel, {
        sleutel,
        naam: i.naam,
        categorie: i.categorie,
        hoeveelheid: i.hoeveelheid,
        eenheid: i.eenheid,
        afdeling: i.afdeling,
        afgevinkt: i.afgevinkt,
        ids: [i.id],
        recepten: i.recept ? [i.recept.naam] : [],
        ...(i.door ? { door: i.door } : {}),
        afgevinktDoor: i.afgevinkt && i.afgevinktDoor ? [i.afgevinktDoor] : [],
      });
      continue;
    }
    if (i.hoeveelheid !== undefined) {
      regel.hoeveelheid = Math.round(((regel.hoeveelheid ?? 0) + i.hoeveelheid) * 100) / 100;
    }
    regel.afgevinkt = regel.afgevinkt && i.afgevinkt;
    regel.ids.push(i.id);
    if (i.recept && !regel.recepten.includes(i.recept.naam)) regel.recepten.push(i.recept.naam);
    if (!regel.door && i.door) regel.door = i.door;
    if (i.afgevinkt && i.afgevinktDoor && !regel.afgevinktDoor.includes(i.afgevinktDoor)) regel.afgevinktDoor.push(i.afgevinktDoor);
  }
  return [...regels.values()];
}

/**
 * Vinkt een regel af (of weer aan): alle onderliggende items krijgen dezelfde status.
 * `door` (gedeelde lijst, WEEK-17): wie afvinkt. Wie een item al eerder afvinkte, blijft staan;
 * een vinkje weghalen wist ook de naam.
 */
export function vinkAf(items: readonly LijstItem[], ids: readonly string[], afgevinkt: boolean, door?: string): LijstItem[] {
  const set = new Set(ids);
  return items.map((i) => {
    if (!set.has(i.id) || i.afgevinkt === afgevinkt) return i;
    const { afgevinktDoor: _weg, ...rest } = i;
    return afgevinkt && door ? { ...rest, afgevinkt, afgevinktDoor: door } : { ...rest, afgevinkt };
  });
}

/**
 * Het selectievakje naast een rubriek of recept (WEEK-111): alle regels van de sectie samen.
 * Zijn ze allemaal afgevinkt, dan wordt de sectie weer open gezet; anders wordt alles afgevinkt.
 */
export function sectieKeuze(regels: readonly LijstRegel[]): { afgevinkt: boolean; ids: string[] } {
  const alles = regels.length > 0 && regels.every((r) => r.afgevinkt);
  return { afgevinkt: !alles, ids: regels.flatMap((r) => r.ids) };
}

/** Een item dat de gebruiker zelf toevoegt; in een gedeelde lijst met de naam van wie het toevoegde. */
export function eigenItem(naam: string, nu: Date, door?: string): LijstItem | null {
  const n = naam.trim();
  if (!n) return null;
  return { id: `extra-${nu.getTime()}`, naam: n, categorie: 'extra', afgevinkt: false, ...(door ? { door } : {}) };
}

/** Aantal verschillende ingrediënten uit de recepten (voor de bevestiging na het overzetten). */
export function aantalReceptRegels(items: readonly LijstItem[]): number {
  return samenvoegen(items.filter((i) => i.recept)).length;
}

// ── Weergaven (WEEK-16) ──

export type Weergave = 'recept' | 'categorie';

/** Een sectie op het scherm. `soort` bepaalt hoe de titel getoond wordt. */
export type LijstSectie =
  | { sleutel: string; soort: 'recept'; dag: DagCode; recept: string; regels: LijstRegel[] }
  | { sleutel: string; soort: 'categorie'; categorie: string; regels: LijstRegel[] }
  | { sleutel: string; soort: 'afdeling'; afdeling: string; regels: LijstRegel[] };

/** Afdeling van een item; vaste items uit een oudere versie krijgen ze via hun id. */
export function afdelingVan(i: LijstItem): string {
  if (i.afdeling) return i.afdeling;
  const code = VASTE_ITEMS.flatMap(({ categorie, items }) => items.map((c) => [`${categorie}-${c}`, c] as const)).find(([id]) => id === i.id)?.[1];
  return (code && VAST_AFDELING[code]) || 'overig';
}

/**
 * Weergave per recept: eerst de recepten in de volgorde van de week (zondag → zaterdag),
 * daarna de overige items per lijstcategorie (vaste items, zelf toegevoegd, gescand).
 */
export function perRecept(items: readonly LijstItem[]): LijstSectie[] {
  const recepten = new Map<string, { dag: DagCode; recept: string; items: LijstItem[] }>();
  const overige = new Map<string, LijstItem[]>();
  for (const i of items) {
    if (i.recept) {
      const sleutel = `${i.recept.dag}|${i.recept.naam}`;
      const groep = recepten.get(sleutel) ?? { dag: i.recept.dag, recept: i.recept.naam, items: [] };
      groep.items.push(i);
      recepten.set(sleutel, groep);
    } else {
      overige.set(i.categorie, [...(overige.get(i.categorie) ?? []), i]);
    }
  }
  const receptSecties: LijstSectie[] = [...recepten.entries()]
    .sort(([, a], [, b]) => WEEKDAGEN.indexOf(a.dag) - WEEKDAGEN.indexOf(b.dag))
    .map(([sleutel, g]) => ({ sleutel: `recept|${sleutel}`, soort: 'recept', dag: g.dag, recept: g.recept, regels: samenvoegen(g.items) }));
  const overigeSecties: LijstSectie[] = [...overige.entries()].map(([categorie, groep]) => ({
    sleutel: `categorie|${categorie}`,
    soort: 'categorie',
    categorie,
    regels: samenvoegen(groep),
  }));
  return [...receptSecties, ...overigeSecties];
}

/**
 * Weergave per categorie, voor in de winkel: alles gegroepeerd per winkelafdeling
 * (groenten, zuivel, vlees…), dubbele items over recepten en lijsten heen samengeteld.
 * Volgorde van de afdelingen zoals in een gemiddelde winkel; "overig" achteraan.
 */
export function perAfdeling(items: readonly LijstItem[]): LijstSectie[] {
  const groepen = new Map<string, LijstItem[]>();
  for (const i of items) {
    const afdeling = afdelingVan(i);
    groepen.set(afdeling, [...(groepen.get(afdeling) ?? []), i]);
  }
  const volgorde = [...AFDELINGEN, 'overig'];
  return [...groepen.entries()]
    .sort(([a], [b]) => volgorde.indexOf(a) - volgorde.indexOf(b))
    .map(([afdeling, groep]) => ({
      sleutel: `afdeling|${afdeling}`,
      soort: 'afdeling',
      afdeling,
      regels: samenvoegen(groep, { overCategorieen: true }).sort((a, b) => a.naam.localeCompare(b.naam)),
    }));
}

export function secties(items: readonly LijstItem[], weergave: Weergave): LijstSectie[] {
  return weergave === 'recept' ? perRecept(items) : perAfdeling(items);
}

export function isWeergave(w: unknown): w is Weergave {
  return w === 'recept' || w === 'categorie';
}

// ── Inlezen (WEEK-8) ──

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Leest één lijstitem veilig in (uit opslag of van een ander toestel); null als het onbruikbaar is. */
export function leesLijstItem(ruw: unknown): LijstItem | null {
  if (!isObject(ruw) || typeof ruw.id !== 'string' || !ruw.id || typeof ruw.naam !== 'string' || !ruw.naam.trim()) return null;
  const recept = isObject(ruw.recept) && WEEKDAGEN.includes(ruw.recept.dag as DagCode) && typeof ruw.recept.naam === 'string'
    ? { dag: ruw.recept.dag as DagCode, naam: ruw.recept.naam }
    : undefined;
  const hoeveelheid = typeof ruw.hoeveelheid === 'number' && Number.isFinite(ruw.hoeveelheid) && ruw.hoeveelheid >= 0 ? ruw.hoeveelheid : undefined;
  return {
    id: ruw.id,
    naam: ruw.naam,
    categorie: typeof ruw.categorie === 'string' && ruw.categorie ? ruw.categorie : 'extra',
    afgevinkt: ruw.afgevinkt === true,
    ...(hoeveelheid !== undefined ? { hoeveelheid } : {}),
    ...(typeof ruw.eenheid === 'string' ? { eenheid: ruw.eenheid } : {}),
    ...(typeof ruw.afdeling === 'string' && (AFDELINGEN as string[]).includes(ruw.afdeling) ? { afdeling: ruw.afdeling as Afdeling } : {}),
    ...(recept ? { recept } : {}),
    ...(typeof ruw.door === 'string' && ruw.door ? { door: ruw.door } : {}),
    ...(ruw.afgevinkt === true && typeof ruw.afgevinktDoor === 'string' && ruw.afgevinktDoor ? { afgevinktDoor: ruw.afgevinktDoor } : {}),
  };
}

/** Leest een bewaarde lijst veilig in; onbruikbare items worden overgeslagen. */
export function normaliseerLijst(ruw: unknown): LijstItem[] {
  return Array.isArray(ruw) ? ruw.map(leesLijstItem).filter((i): i is LijstItem => i !== null) : [];
}

/**
 * Zet ontbrekende ingrediënten van één recept (opnieuw) op de boodschappenlijst (WEEK-13).
 * Gebruikt dezelfde ids als bij het overzetten van het plan; een item dat al gekocht was, staat weer open.
 */
export function zetOntbrekendOpLijst(items: readonly LijstItem[], dag: PlanDag, namen: readonly string[], sleutel?: string): LijstItem[] {
  const gezocht = new Set(namen.map(klein));
  const nodig = itemsUitPlan([dag], sleutel).filter((i) => gezocht.has(klein(i.naam)));
  const ids = new Set(nodig.map((i) => i.id));
  const bestaand = new Set(items.map((i) => i.id));
  const bijgewerkt = items.map((i) => {
    if (!ids.has(i.id) || !i.afgevinkt) return i;
    const { afgevinktDoor: _weg, ...rest } = i;
    return { ...rest, afgevinkt: false };
  });
  return [...bijgewerkt, ...nodig.filter((i) => !bestaand.has(i.id))];
}
