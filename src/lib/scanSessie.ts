// WEEK-297: een scan die nog bezig is wanneer de scanner opnieuw opent, mag zijn resultaat niet meer tonen.
// Elke keer dat de scanner opent (of de gebruiker opnieuw begint) start een nieuwe sessie; een antwoord van
// Open Food Facts telt enkel als zijn sessie nog de huidige is.

export type ScanSessie = {
  /** Start een nieuwe sessie; alles wat nog van een vorige sessie bezig is, telt niet meer. */
  nieuw(): number;
  /** Het nummer van de huidige sessie, om mee te geven aan een scan die begint. */
  huidig(): number;
  /** Hoort dit sessienummer nog bij de huidige sessie? */
  actueel(nummer: number): boolean;
};

export function maakScanSessie(): ScanSessie {
  let nummer = 0;
  return {
    nieuw: () => ++nummer,
    huidig: () => nummer,
    actueel: (n) => n === nummer,
  };
}
