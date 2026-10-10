// Gedeeld tussen de app en de server-functie (supabase/functions/plan-week).
// Bewust zonder imports, zodat de Deno-functie dit bestand rechtstreeks kan gebruiken.

export type AiTaal = 'nl' | 'fr' | 'de' | 'en' | 'es' | 'pt';

/** Wat de app naar de server stuurt. */
export type AiVerzoek = {
  taal: AiTaal;
  /** Tekst uit profielContext(): gezin, budget, opmerkingen, woonplaats. */
  profiel: string;
  /** Aantal volwassen porties waarvoor hoeveelheden berekend moeten worden. */
  porties: number;
  opdracht: string;
  kooktijden: string[];
  stijlen: string[];
  /** Dagcodes (zondag…zaterdag) waarvoor een recept nodig is. */
  dagen: string[];
  /** Recepten die al in het plan staan en niet herhaald mogen worden (bv. bij een reset van één dag). */
  vermijd?: string[];
  /** Wat al in huis is, het oudste eerst, bv. "spinazie (200 g, 5 days)" (WEEK-12). */
  frigo?: string[];
};

/**
 * Standaardmodel van de server-functie (WEEK-32): het goedkoopste Claude-model.
 * Een ander model kiezen kan met het secret PLANNER_MODEL in Supabase.
 */
export const STANDAARD_MODEL = 'claude-haiku-5-5';

export const TAALNAAM: Record<AiTaal, string> = {
  nl: 'Dutch (as spoken in Flanders, Belgium)',
  fr: 'French (as spoken in Belgium)',
  de: 'German',
  en: 'English',
  es: 'Spanish',
  pt: 'Portuguese (European)',
};

export const AFDELINGEN_AI = [
  'groenten-fruit', 'vlees-vis', 'zuivel-eieren', 'brood', 'droge-voeding', 'conserven-sauzen', 'diepvries', 'dranken',
] as const;

export const STIJLEN_AI = ['klassiek', 'italiaans', 'aziatisch', 'mexicaans', 'mediterraan', 'comfort', 'licht'] as const;

/** JSON-schema van het antwoord; gebruikt als tool-definitie zodat het model geldige JSON teruggeeft. */
export const WEEKPLAN_SCHEMA = {
  type: 'object',
  properties: {
    dagen: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dag: { type: 'string', enum: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'] },
          recept: {
            type: 'object',
            properties: {
              naam: { type: 'string', description: 'Recipe name in the requested language' },
              soort: { type: 'string', enum: ['vlees', 'vegetarisch', 'vis'] },
              minuten: { type: 'integer', description: 'Total cooking time in minutes' },
              stijlen: { type: 'array', items: { type: 'string', enum: [...STIJLEN_AI] } },
              ingredienten: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    naam: { type: 'string', description: 'Ingredient name in the requested language' },
                    hoeveelheid: { type: 'number', description: 'Total quantity for the whole household' },
                    eenheid: { type: 'string', description: 'g, ml, stuk (pieces) or teentje (garlic clove)' },
                    afdeling: { type: 'string', enum: [...AFDELINGEN_AI] },
                  },
                  required: ['naam', 'hoeveelheid', 'eenheid', 'afdeling'],
                },
              },
            },
            required: ['naam', 'soort', 'minuten', 'stijlen', 'ingredienten'],
          },
        },
        required: ['dag', 'recept'],
      },
    },
  },
  required: ['dagen'],
} as const;

export function systeemPrompt(): string {
  return [
    'You plan healthy, varied family dinners for a weekly meal planning app.',
    'Always answer by calling the "weekplan" tool exactly once.',
    'Rules:',
    '- Write every recipe name and ingredient name in the requested language. Keep the JSON keys and enum codes exactly as defined.',
    '- Plan exactly one dinner for each requested day code, in the given order.',
    '- Respect the household profile and the user request. "No meat" or "no fish" are hard rules.',
    '- If cooking times are selected, every dinner must fit one of them: snel = at most 20 min, gemiddeld = 21–40 min, uitgebreid = more than 40 min.',
    '- If styles are selected, every dinner should have at least one of them.',
    '- Vary the week: no repeated recipe, not the same base (pasta, rice, potatoes, bread, wraps, noodles) on two consecutive days.',
    '- Quantities are the total for the whole household (the given number of adult portions; children are already counted as smaller portions). Use g, ml, stuk or teentje, rounded to amounts you can buy.',
    '- Use ingredients available in a normal Belgian supermarket (e.g. Colruyt, Delhaize, Aldi, Lidl). Keep it realistic for a weeknight.',
    '- Never repeat a recipe listed under "avoid".',
    '- Ingredients already at home are listed under "In the fridge", oldest first. Use them first so nothing is wasted: the dinner of the first requested day must use the oldest ones. Do not plan more of them than needed.',
  ].join('\n');
}

export function gebruikersBericht(v: AiVerzoek): string {
  const regels = [
    `Language: ${TAALNAAM[v.taal]}`,
    `Days: ${v.dagen.join(', ')}`,
    `Household (adult portions: ${v.porties}):`,
    v.profiel || '(no profile given)',
    `Cooking time: ${v.kooktijden.length ? v.kooktijden.join(', ') : 'any'}`,
    `Styles: ${v.stijlen.length ? v.stijlen.join(', ') : 'any'}`,
    `User request: ${v.opdracht.trim() || '(none – make a balanced, varied week)'}`,
  ];
  if (v.vermijd?.length) regels.push(`Avoid these recipes: ${v.vermijd.join('; ')}`);
  if (v.frigo?.length) regels.push(`In the fridge (oldest first): ${v.frigo.join('; ')}`);
  return regels.join('\n');
}
