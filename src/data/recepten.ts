export type Soort = 'vegetarisch' | 'vis' | 'vlees';

export type Recept = {
  id: string;
  naam: string;
  soort: Soort;
  minuten: number;
  ingredienten: string[];
};

// Snelle avondmaaltijden (enkel 's avonds warm). Wordt later vervangen door AI-voorstellen.
export const RECEPTEN: Recept[] = [
  { id: 'v1', naam: 'Pasta pesto met broccoli', soort: 'vegetarisch', minuten: 20, ingredienten: ['pasta', 'pesto', 'broccoli', 'Parmezaanse kaas'] },
  { id: 'v2', naam: 'Omelet met groenten en brood', soort: 'vegetarisch', minuten: 15, ingredienten: ['eieren', 'paprika', 'champignons', 'brood'] },
  { id: 'v3', naam: 'Linzencurry met rijst', soort: 'vegetarisch', minuten: 30, ingredienten: ['rode linzen', 'kokosmelk', 'currypasta', 'rijst', 'spinazie'] },
  { id: 'v4', naam: 'Groentesoep met kaasboterhammen', soort: 'vegetarisch', minuten: 30, ingredienten: ['soepgroenten', 'bouillon', 'brood', 'kaas'] },
  { id: 'f1', naam: 'Zalm uit de oven met krieltjes', soort: 'vis', minuten: 30, ingredienten: ['zalmfilet', 'krieltjes', 'sperziebonen', 'citroen'] },
  { id: 'f2', naam: 'Vissticks met puree en wortelen', soort: 'vis', minuten: 25, ingredienten: ['vissticks', 'aardappelen', 'melk', 'wortelen'] },
  { id: 'f3', naam: 'Pasta met tonijn en tomatensaus', soort: 'vis', minuten: 20, ingredienten: ['pasta', 'tonijn in blik', 'tomatensaus', 'ui'] },
  { id: 'm1', naam: 'Kip met rijst en paprika', soort: 'vlees', minuten: 25, ingredienten: ['kipfilet', 'rijst', 'paprika', 'ui'] },
  { id: 'm2', naam: 'Spaghetti bolognaise', soort: 'vlees', minuten: 30, ingredienten: ['spaghetti', 'gehakt', 'tomatensaus', 'wortel', 'ui'] },
  { id: 'm3', naam: 'Stoemp met worst', soort: 'vlees', minuten: 30, ingredienten: ['aardappelen', 'wortelen', 'worsten', 'boter'] },
];

export const DAGEN = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'] as const;
export type Dag = (typeof DAGEN)[number];

const VOLGORDE: Soort[] = ['vlees', 'vegetarisch', 'vis'];

export type WeekmenuItem = { dag: Dag; recept: Recept };

/** Maakt een weekmenu zondag–vrijdag, afwisselend vlees / vegetarisch / vis. */
export function maakWeekmenu(seed: number = Date.now()): WeekmenuItem[] {
  let s = seed;
  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const gebruikt = new Set<string>();
  return DAGEN.map((dag, i) => {
    const soort = VOLGORDE[i % VOLGORDE.length];
    const opties = RECEPTEN.filter((r) => r.soort === soort && !gebruikt.has(r.id));
    const pool = opties.length ? opties : RECEPTEN.filter((r) => r.soort === soort);
    const recept = pool[Math.floor(random() * pool.length)];
    gebruikt.add(recept.id);
    return { dag, recept };
  });
}

// Vaste items voor ontbijt, middag (boterhammen), school en huishouden.
// Categorie en items zijn codes; de tekst komt uit de vertalingen (categorie.<code>, item.<code>).
export const VASTE_ITEMS = [
  { categorie: 'brood-beleg', items: ['brood', 'boter', 'kaas', 'hesp', 'choco'] },
  { categorie: 'fruit', items: ['appels', 'bananen', 'mandarijnen'] },
  { categorie: 'school', items: ['koekjes', 'drinkbrikjes'] },
  { categorie: 'huishouden', items: ['wc-papier', 'tandpasta'] },
] as const;
