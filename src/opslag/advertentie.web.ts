import type { FilmpjeUitkomst } from '@/lib/inlezenFilmpje';

// Webversie (WEEK-167): de advertentie-SDK bestaat niet in de browser. Op web is er dus geen beloond filmpje;
// de scanner-knop geeft dan gewoon geen extra scans. Expo kiest dit bestand automatisch op web.

/** Op web is er geen beloond filmpje: altijd false, zodat de aanroeper geen beloning geeft. */
export async function bekijkBeloondFilmpje(): Promise<boolean> {
  return false;
}

/** WEEK-280: op de website is er geen filmpje vóór het inlezen; het inlezen gaat gewoon door. */
export async function toonFilmpjeVoorInlezen(): Promise<FilmpjeUitkomst> {
  return 'niet_beschikbaar';
}

/** WEEK-325: op de website is er geen reclame, dus ook geen knop om de toestemming te wijzigen. */
export async function toestemmingKnopNodig(): Promise<boolean> {
  return false;
}

/** WEEK-325: op de website gebeurt er niets (er is geen toestemmingsscherm). */
export async function wijzigToestemming(): Promise<boolean> {
  return false;
}
