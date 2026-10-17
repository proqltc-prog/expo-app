// Houdbaarheidsdatum van frigo-producten (WEEK-20). Pure logica.
// De datum is altijd een echte datum die de gebruiker invult of van de verpakking overneemt;
// geen datum betekent "niet gekend". Er wordt nooit iets geschat.

/** Vanaf zoveel dagen voor de vervaldatum waarschuwen we. */
export const WAARSCHUW_DAGEN = 3;

export type HoudbaarStatus = 'onbekend' | 'ok' | 'bijnaVerlopen' | 'verlopen';

/** Is dit een opgeslagen datum (yyyy-mm-dd) die echt bestaat? Anders undefined. */
export function isoDatum(waarde: unknown): string | undefined {
  if (typeof waarde !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(waarde)) return undefined;
  return leesDatum(`${waarde.slice(8, 10)}-${waarde.slice(5, 7)}-${waarde.slice(0, 4)}`);
}

/** Leest een datum zoals de gebruiker ze typt (dd-mm-jjjj of dd/mm/jjjj) en geeft yyyy-mm-dd; anders undefined. */
export function leesDatum(tekst: string): string | undefined {
  const m = /^\s*(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\s*$/.exec(tekst);
  if (!m) return undefined;
  const dag = Number(m[1]);
  const maand = Number(m[2]);
  const jaar = Number(m[3]);
  const datum = new Date(Date.UTC(jaar, maand - 1, dag));
  // Controleert ook of de datum bestaat (31-02 wordt geweigerd).
  if (datum.getUTCFullYear() !== jaar || datum.getUTCMonth() !== maand - 1 || datum.getUTCDate() !== dag) return undefined;
  return `${String(jaar).padStart(4, '0')}-${String(maand).padStart(2, '0')}-${String(dag).padStart(2, '0')}`;
}

/** Vandaag als yyyy-mm-dd in de lokale tijd van het toestel. */
export function vandaag(nu: Date): string {
  return `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, '0')}-${String(nu.getDate()).padStart(2, '0')}`;
}

/** Aantal dagen van `van` tot `tot` (beide yyyy-mm-dd). */
export function dagenTussen(van: string, tot: string): number {
  const a = Date.UTC(Number(van.slice(0, 4)), Number(van.slice(5, 7)) - 1, Number(van.slice(8, 10)));
  const b = Date.UTC(Number(tot.slice(0, 4)), Number(tot.slice(5, 7)) - 1, Number(tot.slice(8, 10)));
  return Math.round((b - a) / 86400000);
}

/** De status van een product op dag `nu`. Zonder datum: onbekend. */
export function houdbaarStatus(houdbaarTot: string | undefined, nu: Date): HoudbaarStatus {
  if (!houdbaarTot) return 'onbekend';
  const dagen = dagenTussen(vandaag(nu), houdbaarTot);
  if (dagen < 0) return 'verlopen';
  if (dagen <= WAARSCHUW_DAGEN) return 'bijnaVerlopen';
  return 'ok';
}
