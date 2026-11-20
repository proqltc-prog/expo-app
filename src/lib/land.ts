// WEEK-318: het land in het gezinsprofiel in de taal van de app. België wordt altijd vertaald getoond,
// ook als het in een andere taal bewaard werd (bv. "Belgique" van de postcodedienst). Een ander land blijft zoals ingevuld.
import type { Taal } from '@/i18n';

const BELGIE_IN_TAAL: Record<Taal, string> = { nl: 'België', fr: 'Belgique', de: 'Belgien', en: 'Belgium' };
const BELGIE_NAMEN = new Set(['belgie', 'belgique', 'belgien', 'belgium', 'belgio', 'belgica']);

/** Is dit België, in welke taal ook? Ook "België / Belgique / Belgien" van de postcodedienst. */
export function isBelgie(land: string): boolean {
  const delen = land
    .split('/')
    .map((d) => d.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase())
    .filter(Boolean);
  return delen.length > 0 && delen.every((d) => BELGIE_NAMEN.has(d));
}

/** Het land zoals het getoond wordt: België in de taal van de app, een ander land ongewijzigd. */
export function landInTaal(land: string, taal: Taal): string {
  return isBelgie(land) ? BELGIE_IN_TAAL[taal] : land;
}

/** Het land zoals het bewaard wordt: België altijd als "België". */
export function bewaarLand(land: string): string {
  return isBelgie(land) ? BELGIE_IN_TAAL.nl : land;
}
