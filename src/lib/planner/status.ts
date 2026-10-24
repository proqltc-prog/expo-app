// Receptstatussen (WEEK-13): gepland, ingrediënt ontbreekt, gedaan.
// Een ingrediënt "ontbreekt" als de gebruiker het met de hand uit de frigo haalde (op, weggegooid)
// en er niets meer van in de frigo is. Opnieuw gekocht (in de frigo) = niet meer ontbrekend.
import { FrigoItem, receptFrigo } from '@/lib/frigo';
import type { PlanDag, Weekplan } from './types';

export type ReceptStatus = 'gepland' | 'ontbreekt' | 'gedaan';

const klein = (t: string) => t.trim().toLocaleLowerCase();

export function receptStatus(d: PlanDag): ReceptStatus {
  if (d.gedaan) return 'gedaan';
  return d.ontbreekt?.length ? 'ontbreekt' : 'gepland';
}

// Enkel planner-producten tellen mee voor recepten; losse producten niet (WEEK-158).
const zitInFrigo = (frigo: readonly FrigoItem[], naam: string) => receptFrigo(frigo).some((f) => klein(f.naam) === klein(naam));

function vervangDagen(plan: Weekplan, dagen: PlanDag[]): Weekplan {
  return dagen.every((d, i) => d === plan.dagen[i]) ? plan : { ...plan, dagen };
}

/**
 * Na het handmatig verwijderen van producten uit de frigo: elk gepland recept dat een product nodig heeft
 * waarvan niets meer in de frigo zit, krijgt dat ingrediënt als ontbrekend.
 * Ontbreken álle ingrediënten van een recept, dan is het recept "gedaan".
 * Geeft hetzelfde plan-object terug als er niets verandert.
 */
export function markeerOntbrekend(plan: Weekplan, verwijderd: readonly FrigoItem[], frigoNa: readonly FrigoItem[]): Weekplan {
  const weg = [...new Set(receptFrigo(verwijderd).map((v) => klein(v.naam)))].filter((n) => !zitInFrigo(frigoNa, n));
  if (!weg.length) return plan;
  const dagen = plan.dagen.map((d): PlanDag => {
    if (d.gedaan) return d;
    const nieuw = d.recept.ingredienten
      .map((i) => i.naam)
      .filter((n) => weg.includes(klein(n)) && !(d.ontbreekt ?? []).some((o) => klein(o) === klein(n)));
    if (!nieuw.length) return d;
    const ontbreekt = [...(d.ontbreekt ?? []), ...nieuw];
    const alles = d.recept.ingredienten.every((i) => ontbreekt.some((o) => klein(o) === klein(i.naam)));
    if (alles) {
      const { ontbreekt: _o, ...rest } = d;
      return { ...rest, gedaan: true };
    }
    return { ...d, ontbreekt };
  });
  return vervangDagen(plan, dagen);
}

/** Wat opnieuw in de frigo zit (bv. opnieuw gekocht), ontbreekt niet meer. Hetzelfde plan-object als er niets verandert. */
export function werkOntbrekendBij(plan: Weekplan, frigo: readonly FrigoItem[]): Weekplan {
  const dagen = plan.dagen.map((d): PlanDag => {
    if (!d.ontbreekt?.length) return d;
    const ontbreekt = d.ontbreekt.filter((n) => !zitInFrigo(frigo, n));
    if (ontbreekt.length === d.ontbreekt.length) return d;
    const { ontbreekt: _o, ...rest } = d;
    return ontbreekt.length ? { ...rest, ontbreekt } : rest;
  });
  return vervangDagen(plan, dagen);
}
