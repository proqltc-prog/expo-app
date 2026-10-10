import type { Afdeling } from '@/data/ingredienten';
import { VASTE_ITEMS } from '@/data/vasteItems';
import { Sleutel, Taal, vertaal } from '@/i18n';
import type { DagCode, PlanDag } from '@/lib/planner/types';

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
};

const klein = (t: string) => t.trim().toLocaleLowerCase();

/** Eén item per ingrediënt per recept, zodat de lijst later ook per recept getoond kan worden. */
export function itemsUitPlan(dagen: readonly PlanDag[]): LijstItem[] {
  return dagen.flatMap(({ dag, recept }) =>
    recept.ingredienten.map((ing) => ({
      id: `recept-${dag}-${klein(ing.naam)}-${ing.eenheid}`,
      naam: ing.naam,
      categorie: 'avondeten',
      afgevinkt: false,
      hoeveelheid: ing.hoeveelheid,
      eenheid: ing.eenheid,
      afdeling: ing.afdeling,
      recept: { dag, naam: recept.naam },
    }))
  );
}

/** De vaste items (ontbijt, school, huishouden) in de taal van de gebruiker. */
export function vasteItems(taal: Taal): LijstItem[] {
  return VASTE_ITEMS.flatMap(({ categorie, items: codes }) =>
    codes.map((code) => ({ id: `${categorie}-${code}`, naam: vertaal(taal, `item.${code}` as Sleutel), categorie, afgevinkt: false }))
  );
}

/**
 * Zet de recepten van een goedgekeurd weekplan op de boodschappenlijst (WEEK-15).
 * - Items van een vorig weekplan worden vervangen door die van dit plan.
 * - Zelf toegevoegde en gescande items blijven staan, net als vaste items.
 * - Wie hetzelfde plan opnieuw overzet, krijgt geen dubbels en verliest zijn vinkjes niet.
 * - Een vast item dat ook in een recept zit (bv. brood), komt er niet nog eens apart bij.
 */
export function voegPlanToe(bestaand: readonly LijstItem[], dagen: readonly PlanDag[], taal: Taal): LijstItem[] {
  const vinkjes = new Map(bestaand.map((i) => [i.id, i.afgevinkt]));
  const uitPlan = itemsUitPlan(dagen).map((i) => ({ ...i, afgevinkt: vinkjes.get(i.id) ?? false }));
  const receptNamen = new Set(uitPlan.map((i) => klein(i.naam)));

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
export function samenvoegen(items: readonly LijstItem[]): LijstRegel[] {
  const regels = new Map<string, LijstRegel>();
  for (const i of items) {
    const sleutel = `${i.categorie}|${klein(i.naam)}|${i.eenheid ?? ''}`;
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
      });
      continue;
    }
    if (i.hoeveelheid !== undefined) {
      regel.hoeveelheid = Math.round(((regel.hoeveelheid ?? 0) + i.hoeveelheid) * 100) / 100;
    }
    regel.afgevinkt = regel.afgevinkt && i.afgevinkt;
    regel.ids.push(i.id);
    if (i.recept && !regel.recepten.includes(i.recept.naam)) regel.recepten.push(i.recept.naam);
  }
  return [...regels.values()];
}

/** Vinkt een regel af (of weer aan): alle onderliggende items krijgen dezelfde status. */
export function vinkAf(items: readonly LijstItem[], ids: readonly string[], afgevinkt: boolean): LijstItem[] {
  const set = new Set(ids);
  return items.map((i) => (set.has(i.id) ? { ...i, afgevinkt } : i));
}

/** Aantal verschillende ingrediënten uit de recepten (voor de bevestiging na het overzetten). */
export function aantalReceptRegels(items: readonly LijstItem[]): number {
  return samenvoegen(items.filter((i) => i.recept)).length;
}
