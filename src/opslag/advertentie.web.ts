// Webversie (WEEK-167): de advertentie-SDK bestaat niet in de browser. Op web is er dus geen beloond filmpje;
// de scanner-knop geeft dan gewoon geen extra scans. Expo kiest dit bestand automatisch op web.

/** Op web is er geen beloond filmpje: altijd false, zodat de aanroeper geen beloning geeft. */
export async function bekijkBeloondFilmpje(): Promise<boolean> {
  return false;
}
