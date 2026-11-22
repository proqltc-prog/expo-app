// WEEK-324: het privacybeleid online (GitHub Pages, repository famenu-privacy).
// Google Play eist dat je vanuit de app kan vragen om je account en gegevens te laten verwijderen.
import type { Taal } from '@/i18n';

export const PRIVACY_URL = 'https://proqltc-prog.github.io/famenu-privacy/';

/** De link naar "Account en gegevens laten verwijderen": de Nederlandse uitleg, of de Engelse voor de andere talen. */
export function verwijderUrl(taal: Taal): string {
  return `${PRIVACY_URL}#${taal === 'nl' ? 'verwijderen' : 'delete'}`;
}
