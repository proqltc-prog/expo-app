// Scanlimiet (WEEK-34): 10 scans per dag per toestel (WEEK-51; was 3).
// Reclamefilmpjes (WEEK-38) geven extra scans voor die dag: dat staat in `bonus`.

export const GRATIS_SCANS_PER_DAG = 10;

export type ScanTeller = { dag: string; aantal: number; bonus?: number };

/** Kalenderdag volgens de klok van het toestel, bv. "2026-10-11". */
export function dagVan(nu: Date): string {
  const t = (n: number) => String(n).padStart(2, '0');
  return `${nu.getFullYear()}-${t(nu.getMonth() + 1)}-${t(nu.getDate())}`;
}

/** Minuten tot de volgende middernacht (de reset van de teller), afgerond naar boven (WEEK-51). */
export function minutenTotReset(nu: Date): number {
  const middernacht = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate() + 1, 0, 0, 0);
  return Math.ceil((middernacht.getTime() - nu.getTime()) / 60000);
}

/** Leest een bewaarde teller; onbruikbaar = nog niets gescand. */
export function leesTeller(ruw: unknown): ScanTeller | null {
  if (!ruw || typeof ruw !== 'object') return null;
  const { dag, aantal } = ruw as Record<string, unknown>;
  if (typeof dag !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dag)) return null;
  if (typeof aantal !== 'number' || !Number.isFinite(aantal) || aantal < 0) return null;
  const bonus = typeof ruw === 'object' && 'bonus' in ruw ? (ruw as Record<string, unknown>).bonus : undefined;
  if (typeof bonus === 'number' && Number.isFinite(bonus) && bonus > 0) {
    return { dag, aantal: Math.floor(aantal), bonus: Math.floor(bonus) };
  }
  return { dag, aantal: Math.floor(aantal) };
}

/** Aantal scans vandaag (een teller van een vorige dag telt niet). */
export function scansVandaag(teller: ScanTeller | null, nu: Date): number {
  return teller && teller.dag === dagVan(nu) ? teller.aantal : 0;
}

/** Extra scans die vandaag via reclamefilmpjes zijn vrijgemaakt. */
export function bonusVandaag(teller: ScanTeller | null, nu: Date): number {
  return teller && teller.dag === dagVan(nu) ? (teller.bonus ?? 0) : 0;
}

/** Hoeveel scans er vandaag nog over zijn (gratis + bonus - gebruikt). */
export function resterendeScans(teller: ScanTeller | null, nu: Date): number {
  return Math.max(0, GRATIS_SCANS_PER_DAG + bonusVandaag(teller, nu) - scansVandaag(teller, nu));
}

export function magScannen(teller: ScanTeller | null, nu: Date): boolean {
  return resterendeScans(teller, nu) > 0;
}

/** Telt één scan; begint opnieuw bij 1 op een nieuwe dag. De bonus van die dag blijft bewaard. */
export function telScan(teller: ScanTeller | null, nu: Date): ScanTeller {
  return voegToe(teller, nu, scansVandaag(teller, nu) + 1);
}

/** Voegt extra scans toe voor vandaag (bv. na een bekeken reclamefilmpje). */
export function voegBonusToe(teller: ScanTeller | null, nu: Date, extra: number): ScanTeller {
  return voegToe(teller, nu, scansVandaag(teller, nu), bonusVandaag(teller, nu) + Math.max(0, Math.floor(extra)));
}

function voegToe(teller: ScanTeller | null, nu: Date, aantal: number, bonus = bonusVandaag(teller, nu)): ScanTeller {
  return { dag: dagVan(nu), aantal, ...(bonus > 0 ? { bonus } : {}) };
}
