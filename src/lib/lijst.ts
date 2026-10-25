import type { Afdeling } from '@/data/ingredienten';
import { AFDELINGEN } from '@/data/ingredienten';
import { Sleutel, Taal } from '@/i18n';
import { openBevestigdeDagen } from '@/lib/planner/dagBevestigen';
import { DagCode, PlanDag, Weekplan, WEEKDAGEN } from '@/lib/planner/types';
import { dagenInTaal } from '@/lib/planner/vertaal';

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
  /** Vaste ingrediëntcode (taalonafhankelijk); enkel voor items uit de weekplanning (WEEK-159). */
  code?: string;
  /** Het recept waar dit ingrediënt bij hoort (enkel voor items uit de weekplanning). `id` is de databank- of receptenbankcode (WEEK-160). */
  recept?: { dag: DagCode; naam: string; id?: string };
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

/** De voornaam uit een volledige naam ("Maarten De Ridder" → "Maarten"), voor "gekocht door …" (WEEK-159). */
export function voornaam(naam: string): string {
  return naam.trim().split(/\s+/)[0] ?? '';
}

/**
 * Sleutel van een weekplan (uit het tijdstip waarop het gemaakt werd), zodat lijstitems van verschillende
 * weken nooit dezelfde id krijgen (WEEK-29). Hetzelfde plan geeft altijd dezelfde sleutel.
 */
export function planSleutel(plan: { gemaaktOp: string }): string {
  const t = Date.parse(plan.gemaaktOp);
  return Number.isNaN(t) ? klein(plan.gemaaktOp).replace(/[^a-z0-9]+/g, '') || 'plan' : t.toString(36);
}

/** Het id zonder het recept erachter (zie itemsUitPlan): de basis van een gedeeld ingrediënt. */
function basisId(i: LijstItem): string {
  const suffix = i.recept?.id ? `-${i.recept.id}` : '';
  return suffix && i.id.endsWith(suffix) ? i.id.slice(0, -suffix.length) : i.id;
}

/**
 * Eén item per ingrediënt per recept, zodat de lijst per recept getoond kan worden.
 * Staat hetzelfde ingrediënt (code + eenheid) twee keer in één recept, dan wordt het samengeteld (WEEK-29).
 * Recepten op dezelfde dag die een ingrediënt delen, krijgen elk hun eigen regel met de juiste hoeveelheid (WEEK-159).
 * Het eerste recept houdt het id zonder recept (zoals vroeger), zodat vinkjes en frigo-koppelingen blijven kloppen (WEEK-160).
 * `sleutel`: zie planSleutel().
 */
export function itemsUitPlan(dagen: readonly PlanDag[], sleutel?: string): LijstItem[] {
  const items: LijstItem[] = [];
  for (const { dag, recept } of dagen) {
    for (const ing of recept.ingredienten) {
      // WEEK-154: het id volgt de vaste code (niet de taalafhankelijke naam), zodat afvinken en frigo blijven kloppen na een taalwissel.
      const basis = `recept-${sleutel ? `${sleutel}-` : ''}${dag}-${klein(ing.code ?? ing.naam)}-${ing.eenheid}`;
      const eerste = items.find((i) => i.id === basis);
      const id = !eerste || eerste.recept?.id === recept.id ? basis : `${basis}-${recept.id}`;
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
        ...(ing.code ? { code: ing.code } : {}),
        recept: { dag, naam: recept.naam, id: recept.id },
      });
    }
  }
  return items;
}

/**
 * Zet de namen van de weekmenu-items op de gekozen taal (WEEK-154). Hoeveelheden, afvinkstatus en frigo blijven
 * ongewijzigd; geeft dezelfde lijst terug als er niets verandert.
 */
export function hernoemLijst(items: readonly LijstItem[], dagen: readonly PlanDag[], taal: Taal, sleutel?: string): LijstItem[] {
  const namen = new Map(itemsUitPlan(dagenInTaal(dagen, taal), sleutel).map((i) => [i.id, i.naam]));
  let veranderd = false;
  const nieuw = items.map((i) => {
    const naam = i.recept ? namen.get(i.id) : undefined;
    if (naam === undefined || naam === i.naam) return i;
    veranderd = true;
    return { ...i, naam };
  });
  return veranderd ? nieuw : (items as LijstItem[]);
}

/**
 * Zet de recepten van een goedgekeurd weekplan op de boodschappenlijst (WEEK-15).
 * - Items van een vorig weekplan worden vervangen door die van dit plan.
 * - Zelf toegevoegde en gescande items blijven staan, net als vaste items.
 * - Wie hetzelfde plan opnieuw overzet, krijgt geen dubbels en verliest zijn vinkjes niet.
 * - `aanpassing` past de items uit het plan aan vóór ze op de lijst komen
 *   (bv. aftrekken wat al in de frigo ligt, WEEK-12).
 * Vaste items (ontbijt, school, huishouden) bestaan niet meer (WEEK-155).
 */
export function voegPlanToe(
  bestaand: readonly LijstItem[],
  dagen: readonly PlanDag[],
  taal: Taal,
  aanpassing: (items: LijstItem[]) => LijstItem[] = (i) => i,
  sleutel?: string
): LijstItem[] {
  const oud = new Map(bestaand.map((i) => [i.id, i]));
  const volledig = itemsUitPlan(dagenInTaal(dagen, taal), sleutel);
  const uitPlan = aanpassing(volledig).map((i) => {
    // Een tweede recept met een gedeeld ingrediënt erft de vinkstatus van het basis-item (WEEK-160).
    const was = oud.get(i.id) ?? oud.get(basisId(i));
    return was?.afgevinkt ? { ...i, afgevinkt: true, ...(was.afgevinktDoor ? { afgevinktDoor: was.afgevinktDoor } : {}) } : i;
  });

  const behouden = bestaand.filter(
    (i) =>
      !i.recept &&
      // items van een weekmenu uit een oudere versie (zonder recept-koppeling) horen bij het vorige plan
      i.categorie !== 'avondeten'
  );
  return [...uitPlan, ...behouden];
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

/** Afdeling van een item; zonder afdeling komt het onder 'overig'. */
export function afdelingVan(i: LijstItem): string {
  return i.afdeling ?? 'overig';
}

/**
 * Weergave per recept: eerst de recepten in de volgorde van het weekplan (de kalender),
 * daarna de overige items per lijstcategorie (vaste items, zelf toegevoegd, gescand).
 * `dagVolgorde`: de dagcodes in de volgorde van plan.dagen (WEEK-144). Zonder: de weekvolgorde.
 */
export function perRecept(items: readonly LijstItem[], dagVolgorde: readonly DagCode[] = WEEKDAGEN): LijstSectie[] {
  const recepten = new Map<string, { dag: DagCode; recept: string; items: LijstItem[] }>();
  const overige = new Map<string, LijstItem[]>();
  for (const i of items) {
    if (i.recept) {
      // Op recept-id (WEEK-160), zodat twee recepten met dezelfde naam op één dag niet samenvallen.
      const sleutel = `${i.recept.dag}|${i.recept.id ?? i.recept.naam}`;
      const groep = recepten.get(sleutel) ?? { dag: i.recept.dag, recept: i.recept.naam, items: [] };
      groep.items.push(i);
      recepten.set(sleutel, groep);
    } else {
      overige.set(i.categorie, [...(overige.get(i.categorie) ?? []), i]);
    }
  }
  const receptSecties: LijstSectie[] = [...recepten.entries()]
    .sort(([, a], [, b]) => dagVolgorde.indexOf(a.dag) - dagVolgorde.indexOf(b.dag))
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

export function secties(items: readonly LijstItem[], weergave: Weergave, dagVolgorde?: readonly DagCode[]): LijstSectie[] {
  return weergave === 'recept' ? perRecept(items, dagVolgorde) : perAfdeling(items);
}

/**
 * WEEK-138: enkel de recepten van het huidige weekplan die bevestigd en nog niet gekookt zijn, tonen op de lijst.
 * Zonder weekplan, of als alle recepten gekookt zijn, geen recepten. Eigen en gescande items blijven staan.
 */
export function alleenHuidigPlan(items: readonly LijstItem[], plan: Weekplan | null): LijstItem[] {
  const openDagen = plan ? openBevestigdeDagen(plan) : [];
  return items.filter((i) => !i.recept || openDagen.some((d) => d.dag === i.recept?.dag && d.recept.naam === i.recept?.naam));
}

/**
 * De teller bovenaan de lijst (WEEK-137): het totaal is de som van de tellers per sectie in de huidige weergave,
 * zodat het altijd klopt met wat er onder elkaar staat. Elke sectie telt haar unieke ingrediënten.
 */
export function telRegels(secties: readonly LijstSectie[]): { open: number; totaal: number } {
  let open = 0;
  let totaal = 0;
  for (const sectie of secties) {
    totaal += sectie.regels.length;
    open += sectie.regels.filter((r) => !r.afgevinkt).length;
  }
  return { open, totaal };
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
    ? { dag: ruw.recept.dag as DagCode, naam: ruw.recept.naam, ...(typeof ruw.recept.id === 'string' && ruw.recept.id ? { id: ruw.recept.id } : {}) }
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
    ...(typeof ruw.code === 'string' && ruw.code ? { code: ruw.code } : {}),
    ...(recept ? { recept } : {}),
    ...(typeof ruw.door === 'string' && ruw.door ? { door: ruw.door } : {}),
    ...(ruw.afgevinkt === true && typeof ruw.afgevinktDoor === 'string' && ruw.afgevinktDoor ? { afgevinktDoor: ruw.afgevinktDoor } : {}),
  };
}

/** Leest een bewaarde lijst veilig in; onbruikbare items worden overgeslagen. */
/**
 * De vaste items die vroeger op de lijst kwamen (WEEK-155 verwijderd). Ze worden bij het inlezen weggelaten,
 * zodat een toestel met een oude kopie ze niet opnieuw naar de database stuurt. Kan weg als alle toestellen bijgewerkt zijn.
 */
const VERWIJDERDE_VASTE_IDS = new Set([
  'brood-beleg-brood', 'brood-beleg-boter', 'brood-beleg-kaas', 'brood-beleg-hesp', 'brood-beleg-choco',
  'fruit-appels', 'fruit-bananen', 'fruit-mandarijnen',
  'huishouden-wc-papier', 'huishouden-tandpasta',
  'school-koekjes', 'school-drinkbrikjes',
]);

export function normaliseerLijst(ruw: unknown): LijstItem[] {
  return Array.isArray(ruw)
    ? ruw.map(leesLijstItem).filter((i): i is LijstItem => i !== null && !VERWIJDERDE_VASTE_IDS.has(i.id))
    : [];
}

