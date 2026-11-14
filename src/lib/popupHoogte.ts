// WEEK-285: hoe hoog een popup mag zijn. Op een iPhone in Safari is de zichtbare hoogte kleiner dan het scherm
// (adresbalk en werkbalk); met een percentage viel de knop Bewaren eronder. Daarom een vaste rand van boven en onder.

/** Ruimte boven en onder het venster samen, in pixels. */
export const POPUP_RAND = 24;
/** Nooit kleiner dan dit, zodat titel, één veld en de knoppen er altijd in passen. */
export const POPUP_MIN = 240;

/** De grootste hoogte van het venster bij deze zichtbare schermhoogte. */
export function popupHoogte(schermHoogte: number): number {
  if (!Number.isFinite(schermHoogte) || schermHoogte <= 0) return POPUP_MIN;
  return Math.max(POPUP_MIN, Math.floor(schermHoogte - POPUP_RAND));
}
