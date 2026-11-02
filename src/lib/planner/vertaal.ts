// Namen van een weekplan-recept in de gekozen taal (WEEK-154). Pure logica.
// Eén bron van waarheid: de opgeslagen naam blijft de sleutel (zoeken, matchen); deze functies geven alleen de weergave.
import { ingredientNaam, INGREDIENT_CODES, type IngredientCode } from '@/data/ingredienten';
import { RECEPTENBANK } from '@/data/receptenbank';
import { KEUZE_TALEN, keuzeTaal, TALEN, type Taal } from '@/i18n';
import type { PlanDag, PlanIngredient, PlanRecept } from './types';

const isCode = (code: string): code is IngredientCode => (INGREDIENT_CODES as string[]).includes(code);

/** De naam van één ingrediënt in de taal: eerst de vastgelegde naam, dan de vaste code, anders de opgeslagen naam. */
function ingredientIn(ingredient: PlanIngredient, taal: Taal): string {
  const vastgelegd = ingredient.namen?.[taal];
  if (vastgelegd) return vastgelegd;
  if (ingredient.code && isCode(ingredient.code)) return ingredientNaam(ingredient.code, taal);
  return ingredient.naam;
}

/** De ingrediënten van een recept met de namen in de gekozen taal. Hoeveelheden blijven gelijk. */
export function ingredientenInTaal(recept: PlanRecept, taal: Taal): PlanIngredient[] {
  return recept.ingredienten.map((i) => ({ ...i, naam: ingredientIn(i, taal) }));
}

/** Het recept met de titel en de ingrediënten in de gekozen taal. Zonder vertaling blijft de opgeslagen naam staan. */
export function inTaal(recept: PlanRecept, taal: Taal): PlanRecept {
  const bank = RECEPTENBANK.find((r) => r.id === recept.id);
  const bankNaam = bank?.namen[KEUZE_TALEN.indexOf(keuzeTaal(taal))];
  return { ...recept, naam: bankNaam || recept.titels?.[taal] || recept.naam, ingredienten: ingredientenInTaal(recept, taal) };
}

/** Alle dagen van een weekplan met de namen in de gekozen taal. De recept-naam zelf blijft de opgeslagen naam (zie inTaal). */
export function dagenInTaal(dagen: readonly PlanDag[], taal: Taal): PlanDag[] {
  return dagen.map((d) => ({ ...d, recept: { ...d.recept, ingredienten: ingredientenInTaal(d.recept, taal) } }));
}
