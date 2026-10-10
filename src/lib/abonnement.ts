// Betalende versie (WEEK-35/36): een gezin is betalend zolang een abonnement loopt.
// De rijen komen uit de tabel gezin_abonnement (enkel leesbaar voor leden van het gezin).

/** Is er een lopend abonnement op tijdstip `nu`? Onbruikbare rijen tellen niet. */
export function isBetalend(rijen: unknown, nu: Date): boolean {
  if (!Array.isArray(rijen)) return false;
  return rijen.some((r) => {
    const tot = r && typeof r === 'object' ? (r as { betalend_tot?: unknown }).betalend_tot : undefined;
    return typeof tot === 'string' && Date.parse(tot) > nu.getTime();
  });
}
