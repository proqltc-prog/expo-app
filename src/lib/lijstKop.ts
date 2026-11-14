// WEEK-286: de kop van de boodschappenlijst en In huis, compact voor de smartphone.
import type { Sheet } from '@/lib/frigoSheets';
import type { Weergave } from '@/lib/lijst';

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

/** Zoeken en toevoegen staan standaard ingeklapt achter een icoon, zodat de producten de meeste plaats krijgen. */
export const ZOEKEN_STANDAARD_OPEN = false;
