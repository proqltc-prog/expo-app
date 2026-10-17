// Planmodus "random uit favorieten" (WEEK-14): een week willekeurig samengesteld uit het kookboek.
// Dezelfde regels als bij het gewone plannen:
// - frigo-voorrang: de favoriet die het meest opmaakt van wat (het langst) in huis is, komt op dag 1
// - enkel favorieten die passen bij de harde wensen (geen vlees/vis) en de gekozen kooktijd en stijl
//   (te weinig? dan eerst de stijl en daarna de kooktijd loslaten, met melding)
// - geen herhaling binnen de week en niet hetzelfde als vorige week (te weinig? dan toch, met melding)
import { Favoriet, naarPlanRecept } from '@/lib/favorieten';
import { leesOpdracht, Wensen } from './opdracht';
import { porties as berekenPorties } from './hoeveelheid';
import { dagenVoorPlan, STANDAARD_AANTAL_DAGEN, toeval } from './lokaal';
import { frigoScoreNamen, markeerUitFrigo } from './frigovoorrang';
import { kooktijdVan, PlanDag, PlanVerzoek, Weekplan } from './types';
import { heeftVermijdNaam } from './vermijden';

const klein = (t: string) => t.trim().toLocaleLowerCase();

function magVolgensWensen(f: Favoriet, w: Wensen): boolean {
  return !(w.zonderVlees && f.soort === 'vlees') && !(w.zonderVis && f.soort === 'vis');
}

/** Favorieten die passen bij de wensen en keuzes; versoepelt stijl en daarna kooktijd als er te weinig zijn. */
export function passendeFavorieten(
  favorieten: readonly Favoriet[],
  verzoek: Pick<PlanVerzoek, 'opdracht' | 'kooktijden' | 'stijlen' | 'vermijd'>,
  nodig: number
): { favorieten: Favoriet[]; versoepeld: boolean } {
  const w = leesOpdracht(verzoek.opdracht);
  const toegelaten = favorieten.filter((f) => magVolgensWensen(f, w) && !heeftVermijdNaam(f.ingredienten, verzoek.vermijd ?? []));
  const pastTijd = (f: Favoriet) => !verzoek.kooktijden.length || verzoek.kooktijden.includes(kooktijdVan(f.minuten));
  const pastStijl = (f: Favoriet) => !verzoek.stijlen.length || f.stijlen.some((s) => verzoek.stijlen.includes(s));
  const beide = toegelaten.filter((f) => pastTijd(f) && pastStijl(f));
  if (beide.length >= nodig) return { favorieten: beide, versoepeld: false };
  const aanvulling = [...toegelaten.filter((f) => pastTijd(f) && !beide.includes(f)), ...toegelaten.filter((f) => !pastTijd(f))];
  const samen = [...beide, ...aanvulling.slice(0, Math.max(0, nodig - beide.length))];
  return { favorieten: samen, versoepeld: samen.length > beide.length };
}

function schud<T>(lijst: readonly T[], random: () => number): T[] {
  const a = [...lijst];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Maakt een weekplan uit het kookboek. `vorigPlan` is het plan van vorige week (om herhaling te vermijden).
 * Geeft null als er geen enkele passende favoriet is.
 */
export function planUitFavorieten(
  favorieten: readonly Favoriet[],
  verzoek: PlanVerzoek,
  vorigPlan?: Weekplan | null
): Weekplan | null {
  const w = leesOpdracht(verzoek.opdracht);
  const dagen = dagenVoorPlan(w.aantalDagen ?? STANDAARD_AANTAL_DAGEN);
  const { favorieten: kandidaten, versoepeld } = passendeFavorieten(favorieten, verzoek, dagen.length);
  if (!kandidaten.length) return null;

  const random = toeval(verzoek.seed ?? Date.now());
  const vorigeWeek = new Set((vorigPlan?.dagen ?? []).map((d) => klein(d.recept.naam)));
  const nieuw = schud(kandidaten.filter((f) => !vorigeWeek.has(klein(f.naam))), random);
  const herhaling = schud(kandidaten.filter((f) => vorigeWeek.has(klein(f.naam))), random);
  // Eerst wat vorige week niet op het menu stond; pas als dat op is, ook de rest.
  const rij = [...nieuw, ...herhaling];

  // Frigo-voorrang: uit alle passende favorieten (liefst niet van vorige week) de favoriet
  // die het meest opmaakt van wat in huis is, naar dag 1.
  if (verzoek.frigo?.length) {
    const nu = new Date();
    const score = (f: Favoriet) => frigoScoreNamen(f.ingredienten.map((i) => i.naam), verzoek.frigo!, nu);
    const zoekIn = nieuw.length ? nieuw : herhaling;
    const beste = zoekIn.reduce<Favoriet | undefined>((b, f) => (score(f) > (b ? score(b) : 0) ? f : b), undefined);
    if (beste) rij.unshift(...rij.splice(rij.indexOf(beste), 1));
  }
  const volgorde = rij.slice(0, dagen.length);

  const porties = berekenPorties(verzoek.profiel);
  const planDagen: PlanDag[] = volgorde.map((f, i) => ({ dag: dagen[i], recept: naarPlanRecept(f, porties) }));
  const herhaald = volgorde.some((f) => vorigeWeek.has(klein(f.naam)));
  return {
    dagen: verzoek.frigo?.length ? markeerUitFrigo(planDagen, verzoek.frigo) : planDagen,
    opdracht: verzoek.opdracht,
    kooktijden: verzoek.kooktijden,
    stijlen: verzoek.stijlen,
    ...(verzoek.vermijd?.length ? { vermijd: verzoek.vermijd } : {}),
    taal: verzoek.taal,
    porties,
    bron: 'favorieten',
    gemaaktOp: new Date().toISOString(),
    ...(versoepeld ? { versoepeld: true } : {}),
    ...(herhaald ? { herhaald: true } : {}),
    ...(volgorde.length < dagen.length ? { kort: true } : {}),
  };
}

/**
 * Reset van één dag in een plan uit favorieten: een andere passende favoriet die nog niet in de week staat.
 * Geeft het plan ongewijzigd terug als er geen andere favoriet is.
 */
export function resetDagUitFavorieten(plan: Weekplan, index: number, favorieten: readonly Favoriet[], seed: number = Date.now()): Weekplan {
  const huidig = plan.dagen[index];
  if (!huidig) return plan;
  const inWeek = new Set(plan.dagen.map((d) => klein(d.recept.naam)));
  const { favorieten: passend } = passendeFavorieten(favorieten, plan, 1);
  const opties = passend.filter((f) => !inWeek.has(klein(f.naam)));
  if (!opties.length) return plan;
  const keuze = opties[Math.floor(toeval(seed)() * opties.length)];
  return { ...plan, dagen: plan.dagen.map((d, i) => (i === index ? { dag: d.dag, recept: naarPlanRecept(keuze, plan.porties) } : d)) };
}
