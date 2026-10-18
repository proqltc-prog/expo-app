// Bereidingsstappen per maaltijd (WEEK-81). Pure logica, zonder opslag of React.
import { BEREIDINGEN } from '@/data/bereidingen';
import { RECEPTENBANK } from '@/data/receptenbank';
import type { Taal } from '@/i18n';
import type { EigenRecept } from '@/lib/eigenrecepten';

/**
 * De bereidingsstappen van een maaltijd, of null als er geen bekend zijn (bv. een AI-recept).
 * Volgorde: een eigen recept op id, dan op naam; daarna de receptenbank op id, dan op naam in elke taal.
 * Ingebouwde recepten vallen terug op Nederlands als een taal ontbreekt.
 */
export function bereidingVoor(recept: { id: string; naam: string }, eigen: readonly EigenRecept[], taal: Taal): string[] | null {
  const eigenRecept = eigen.find((e) => e.id === recept.id) ?? eigen.find((e) => e.naam === recept.naam);
  if (eigenRecept) return eigenRecept.stappen.length ? [...eigenRecept.stappen] : null;

  const bank = RECEPTENBANK.find((r) => r.id === recept.id) ?? RECEPTENBANK.find((r) => r.namen.includes(recept.naam));
  if (!bank) return null;
  const stappen = BEREIDINGEN[bank.id]?.[taal] ?? BEREIDINGEN[bank.id]?.nl;
  return stappen && stappen.length ? [...stappen] : null;
}
