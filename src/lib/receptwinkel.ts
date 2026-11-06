// WEEK-219: de winkel van een recept, afgeleid uit de bron-URL. Pure logica; wordt ook door scripts/recepten-naar-sql.mjs gebruikt.
// In de databank staat het resultaat in de kolom recepten.winkel (nog niet getoond in de app).

export type ReceptWinkel = 'ah' | 'delhaize' | 'colruyt';

/** Domein (zonder www.) naar winkel. Subdomeinen tellen mee: bv. "recepten.colruyt.be" is ook Colruyt. */
const DOMEINEN: Record<string, ReceptWinkel> = {
  'ah.be': 'ah',
  'ah.nl': 'ah',
  'delhaize.be': 'delhaize',
  'colruyt.be': 'colruyt',
};

/** Geeft de winkel van een recept volgens zijn bron, of undefined voor andere sites of een ongeldige bron. */
export function winkelVanBron(bron: string | null | undefined): ReceptWinkel | undefined {
  if (!bron) return undefined;
  let host: string;
  try {
    host = new URL(bron).hostname.toLowerCase();
  } catch {
    return undefined;
  }
  for (const [domein, winkel] of Object.entries(DOMEINEN)) {
    if (host === domein || host.endsWith(`.${domein}`)) return winkel;
  }
  return undefined;
}
