// WEEK-298: welke knoppen onder een scanresultaat staan, volgens waar je de scanner opende. Pure logica.
//  - vanaf de boodschappenlijst: de bestaande knoppen van de lijst (afvinken, weigeren …);
//  - vanaf In huis (ook details bij een product dat al in huis staat): Sluiten en Toevoegen;
//  - de pagina Scan zelf: enkel Sluiten.
export type ScanActie = 'sluiten' | 'toevoegen';

export function scanActies(van: string | undefined, item: string | undefined): ScanActie[] | 'lijst' {
  if (van === 'lijst') return 'lijst';
  if (item || van === 'frigo') return ['sluiten', 'toevoegen'];
  return ['sluiten'];
}
