// WEEK-287: In huis per gerecht. Een product in huis onthoudt niet voor welk gerecht het gekocht is; we koppelen het
// aan de ingrediënten van de bevestigde gerechten die nog niet gekookt zijn, met dezelfde regel als bij Gekookt (pastBij).
// Een product dat bij meer gerechten past, staat bij elk van die gerechten. Wat bij geen gerecht past, staat achteraan.
import { FrigoItem, FrigoRegel, frigoSecties, pastBij } from '@/lib/frigo';
import type { DagCode, PlanDag, PlanRecept } from '@/lib/planner/types';

export type FrigoGerechtGroep = {
  sleutel: string;
  /** Ontbreekt bij de groep "niet voor het weekmenu". */
  dag?: DagCode;
  recept?: PlanRecept;
  regels: FrigoRegel[];
};

export const GEEN_GERECHT = 'gerecht|geen';

const regelsVan = (items: readonly FrigoItem[]) => frigoSecties(items).flatMap((s) => s.regels);

/** De producten in huis per gerecht, in de volgorde van het weekmenu; lege gerechten vallen weg. */
export function frigoPerGerecht(frigo: readonly FrigoItem[], dagen: readonly PlanDag[]): FrigoGerechtGroep[] {
  const gebruikt = new Set<string>();
  const groepen: FrigoGerechtGroep[] = [];
  dagen.forEach((d, i) => {
    const items = frigo.filter((f) => d.recept.ingredienten.some((ing) => pastBij(f, ing)));
    if (!items.length) return;
    items.forEach((f) => gebruikt.add(f.id));
    groepen.push({ sleutel: `gerecht|${i}|${d.dag}|${d.recept.naam}`, dag: d.dag, recept: d.recept, regels: regelsVan(items) });
  });
  const rest = frigo.filter((f) => !gebruikt.has(f.id));
  if (rest.length) groepen.push({ sleutel: GEEN_GERECHT, regels: regelsVan(rest) });
  return groepen;
}
