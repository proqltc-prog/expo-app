// WEEK-286: de kop van de boodschappenlijst en In huis, compact voor de smartphone.
import type { Sheet } from '@/lib/frigoSheets';
import { opSheet, secties, telRegels, type LijstItem, type Weergave } from '@/lib/lijst';
import type { DagCode } from '@/lib/planner/types';

/** Groeperen per gerecht of per categorie heeft enkel zin bij het weekmenu; andere producten horen bij geen gerecht. */
export function toonGroepering(sheet: Sheet): boolean {
  return sheet === 'planner';
}

/** De groepering die echt gebruikt wordt: andere producten staan altijd per categorie. */
export function weergaveVoorSheet(sheet: Sheet, gekozen: Weergave): Weergave {
  return toonGroepering(sheet) ? gekozen : 'categorie';
}

/** Eén knop wisselt tussen de twee groeperingen. */
export function andereWeergave(w: Weergave): Weergave {
  return w === 'recept' ? 'categorie' : 'recept';
}

/**
 * WEEK-292: wat nog te kopen is, per tabblad en samen. Afgevinkte producten tellen niet mee.
 * Elk tabblad telt zoals het onder elkaar staat (weekmenu volgens de gekozen groepering, andere producten per categorie),
 * zodat de teller op het tabblad klopt met de lijst. "Te kopen" bovenaan is de som van beide tabbladen.
 */
export function teKopen(items: readonly LijstItem[], gekozen: Weergave, dagVolgorde?: readonly DagCode[]): { planner: number; los: number; totaal: number } {
  const planner = telRegels(secties(opSheet(items, 'recept'), weergaveVoorSheet('planner', gekozen), dagVolgorde)).open;
  const los = telRegels(secties(opSheet(items, 'los'), weergaveVoorSheet('los', gekozen), dagVolgorde)).open;
  return { planner, los, totaal: planner + los };
}

/** Zoeken en toevoegen staan standaard ingeklapt achter een icoon, zodat de producten de meeste plaats krijgen. */
export const ZOEKEN_STANDAARD_OPEN = false;
