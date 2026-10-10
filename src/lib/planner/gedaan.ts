// Recept op "gedaan" zetten (WEEK-19): de ingrediënten gaan uit de frigo.
// Terug op "niet gedaan" zet precies terug wat er verbruikt werd.
import { FrigoItem, herstel, verbruik } from '@/lib/frigo';
import type { PlanDag, Weekplan } from './types';

export function zetGedaan(plan: Weekplan, index: number, gedaan: boolean, frigo: readonly FrigoItem[]): { plan: Weekplan; frigo: FrigoItem[] } {
  const dag = plan.dagen[index];
  if (!dag || !!dag.gedaan === gedaan) return { plan, frigo: [...frigo] };
  let nieuweDag: PlanDag;
  let nieuweFrigo: FrigoItem[];
  if (gedaan) {
    const resultaat = verbruik(frigo, dag.recept.ingredienten);
    nieuweFrigo = resultaat.frigo;
    nieuweDag = { ...dag, gedaan: true, ...(resultaat.verbruikt.length ? { verbruikt: resultaat.verbruikt } : {}) };
  } else {
    nieuweFrigo = herstel(frigo, dag.verbruikt ?? []);
    const { gedaan: _g, verbruikt: _v, ...rest } = dag;
    nieuweDag = rest;
  }
  return { plan: { ...plan, dagen: plan.dagen.map((d, i) => (i === index ? nieuweDag : d)) }, frigo: nieuweFrigo };
}
