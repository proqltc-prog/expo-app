// Het weekplan veilig bijwerken als er intussen iets veranderde (WEEK-28).
// Schermen werken met een kopie van het plan; tegen de tijd dat een actie klaar is (bv. een reset met AI),
// kan het bewaarde plan al aangepast zijn door een ander scherm of een ander gezinslid.
import { frigoBron, type FrigoItem } from '@/lib/frigo';
import { zetGedaan } from './gedaan';
import type { PlanDag, Weekplan } from './types';

/** Is dag `index` in `huidig` nog dezelfde dag als in de versie waarop de actie gebaseerd was? */
export function zelfdeDag(huidig: Weekplan, index: number, verwacht: { gemaaktOp: string; receptNaam: string }): boolean {
  return huidig.gemaaktOp === verwacht.gemaaktOp && huidig.dagen[index]?.recept.naam === verwacht.receptNaam;
}

/**
 * Vervangt enkel dag `index` van het nieuwste plan door `nieuweDag`, en enkel als die dag nog dezelfde
 * is als toen de actie begon. Al de rest (andere dagen, statussen) blijft zoals in het nieuwste plan.
 * Geeft hetzelfde object terug als er niets vervangen wordt.
 */
export function vervangDag(
  huidig: Weekplan,
  index: number,
  verwacht: { gemaaktOp: string; receptNaam: string },
  nieuweDag: PlanDag
): Weekplan {
  if (!zelfdeDag(huidig, index, verwacht)) return huidig;
  return { ...huidig, dagen: huidig.dagen.map((d, i) => (i === index ? nieuweDag : d)) };
}

/**
 * "Gekookt?" omwisselen op basis van het nieuwste plan en de nieuwste frigo.
 * Is de dag intussen een ander recept (nieuw plan of reset), dan gebeurt er niets.
 */
export function wisselGedaan(
  plan: Weekplan,
  frigo: readonly FrigoItem[],
  index: number,
  verwacht: { gemaaktOp: string; receptNaam: string }
): { plan: Weekplan; frigo: FrigoItem[] } {
  if (!zelfdeDag(plan, index, verwacht)) return { plan, frigo: [...frigo] };
  const resultaat = zetGedaan(plan, index, !plan.dagen[index].gedaan, frigo);
  if (!resultaat.plan.dagen.every((d) => d.gedaan)) return resultaat;
  return leegLijstProducten(resultaat.plan, index, resultaat.frigo);
}

/**
 * WEEK-141: zijn alle recepten van het plan gekookt, dan gaan de producten van de lijst uit de frigo.
 * Die producten worden bij de laatste dag bewaard, zodat ontkoken ze weer terugzet.
 * Losse producten blijven staan.
 */
function leegLijstProducten(plan: Weekplan, index: number, frigo: FrigoItem[]): { plan: Weekplan; frigo: FrigoItem[] } {
  const vanLijst = frigo.filter((f) => frigoBron(f) === 'planner');
  if (!vanLijst.length) return { plan, frigo };
  const dagen = plan.dagen.map((d, i) => (i === index ? { ...d, verbruikt: [...(d.verbruikt ?? []), ...vanLijst] } : d));
  return { plan: { ...plan, dagen }, frigo: frigo.filter((f) => frigoBron(f) !== 'planner') };
}
