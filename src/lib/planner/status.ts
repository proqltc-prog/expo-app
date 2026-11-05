// Receptstatussen (WEEK-13): gepland, ingrediënt ontbreekt, gedaan.
// Een ingrediënt "ontbreekt" als de gebruiker het met de hand uit de frigo haalde (op, weggegooid)
// en er niets meer van in de frigo is. Opnieuw gekocht (in de frigo) = niet meer ontbrekend.
import { FrigoItem, pastBij, receptFrigo } from '@/lib/frigo';
import type { PlanDag, PlanIngredient, Weekplan } from './types';

export type ReceptStatus = 'gepland' | 'ontbreekt' | 'gedaan';

const klein = (t: string) => t.trim().toLocaleLowerCase();

export function receptStatus(d: PlanDag): ReceptStatus {
  if (d.gedaan) return 'gedaan';
  return d.ontbreekt?.length ? 'ontbreekt' : 'gepland';
}

/**
 * Zit er nog een planner-product dat bij dit ingrediënt past? Dezelfde koppeling als bij het verbruik (WEEK-160):
 * op code (taalonafhankelijk) of op naam, en met omrekening van de eenheid. Losse producten tellen niet mee (WEEK-158).
 */
const zitInFrigo = (frigo: readonly FrigoItem[], ing: PlanIngredient) => receptFrigo(frigo).some((f) => pastBij(f, ing));

function vervangDagen(plan: Weekplan, dagen: PlanDag[]): Weekplan {
  return dagen.every((d, i) => d === plan.dagen[i]) ? plan : { ...plan, dagen };
}

/**
 * Na het handmatig verwijderen van producten uit de frigo: elk gepland recept dat een product nodig heeft
 * waarvan niets meer in de frigo zit, krijgt dat ingrediënt als ontbrekend.
 * Ontbreken álle ingrediënten van een bevestigd recept, dan is het recept "gedaan"; een niet-bevestigd voorstel blijft "ontbreekt".
 * Geeft hetzelfde plan-object terug als er niets verandert.
 */
export function markeerOntbrekend(plan: Weekplan, verwijderd: readonly FrigoItem[], frigoNa: readonly FrigoItem[]): Weekplan {
  const weggehaald = receptFrigo(verwijderd);
  const nieuwOntbrekend = (ing: PlanIngredient) => weggehaald.some((v) => pastBij(v, ing)) && !zitInFrigo(frigoNa, ing);
  let veranderd = false;
  const dagen = plan.dagen.map((d): PlanDag => {
    if (d.gedaan) return d;
    const nieuw = d.recept.ingredienten
      .filter((i) => nieuwOntbrekend(i) && !(d.ontbreekt ?? []).some((o) => klein(o) === klein(i.naam)))
      .map((i) => i.naam);
    if (!nieuw.length) return d;
    veranderd = true;
    const ontbreekt = [...(d.ontbreekt ?? []), ...nieuw];
    const alles = d.recept.ingredienten.every((i) => ontbreekt.some((o) => klein(o) === klein(i.naam)));
    // WEEK-204: enkel een bevestigd recept kan zo "gedaan" worden; een voorstel dat nog niet bevestigd is, blijft wijzigbaar.
    if (alles && d.bevestigd) {
      const { ontbreekt: _o, ...rest } = d;
      return { ...rest, gedaan: true };
    }
    return { ...d, ontbreekt };
  });
  return veranderd ? vervangDagen(plan, dagen) : plan;
}

/** Wat opnieuw in de frigo zit (bv. opnieuw gekocht), ontbreekt niet meer. Hetzelfde plan-object als er niets verandert. */
export function werkOntbrekendBij(plan: Weekplan, frigo: readonly FrigoItem[]): Weekplan {
  const dagen = plan.dagen.map((d): PlanDag => {
    if (!d.ontbreekt?.length) return d;
    const ontbreekt = d.ontbreekt.filter((n) => {
      const ing = d.recept.ingredienten.find((i) => klein(i.naam) === klein(n));
      return !(ing ? zitInFrigo(frigo, ing) : receptFrigo(frigo).some((f) => klein(f.naam) === klein(n)));
    });
    if (ontbreekt.length === d.ontbreekt.length) return d;
    const { ontbreekt: _o, ...rest } = d;
    return ontbreekt.length ? { ...rest, ontbreekt } : rest;
  });
  return vervangDagen(plan, dagen);
}
