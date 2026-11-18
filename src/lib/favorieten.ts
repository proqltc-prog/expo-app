// Favoriete recepten (WEEK-315): een hartje op een recept in Zelf kiezen, gedeeld binnen de gezinsruimte.
// Pure logica: de opslag en de synchronisatie staan in src/opslag/favorieten.ts.
// Enkel een filter in Zelf kiezen; de automatische planner gebruikt de favorieten niet.

/** Een favoriet: het id van het recept (`db-…` voor de databank, het eigen id voor de recepten van het gezin). */
export type Favoriet = { id: string; op: string };

/** Leest de opgeslagen favorieten; onbruikbare of dubbele rijen vallen weg. */
export function normaliseerFavorieten(ruw: unknown): Favoriet[] {
  if (!Array.isArray(ruw)) return [];
  const gezien = new Set<string>();
  const uit: Favoriet[] = [];
  for (const r of ruw) {
    const id = (r as { id?: unknown })?.id;
    if (typeof id !== 'string' || !id.trim() || id.length > 200 || gezien.has(id)) continue;
    gezien.add(id);
    const op = (r as { op?: unknown }).op;
    uit.push({ id, op: typeof op === 'string' ? op : '' });
  }
  return uit;
}

/** Zet een recept aan of uit als favoriet. */
export function wisselFavoriet(lijst: readonly Favoriet[], id: string, nu: string): Favoriet[] {
  return lijst.some((f) => f.id === id) ? lijst.filter((f) => f.id !== id) : [...lijst, { id, op: nu }];
}

/** De ids van de favorieten, om snel na te kijken of een recept een hartje heeft. */
export function favorietIds(lijst: readonly Favoriet[]): Set<string> {
  return new Set(lijst.map((f) => f.id));
}

/** Met de hartjesfilter aan blijven enkel de favorieten over; uit = de lijst blijft zoals ze is. */
export function filterFavorieten<T extends { id: string }>(items: readonly T[], ids: ReadonlySet<string>, enkelFavorieten: boolean): T[] {
  return enkelFavorieten ? items.filter((i) => ids.has(i.id)) : [...items];
}
