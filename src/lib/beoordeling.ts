// Sterren na Gekookt (WEEK-316): een beoordeling van 1 tot 5 sterren per gerecht van de app. Enkel sterren, geen redenen.
// Pure logica: de opslag en het versturen naar de databank staan in src/opslag/beoordelingen.ts.
// De automatische planner gebruikt de sterren niet.

/** Een beoordeling op het toestel. `verstuurd` = al in de databank. */
export type Beoordeling = { receptId: number; sterren: number; op: string; verstuurd: boolean };

/** Het id van een gerecht van de app (`db-123` → 123); undefined voor eigen gerechten van het gezin. */
export function dbReceptId(id: string | undefined): number | undefined {
  const m = /^db-(\d+)$/.exec(id ?? '');
  return m ? Number(m[1]) : undefined;
}

/** Leest de opgeslagen beoordelingen; onbruikbare rijen vallen weg, per gerecht blijft de laatste. */
export function normaliseerBeoordelingen(ruw: unknown): Beoordeling[] {
  if (!Array.isArray(ruw)) return [];
  const per = new Map<number, Beoordeling>();
  for (const r of ruw) {
    const b = r as Partial<Beoordeling> | null;
    if (!b || !Number.isInteger(b.receptId) || !Number.isInteger(b.sterren) || b.sterren! < 1 || b.sterren! > 5) continue;
    per.set(b.receptId!, { receptId: b.receptId!, sterren: b.sterren!, op: typeof b.op === 'string' ? b.op : '', verstuurd: b.verstuurd === true });
  }
  return [...per.values()];
}

/** Zet de sterren van een gerecht (1 tot 5); nog niet verstuurd. */
export function zetSterren(lijst: readonly Beoordeling[], receptId: number, sterren: number, nu: string): Beoordeling[] {
  const s = Math.min(5, Math.max(1, Math.round(sterren)));
  return [...lijst.filter((b) => b.receptId !== receptId), { receptId, sterren: s, op: nu, verstuurd: false }];
}

/** De beoordelingen die nog naar de databank moeten. */
export const teVersturen = (lijst: readonly Beoordeling[]) => lijst.filter((b) => !b.verstuurd);

/** Markeert als verstuurd, maar enkel als de beoordeling sindsdien niet meer veranderde. */
export function markeerVerstuurd(lijst: readonly Beoordeling[], verstuurd: readonly Beoordeling[]): Beoordeling[] {
  const klaar = new Set(verstuurd.map((b) => `${b.receptId}|${b.op}`));
  return lijst.map((b) => (klaar.has(`${b.receptId}|${b.op}`) ? { ...b, verstuurd: true } : b));
}

/**
 * Vragen tot er een score is (afspraak eigenaar): wie op "Later" tikt, krijgt de vraag bij een volgende keer
 * koken opnieuw; wie het gerecht al beoordeelde, niet meer.
 */
export function moetVragen(beoordelingen: readonly Beoordeling[], receptId: number): boolean {
  return !beoordelingen.some((b) => b.receptId === receptId);
}

/** De rij voor de tabel recept_beoordelingen. */
export function naarRij(b: Beoordeling): { recept_id: number; sterren: number; bijgewerkt_op: string } {
  return { recept_id: b.receptId, sterren: b.sterren, bijgewerkt_op: b.op };
}
