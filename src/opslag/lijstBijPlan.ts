// WEEK-272: de boodschappenlijst bijwerken na een wijziging aan het weekmenu (bevestigen, vervangen, weghalen).
// De lijst bevat enkel de ingrediënten van bevestigde gerechten die nog niet gekookt zijn (WEEK-134), min wat in huis is.
// Wat al afgevinkt is, ligt in "In huis" en blijft daar.
import type { Taal } from '@/i18n';
import { planSleutel, voegPlanToe } from '@/lib/lijst';
import { trekFrigoAf } from '@/lib/frigo';
import { openBevestigdeDagen } from '@/lib/planner/dagBevestigen';
import type { Weekplan } from '@/lib/planner/types';
import { laadFrigo } from './frigo';
import { wijzigLijst } from './lijst';
import { laadPlan } from './plan';
import { lijstNaFrigo, type TerugOpLijst } from '@/lib/lijstNaFrigo';

export async function zetLijstBijPlan(p: Weekplan, taal: Taal): Promise<void> {
  const frigo = await laadFrigo();
  await wijzigLijst((bestaand) => voegPlanToe(bestaand, openBevestigdeDagen(p), taal, (items) => trekFrigoAf(items, frigo), planSleutel(p)));
}

/**
 * WEEK-322: na het verwijderen of verlagen van een product bij In huis. Wat een bevestigd, nog niet gekookt gerecht
 * nu mist, komt terug op de boodschappenlijst (bij een lagere hoeveelheid enkel het tekort). Geeft terug wat er
 * terugkwam, voor de melding op In huis. Zonder weekmenu verandert er niets.
 */
export async function zetLijstNaFrigo(taal: Taal): Promise<TerugOpLijst[]> {
  const plan = await laadPlan();
  if (!plan) return [];
  const frigo = await laadFrigo();
  let terug: TerugOpLijst[] = [];
  await wijzigLijst((bestaand) => {
    const r = lijstNaFrigo(bestaand, openBevestigdeDagen(plan), taal, frigo, planSleutel(plan));
    terug = r.terug;
    return r.lijst;
  });
  return terug;
}
