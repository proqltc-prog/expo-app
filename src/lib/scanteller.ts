// Scanlimiet (WEEK-34): 3 scans per dag per toestel.
// Later (WEEK-38) kan reclame extra scans vrijmaken.

export const GRATIS_SCANS_PER_DAG = 3;

export type ScanTeller = { dag: string; aantal: number };

/** Kalenderdag volgens de klok van het toestel, bv. "2026-10-11". */
export function dagVan(nu: Date): string {
  const t = (n: number) => String(n).padStart(2, '0');
  return `${nu.getFullYear()}-${t(nu.getMonth() + 1)}-${t(nu.getDate())}`;
}

/** Leest een bewaarde teller; onbruikbaar = nog niets gescand. */
export function leesTeller(ruw: unknown): ScanTeller | null {
  if (!ruw || typeof ruw !== 'object') return null;
  const { dag, aantal } = ruw as Record<string, unknown>;
  if (typeof dag !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dag)) return null;
  if (typeof aantal !== 'number' || !Number.isFinite(aantal) || aantal < 0) return null;
  return { dag, aantal: Math.floor(aantal) };
}

/** Aantal scans vandaag (een teller van een vorige dag telt niet). */
export function scansVandaag(teller: ScanTeller | null, nu: Date): number {
  return teller && teller.dag === dagVan(nu) ? teller.aantal : 0;
}

/** Hoeveel scans er vandaag nog over zijn. */
export function resterendeScans(teller: ScanTeller | null, nu: Date): number {
  return Math.max(0, GRATIS_SCANS_PER_DAG - scansVandaag(teller, nu));
}

export function magScannen(teller: ScanTeller | null, nu: Date): boolean {
  return resterendeScans(teller, nu) > 0;
}

/** Telt één scan; begint opnieuw bij 1 op een nieuwe dag. */
export function telScan(teller: ScanTeller | null, nu: Date): ScanTeller {
  return { dag: dagVan(nu), aantal: scansVandaag(teller, nu) + 1 };
}
