// Landenkleuren voor de stijlen in het weekmenu (WEEK-68, goedgekeurd thema 18 oktober).
// Elke stijl krijgt de kleuren van het land als streep en tint. Geen app-kleuren: alleen als accent op de stijlkaarten.
export type Landenkleuren = readonly [string, string, string];

const NEUTRAAL: Landenkleuren = ['#A9472A', '#E8C98A', '#F8F8F4'];

const LANDEN: Record<string, Landenkleuren> = {
  mediterraan: ['#1F5FA8', '#FFFFFF', '#E8C98A'],
  chinees: ['#C8102E', '#F2B63C', '#8F0A1F'],
  indiaas: ['#FF9933', '#FFFFFF', '#138808'],
  frans: ['#002395', '#FFFFFF', '#ED2939'],
  mexicaans: ['#006847', '#FFFFFF', '#CE1126'],
  italiaans: ['#008C45', '#FFFFFF', '#CD212A'],
  koreaans: ['#003478', '#C60C30', '#17201A'],
  thais: ['#2D2A4A', '#FFFFFF', '#A51931'],
  japans: ['#FFFFFF', '#BC002D', '#17201A'],
  belgisch: ['#17201A', '#FAE042', '#ED2939'],
  hartig: NEUTRAAL,
  zoet: NEUTRAAL,
};

/** De drie kleuren van een stijl. Onbekende stijlen krijgen de neutrale kleuren. */
export function landenkleuren(stijl: string): Landenkleuren {
  return LANDEN[stijl] ?? NEUTRAAL;
}
