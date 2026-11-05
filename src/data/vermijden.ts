// Ingrediënten die de gebruiker wil vermijden (WEEK-41). Per keuze: de codes uit de lokale receptenbank,
// woorden om recepten van de AI en favorieten te herkennen (in de zes talen), en een Engelse omschrijving voor de AI.
// Woorden worden vergeleken zonder accenten en kleine letters. `begin`: het woord begint een woord in de naam;
// `los`: enkel het hele woord (zodat "ham" niet in "hamburger" valt).
import type { IngredientCode } from '@/data/ingredienten';

export const VERMIJDBAAR = ['varkensvlees', 'schaaldieren', 'zuivel', 'vis', 'eieren', 'noten'] as const;
export type Vermijd = (typeof VERMIJDBAAR)[number];

// WEEK-205: databankcodes (één ingrediëntenlijst); de woorden hieronder blijven het vangnet voor namen zonder code.
export const VERMIJD_CODES: Record<Vermijd, readonly IngredientCode[]> = {
  varkensvlees: ['worst', 'rookworst', 'spek', 'hesp', 'guanciale', 'varkensfilet', 'varkensgehakt', 'schouderkarbonade'],
  schaaldieren: ['scampi', 'garnalen', 'garnalenpasta', 'mosselen', 'oestersaus'],
  zuivel: ['kaas_parmezaan', 'kaas_geraspt', 'kaas_gruyere', 'feta', 'melk', 'room', 'boter', 'brie', 'creme_fraiche', 'gorgonzola', 'halloumi', 'kwark', 'mascarpone', 'mozzarella', 'pecorino', 'ricotta', 'roomkaas', 'skyr', 'yoghurt', 'zuivelspread_knoflook', 'zuivelspread_spinazie_avocado'],
  vis: ['zalm', 'gerookte_zalm', 'kabeljauw', 'witvis', 'vissticks', 'tonijn_blik', 'vissaus', 'dashi'],
  eieren: ['eieren'],
  noten: ['amandelen', 'cashewnoten', 'gemengde_noten', 'hazelnoten', 'notenmix', 'pecannoten', 'pistachenoten', 'walnoten', 'pijnboompitten', 'pinda'],
};

export const VERMIJD_WOORDEN: Record<Vermijd, { begin: readonly string[]; los: readonly string[] }> = {
  varkensvlees: {
    begin: ['varken', 'spek', 'pancetta', 'bacon', 'chorizo', 'lardon', 'schwein', 'cerdo', 'porc', 'worst', 'saucis', 'salchich', 'salsich'],
    los: ['ham', 'lard'],
  },
  schaaldieren: {
    begin: ['garnal', 'scampi', 'kreeft', 'krab', 'mossel', 'oester', 'langoust', 'lobster', 'crab', 'mussel', 'oyster', 'shrimp', 'prawn', 'gamba', 'camaron', 'langostin', 'marisc', 'sepia', 'inkt', 'squid', 'calamar'],
    los: [],
  },
  zuivel: {
    begin: ['melk', 'kaas', 'room', 'boter', 'yoghurt', 'yogurt', 'iogurte', 'yaourt', 'feta', 'mozzarella', 'parmez', 'crema', 'creme', 'lait', 'fromage', 'beurre', 'leche', 'queso', 'mantequilla', 'nata', 'milch', 'sahne', 'kase', 'butter', 'cream', 'milk', 'cheese', 'leite', 'queijo', 'manteiga', 'natas', 'skyr', 'ricotta', 'mascarpone'],
    los: [],
  },
  vis: {
    begin: ['vis', 'zalm', 'kabeljauw', 'tonijn', 'forel', 'haring', 'pangasius', 'tilapia', 'pescad', 'salmon', 'bacalao', 'atun', 'peixe', 'cabillaud', 'saumon', 'thon', 'poisson', 'fisch', 'lachs', 'thunfisch', 'cod', 'tuna', 'fish', 'anchov', 'ansjovis'],
    los: [],
  },
  eieren: {
    begin: ['eier', 'egg', 'huevo', 'ovo', 'oeuf', 'omelet'],
    los: ['ei', 'eieren'],
  },
  noten: {
    begin: ['noot', 'noten', 'amandel', 'walnoot', 'hazelnoot', 'pinda', 'cashew', 'pecan', 'pistache', 'pijnboom', 'almond', 'walnut', 'hazelnut', 'peanut', 'nuez', 'nueces', 'almendra', 'cacahuete', 'noz', 'amendoim', 'amendoa', 'nut'],
    los: [],
  },
};

/** Omschrijving in het Engels voor de AI-prompt. */
export const VERMIJD_AI: Record<Vermijd, string> = {
  varkensvlees: 'pork (bacon, ham, pancetta, sausages, lardons)',
  schaaldieren: 'shellfish (prawns, shrimp, mussels, squid, crab)',
  zuivel: 'dairy (milk, cream, butter, cheese, yogurt)',
  vis: 'fish (salmon, cod, tuna, anchovies)',
  eieren: 'eggs',
  noten: 'nuts and peanuts',
};
