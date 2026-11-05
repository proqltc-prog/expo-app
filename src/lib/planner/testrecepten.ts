// Testrecepten (WEEK-208): een kleine, met de hand geschreven set recepten in de vorm van de databank.
// Enkel voor tests; de app zelf haalt alle recepten uit de databank. Geen testbestand (geen `describe`), wel testdata.
// Ingrediëntcodes komen uit de ingrediëntenlijst van de databank (src/data/ingredienten.gegenereerd.ts).
import { INGREDIENTEN_DB } from '@/data/ingredienten.gegenereerd';
import { type IngredientCode, ingredientNaam } from '@/data/ingredienten';
import { TALEN } from '@/i18n';
import type { Gezin } from '@/lib/schaal';
import type { DbIngredient, DbRecept } from './db';
import { type DbPoolRecept, maakDbPool } from './dbplan';

/** Een databankingrediënt met de namen in elke taal uit de ingrediëntenlijst. Hoeveelheden per volwassene. */
export function testIngredient(code: IngredientCode, hoeveelheid: number, eenheid: string): DbIngredient {
  const namen = Object.fromEntries(TALEN.map((taal) => [taal, ingredientNaam(code, taal)]));
  return { code, categorie: INGREDIENTEN_DB[code][0], namen, hoeveelheid, eenheid };
}

const ing = testIngredient;

/**
 * Acht avondrecepten: vegetarisch, vis en vlees, verschillende stijlen en basissen, kooktijden van 15 tot 60 minuten.
 * De ids zijn vast, zodat tests op `db-<id>` kunnen rekenen. Alle recepten gelden het hele jaar (seizoenen leeg).
 */
export const TESTRECEPTEN: readonly DbRecept[] = [
  {
    id: 1, porties: 1, kooktijdMin: 30, moment: 'avond', stijl: 'aziatisch', soort: 'vegetarisch', basis: 'rijst',
    titels: { nl: 'Linzencurry met rijst', fr: 'Curry de lentilles et riz', de: 'Linsencurry mit Reis', en: 'Lentil curry with rice' },
    ingredienten: [ing('linzen', 70, 'g'), ing('kokosmelk', 100, 'ml'), ing('currypasta', 15, 'g'), ing('rijst', 75, 'g'), ing('spinazie', 60, 'g')],
    bereidingen: {
      nl: ['Kook de rijst.', 'Laat de linzen 15 minuten sudderen in de kokosmelk.', 'Roer de spinazie erdoor.'],
      fr: ['Faites cuire le riz.', 'Laissez mijoter les lentilles 15 minutes dans le lait de coco.', 'Incorporez les épinards.'],
      en: ['Cook the rice.', 'Simmer the lentils in the coconut milk for 15 minutes.', 'Stir in the spinach.'],
    },
    seizoenen: [],
  },
  {
    id: 2, porties: 1, kooktijdMin: 15, moment: 'avond', stijl: 'italiaans', soort: 'vegetarisch', basis: 'pasta',
    titels: { nl: 'Cacio e pepe met spaghetti', fr: 'Cacio e pepe aux spaghettis', de: 'Cacio e pepe mit Spaghetti', en: 'Cacio e pepe with spaghetti' },
    ingredienten: [ing('pasta_spaghetti', 100, 'g'), ing('kaas_parmezaan', 50, 'g'), ing('boter', 10, 'g')],
    bereidingen: { nl: ['Kook de spaghetti.', 'Meng met parmezaan, boter en peper.'] },
    seizoenen: [],
  },
  {
    id: 3, porties: 1, kooktijdMin: 25, moment: 'avond', stijl: 'mediterraan', soort: 'vegetarisch', basis: 'granen',
    titels: { nl: 'Couscous met courgette en feta', fr: 'Couscous à la courgette et feta', de: 'Couscous mit Zucchini und Feta', en: 'Couscous with courgette and feta' },
    ingredienten: [ing('couscous', 70, 'g'), ing('courgette', 0.5, 'stuk'), ing('feta', 50, 'g'), ing('tomaat', 1, 'stuk')],
    seizoenen: [],
  },
  {
    id: 4, porties: 1, kooktijdMin: 20, moment: 'avond', stijl: 'italiaans', soort: 'vis', basis: 'pasta',
    titels: { nl: 'Spaghetti met scampi en look', fr: 'Spaghetti aux scampis et à l’ail', de: 'Spaghetti mit Garnelen und Knoblauch', en: 'Garlic prawn spaghetti' },
    ingredienten: [ing('scampi', 100, 'g'), ing('pasta_spaghetti', 100, 'g'), ing('knoflook', 1, 'teentje'), ing('tomaat', 1, 'stuk')],
    seizoenen: [],
  },
  {
    id: 5, porties: 1, kooktijdMin: 35, moment: 'avond', stijl: 'klassiek', soort: 'vis', basis: 'aardappel',
    titels: { nl: 'Vispannetje met prei en puree', fr: 'Gratin de poisson aux poireaux et purée', de: 'Fischpfanne mit Lauch und Püree', en: 'Fish and leek bake with mash' },
    ingredienten: [ing('witvis', 125, 'g'), ing('prei', 0.5, 'stuk'), ing('room', 50, 'ml'), ing('aardappel', 200, 'g')],
    seizoenen: [],
  },
  {
    id: 6, porties: 1, kooktijdMin: 25, moment: 'avond', stijl: 'thais', soort: 'vlees', basis: 'rijst',
    titels: { nl: 'Thaise kipcurry met rijst', fr: 'Curry thaï au poulet et riz', de: 'Thailändisches Hühner-Curry mit Reis', en: 'Thai chicken curry with rice' },
    ingredienten: [ing('kipfilet', 150, 'g'), ing('kokosmelk', 200, 'ml'), ing('currypasta', 20, 'g'), ing('rijst', 75, 'g'), ing('paprika', 0.5, 'stuk')],
    seizoenen: [],
  },
  {
    id: 7, porties: 1, kooktijdMin: 30, moment: 'avond', stijl: 'italiaans', soort: 'vlees', basis: 'pasta',
    titels: { nl: 'Spaghetti bolognaise', fr: 'Spaghetti bolognaise', de: 'Spaghetti Bolognese', en: 'Spaghetti bolognese' },
    ingredienten: [ing('pasta_spaghetti', 100, 'g'), ing('gehakt', 100, 'g'), ing('tomaat', 2, 'stuk'), ing('wortel', 0.5, 'stuk'), ing('ui', 0.5, 'stuk')],
    seizoenen: [],
  },
  {
    id: 8, porties: 1, kooktijdMin: 60, moment: 'avond', stijl: 'klassiek', soort: 'vlees', basis: 'aardappel',
    titels: { nl: 'Kipfilet met citroen, look en krieltjes', fr: 'Filet de poulet au citron, à l’ail et aux grenailles', de: 'Hähnchenbrust mit Zitrone, Knoblauch und Drillingen', en: 'Chicken breast with lemon, garlic and baby potatoes' },
    ingredienten: [ing('kipfilet', 150, 'g'), ing('krieltjes', 200, 'g'), ing('citroen', 0.5, 'stuk'), ing('knoflook', 1, 'teentje'), ing('boter', 10, 'g')],
    seizoenen: [],
  },
];

/** Het testrecept met dit databank-id. */
export function testRecept(id: number): DbRecept {
  const r = TESTRECEPTEN.find((x) => x.id === id);
  if (!r) throw new Error(`geen testrecept met id ${id}`);
  return r;
}

const EEN_VOLWASSENE: Gezin = { volwassenen: 1, kinderen: 0 };

/** De testrecepten als planner-pool, klaar voor planUitDatabase en vervangDbDag. */
export function testPool(taal: 'nl' | 'fr' | 'de' | 'en' = 'nl', gezin: Gezin = EEN_VOLWASSENE): DbPoolRecept[] {
  return maakDbPool([...TESTRECEPTEN], taal, gezin);
}
