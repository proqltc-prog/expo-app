// Geschiedenis van de opdrachten voor de weekplanning (WEEK-9).
// Onder het tekstveld staan de laatste 3 opdrachten; aantikken laadt ze in het veld.

export const MAX_OPDRACHTEN = 3;

const vergelijkbaar = (t: string) => t.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

/**
 * Zet een nieuwe opdracht vooraan in de geschiedenis.
 * Lege opdrachten tellen niet; dezelfde opdracht (ongeacht hoofdletters of spaties) staat er maar één keer in.
 */
export function voegOpdrachtToe(geschiedenis: readonly string[], nieuw: string, max = MAX_OPDRACHTEN): string[] {
  const opgeschoond = nieuw.trim().replace(/[ \t]+/g, ' ');
  if (!opgeschoond) return geschiedenis.slice(0, max);
  const sleutel = vergelijkbaar(opgeschoond);
  return [opgeschoond, ...geschiedenis.filter((o) => vergelijkbaar(o) !== sleutel)].slice(0, max);
}

/** Leest bewaarde geschiedenis veilig in. */
export function normaliseerOpdrachten(ruw: unknown, max = MAX_OPDRACHTEN): string[] {
  if (!Array.isArray(ruw)) return [];
  return ruw
    .filter((o): o is string => typeof o === 'string' && o.trim() !== '')
    .reduceRight<string[]>((acc, o) => voegOpdrachtToe(acc, o, max), [])
    .slice(0, max);
}
