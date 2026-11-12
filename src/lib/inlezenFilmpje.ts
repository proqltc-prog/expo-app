// WEEK-280: een reclamefilmpje vóór elke inlezing van een recept (link of foto) in de app, om de kost van Gemini te dekken.
// Pure logica: wat het filmpje opleverde, en of het inlezen dan mag doorgaan.

/** De uitkomst van één beloond filmpje. */
export type FilmpjeUitkomst = 'bekeken' | 'afgebroken' | 'niet_beschikbaar';

/**
 * Mag het inlezen doorgaan na het filmpje?
 * - bekeken: ja.
 * - niet beschikbaar (website, geen internet, geen toestemming voor reclame, geen filmpje van Google): ja, de gebruiker
 *   wordt nooit geblokkeerd door iets waar hij niets aan kan doen.
 * - afgebroken (zelf vroegtijdig gesloten): nee.
 */
export function magInlezenNaFilmpje(uitkomst: FilmpjeUitkomst): boolean {
  return uitkomst !== 'afgebroken';
}
