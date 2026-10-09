import { VASTE_ITEMS } from '@/data/vasteItems';
import { Sleutel, Taal, vertaal } from '@/i18n';
import type { PlanDag } from '@/lib/planner/types';

// Pure logica voor de boodschappenlijst (zonder opslag), zodat ze los testbaar is.
// Opslag op het toestel staat in src/opslag/lijst.ts.

export type LijstItem = {
  id: string;
  naam: string;
  /** Categoriecode (bv. "fruit"); het scherm toont de vertaalde naam via categorieNaam(). */
  categorie: string;
  afgevinkt: boolean;
  hoeveelheid?: number;
  eenheid?: string;
};

/**
 * Bouwt een lijst uit de dagen van een weekplan + vaste items (in de taal van de gebruiker).
 * Hetzelfde ingrediënt met dezelfde eenheid wordt samengeteld.
 */
export function lijstUitPlan(dagen: readonly PlanDag[], taal: Taal = 'nl'): LijstItem[] {
  const items: LijstItem[] = [];
  const perSleutel = new Map<string, LijstItem>();
  const namen = new Set<string>();

  for (const { recept } of dagen) {
    for (const ing of recept.ingredienten) {
      const sleutel = `${ing.naam.toLowerCase()}|${ing.eenheid}`;
      const bestaand = perSleutel.get(sleutel);
      if (bestaand) {
        bestaand.hoeveelheid = Math.round(((bestaand.hoeveelheid ?? 0) + ing.hoeveelheid) * 100) / 100;
        continue;
      }
      const item: LijstItem = {
        id: `avondeten-${sleutel}`,
        naam: ing.naam,
        categorie: 'avondeten',
        afgevinkt: false,
        hoeveelheid: ing.hoeveelheid,
        eenheid: ing.eenheid,
      };
      perSleutel.set(sleutel, item);
      namen.add(ing.naam.toLowerCase());
      items.push(item);
    }
  }

  VASTE_ITEMS.forEach(({ categorie, items: codes }) =>
    codes.forEach((code) => {
      const naam = vertaal(taal, `item.${code}` as Sleutel);
      if (namen.has(naam.toLowerCase())) return;
      namen.add(naam.toLowerCase());
      items.push({ id: `${categorie}-${code}`, naam, categorie, afgevinkt: false });
    })
  );
  return items;
}
