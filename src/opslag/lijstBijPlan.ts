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

export async function zetLijstBijPlan(p: Weekplan, taal: Taal): Promise<void> {
  const frigo = await laadFrigo();
  await wijzigLijst((bestaand) => voegPlanToe(bestaand, openBevestigdeDagen(p), taal, (items) => trekFrigoAf(items, frigo), planSleutel(p)));
}
