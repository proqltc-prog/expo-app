// Lokale receptenbank: gebruikt als er geen AI-planner beschikbaar is (of als die faalt).
// Hoeveelheden zijn per volwassen portie. Namen in volgorde: nl, fr, de, en, es, pt.
import type { IngredientCode } from './ingredienten';

export type Soort = 'vegetarisch' | 'vis' | 'vlees';
export type StijlCode = 'klassiek' | 'italiaans' | 'aziatisch' | 'mexicaans' | 'mediterraan';
export type Basis = 'pasta' | 'rijst' | 'aardappel' | 'brood' | 'wrap' | 'noedels' | 'granen';
export type Eenheid = 'g' | 'ml' | 'stuk' | 'teentje';
/** Wanneer het recept gegeten wordt (WEEK-43). Zonder moment geldt avond. */
export type Moment = 'ontbijt' | 'middag' | 'avond';
export const MOMENTEN: readonly Moment[] = ['ontbijt', 'middag', 'avond'];

// Stijlen van de receptenbank. 'licht' en 'comfort' zijn verwijderd (WEEK-78), ook in de database.
export const STIJLEN: StijlCode[] = ['klassiek', 'italiaans', 'aziatisch', 'mexicaans', 'mediterraan'];

export type BankRecept = {
  id: string;
  namen: readonly [string, string, string, string, string, string];
  soort: Soort;
  minuten: number;
  stijlen: readonly StijlCode[];
  basis: Basis;
  ingredienten: readonly (readonly [IngredientCode, number, Eenheid])[];
  /** Zonder moment geldt het recept voor avond. */
  moment?: Moment;
};

export const RECEPTENBANK: readonly BankRecept[] = [
  // ── vegetarisch ──
  {
    id: 'pasta-pesto', soort: 'vegetarisch', minuten: 20, stijlen: ['italiaans'], basis: 'pasta',
    namen: ['Pasta pesto met broccoli', 'Pâtes au pesto et brocoli', 'Pasta mit Pesto und Brokkoli', 'Pesto pasta with broccoli', 'Pasta al pesto con brócoli', 'Massa com pesto e brócolos'],
    ingredienten: [['pasta', 100, 'g'], ['pesto', 40, 'g'], ['broccoli', 100, 'g'], ['parmezaan', 15, 'g']],
  },
  {
    id: 'omelet', soort: 'vegetarisch', minuten: 15, stijlen: ['klassiek'], basis: 'brood',
    namen: ['Omelet met groenten en brood', 'Omelette aux légumes et pain', 'Gemüseomelett mit Brot', 'Vegetable omelette with bread', 'Tortilla francesa con verduras y pan', 'Omelete de legumes com pão'],
    ingredienten: [['eieren', 2, 'stuk'], ['paprika', 0.5, 'stuk'], ['champignons', 60, 'g'], ['brood', 80, 'g']],
  },
  {
    id: 'linzencurry', soort: 'vegetarisch', minuten: 30, stijlen: ['aziatisch'], basis: 'rijst',
    namen: ['Linzencurry met rijst', 'Curry de lentilles et riz', 'Linsencurry mit Reis', 'Lentil curry with rice', 'Curry de lentejas con arroz', 'Caril de lentilhas com arroz'],
    ingredienten: [['rode-linzen', 70, 'g'], ['kokosmelk', 100, 'ml'], ['currypasta', 15, 'g'], ['rijst', 75, 'g'], ['spinazie', 60, 'g']],
  },
  {
    id: 'groentesoep', soort: 'vegetarisch', minuten: 30, stijlen: ['klassiek'], basis: 'brood',
    namen: ['Groentesoep met kaasboterhammen', 'Soupe de légumes et tartines au fromage', 'Gemüsesuppe mit Käsebroten', 'Vegetable soup with cheese sandwiches', 'Sopa de verduras con bocadillos de queso', 'Sopa de legumes com sandes de queijo'],
    ingredienten: [['soepgroenten', 200, 'g'], ['bouillon', 0.5, 'stuk'], ['brood', 100, 'g'], ['kaas', 30, 'g']],
  },
  {
    id: 'wok-noedels', soort: 'vegetarisch', minuten: 20, stijlen: ['aziatisch'], basis: 'noedels',
    namen: ['Noedels met wokgroenten en ei', 'Nouilles sautées aux légumes et œuf', 'Gebratene Nudeln mit Gemüse und Ei', 'Stir-fried noodles with vegetables and egg', 'Fideos salteados con verduras y huevo', 'Noodles salteados com legumes e ovo'],
    ingredienten: [['noedels', 90, 'g'], ['wokgroenten', 200, 'g'], ['sojasaus', 15, 'ml'], ['eieren', 1, 'stuk']],
  },
  {
    id: 'veggie-chili', soort: 'vegetarisch', minuten: 30, stijlen: ['mexicaans'], basis: 'rijst',
    namen: ['Vegetarische chili met rijst', 'Chili végétarien et riz', 'Vegetarisches Chili mit Reis', 'Vegetarian chilli with rice', 'Chili vegetariano con arroz', 'Chili vegetariano com arroz'],
    ingredienten: [['kidneybonen', 100, 'g'], ['mais', 50, 'g'], ['tomatenblokjes', 120, 'g'], ['ui', 0.5, 'stuk'], ['rijst', 75, 'g']],
  },
  {
    id: 'quesadillas', soort: 'vegetarisch', minuten: 15, stijlen: ['mexicaans'], basis: 'wrap',
    namen: ['Quesadilla’s met paprika en maïs', 'Quesadillas au poivron et maïs', 'Quesadillas mit Paprika und Mais', 'Pepper and sweetcorn quesadillas', 'Quesadillas de pimiento y maíz', 'Quesadillas de pimento e milho'],
    ingredienten: [['tortillas', 2, 'stuk'], ['kaas', 50, 'g'], ['paprika', 0.5, 'stuk'], ['mais', 40, 'g']],
  },
  {
    id: 'shakshuka', soort: 'vegetarisch', minuten: 25, stijlen: ['mediterraan'], basis: 'brood',
    namen: ['Shakshuka met brood', 'Chakchouka et pain', 'Shakshuka mit Brot', 'Shakshuka with bread', 'Shakshuka con pan', 'Shakshuka com pão'],
    ingredienten: [['eieren', 2, 'stuk'], ['tomatenblokjes', 150, 'g'], ['paprika', 0.5, 'stuk'], ['ui', 0.5, 'stuk'], ['brood', 80, 'g']],
  },
  {
    id: 'couscous-feta', soort: 'vegetarisch', minuten: 25, stijlen: ['mediterraan'], basis: 'granen',
    namen: ['Couscous met courgette en feta', 'Couscous à la courgette et feta', 'Couscous mit Zucchini und Feta', 'Couscous with courgette and feta', 'Cuscús con calabacín y feta', 'Cuscuz com curgete e feta'],
    ingredienten: [['couscous', 70, 'g'], ['courgette', 100, 'g'], ['feta', 50, 'g'], ['tomaten', 1, 'stuk']],
  },
  {
    id: 'mac-kaas', soort: 'vegetarisch', minuten: 25, stijlen: ['klassiek'], basis: 'pasta',
    namen: ['Macaroni met kaassaus en broccoli', 'Macaronis sauce fromage et brocoli', 'Makkaroni mit Käsesauce und Brokkoli', 'Macaroni cheese with broccoli', 'Macarrones con salsa de queso y brócoli', 'Macarrão com molho de queijo e brócolos'],
    ingredienten: [['macaroni', 100, 'g'], ['kaas', 50, 'g'], ['melk', 100, 'ml'], ['broccoli', 80, 'g']],
  },
  {
    id: 'groentelasagne', soort: 'vegetarisch', minuten: 60, stijlen: ['italiaans'], basis: 'pasta',
    namen: ['Groentelasagne met spinazie', 'Lasagne aux légumes et épinards', 'Gemüselasagne mit Spinat', 'Vegetable and spinach lasagne', 'Lasaña de verduras y espinacas', 'Lasanha de legumes e espinafres'],
    ingredienten: [['lasagnevellen', 80, 'g'], ['courgette', 100, 'g'], ['spinazie', 60, 'g'], ['kaas', 40, 'g'], ['tomatenblokjes', 120, 'g']],
  },
  // ── vis ──
  {
    id: 'zalm-krieltjes', soort: 'vis', minuten: 30, stijlen: ['klassiek'], basis: 'aardappel',
    namen: ['Zalm uit de oven met krieltjes', 'Saumon au four et grenailles', 'Ofenlachs mit Drillingen', 'Oven-baked salmon with baby potatoes', 'Salmón al horno con patatas baby', 'Salmão no forno com batatas pequenas'],
    ingredienten: [['zalmfilet', 125, 'g'], ['krieltjes', 200, 'g'], ['sperziebonen', 100, 'g'], ['citroen', 0.25, 'stuk']],
  },
  {
    id: 'vissticks-puree', soort: 'vis', minuten: 25, stijlen: ['klassiek'], basis: 'aardappel',
    namen: ['Vissticks met puree en wortelen', 'Bâtonnets de poisson, purée et carottes', 'Fischstäbchen mit Püree und Karotten', 'Fish fingers with mash and carrots', 'Palitos de pescado con puré y zanahorias', 'Douradinhos com puré e cenouras'],
    ingredienten: [['vissticks', 4, 'stuk'], ['aardappelen', 200, 'g'], ['melk', 50, 'ml'], ['wortelen', 100, 'g']],
  },
  {
    id: 'pasta-tonijn', soort: 'vis', minuten: 20, stijlen: ['italiaans'], basis: 'pasta',
    namen: ['Pasta met tonijn en tomatensaus', 'Pâtes au thon et sauce tomate', 'Pasta mit Thunfisch und Tomatensauce', 'Tuna and tomato pasta', 'Pasta con atún y tomate', 'Massa com atum e tomate'],
    ingredienten: [['pasta', 100, 'g'], ['tonijn', 50, 'g'], ['tomatenblokjes', 120, 'g'], ['ui', 0.5, 'stuk']],
  },
  {
    id: 'kabeljauw-teriyaki', soort: 'vis', minuten: 20, stijlen: ['aziatisch'], basis: 'rijst',
    namen: ['Kabeljauw teriyaki met rijst', 'Cabillaud teriyaki et riz', 'Kabeljau Teriyaki mit Reis', 'Teriyaki cod with rice', 'Bacalao teriyaki con arroz', 'Bacalhau teriyaki com arroz'],
    ingredienten: [['kabeljauw', 125, 'g'], ['rijst', 75, 'g'], ['teriyakisaus', 20, 'ml'], ['wokgroenten', 150, 'g']],
  },
  {
    id: 'vistacos', soort: 'vis', minuten: 20, stijlen: ['mexicaans'], basis: 'wrap',
    namen: ['Vistaco’s met limoen', 'Tacos de poisson au citron vert', 'Fisch-Tacos mit Limette', 'Fish tacos with lime', 'Tacos de pescado con lima', 'Tacos de peixe com lima'],
    ingredienten: [['witvis', 110, 'g'], ['tortillas', 2, 'stuk'], ['sla', 30, 'g'], ['limoen', 0.25, 'stuk'], ['tomaten', 0.5, 'stuk']],
  },
  {
    id: 'scampi-spaghetti', soort: 'vis', minuten: 20, stijlen: ['mediterraan', 'italiaans'], basis: 'pasta',
    namen: ['Spaghetti met scampi en look', 'Spaghetti aux scampis et à l’ail', 'Spaghetti mit Garnelen und Knoblauch', 'Garlic prawn spaghetti', 'Espaguetis con langostinos al ajillo', 'Esparguete com camarão e alho'],
    ingredienten: [['scampi', 100, 'g'], ['spaghetti', 100, 'g'], ['look', 1, 'teentje'], ['tomaten', 1, 'stuk']],
  },
  {
    id: 'vispannetje', soort: 'vis', minuten: 35, stijlen: ['klassiek'], basis: 'aardappel',
    namen: ['Vispannetje met prei en puree', 'Gratin de poisson aux poireaux et purée', 'Fischpfanne mit Lauch und Püree', 'Fish and leek bake with mash', 'Cazuela de pescado con puerro y puré', 'Peixe com alho-francês e puré'],
    ingredienten: [['witvis', 125, 'g'], ['prei', 80, 'g'], ['room', 50, 'ml'], ['aardappelen', 200, 'g']],
  },
  {
    id: 'paella', soort: 'vis', minuten: 50, stijlen: ['mediterraan'], basis: 'rijst',
    namen: ['Paella met zeevruchten', 'Paella aux fruits de mer', 'Meeresfrüchte-Paella', 'Seafood paella', 'Paella de marisco', 'Paelha de marisco'],
    ingredienten: [['rijst', 80, 'g'], ['scampi', 80, 'g'], ['witvis', 60, 'g'], ['paprika', 0.5, 'stuk'], ['erwten', 50, 'g']],
  },
  // ── vlees ──
  {
    id: 'kip-rijst', soort: 'vlees', minuten: 25, stijlen: ['klassiek'], basis: 'rijst',
    namen: ['Kip met rijst en paprika', 'Poulet, riz et poivron', 'Hähnchen mit Reis und Paprika', 'Chicken with rice and peppers', 'Pollo con arroz y pimiento', 'Frango com arroz e pimento'],
    ingredienten: [['kipfilet', 125, 'g'], ['rijst', 75, 'g'], ['paprika', 0.5, 'stuk'], ['ui', 0.5, 'stuk']],
  },
  {
    id: 'bolognaise', soort: 'vlees', minuten: 30, stijlen: ['italiaans'], basis: 'pasta',
    namen: ['Spaghetti bolognaise', 'Spaghetti bolognaise', 'Spaghetti Bolognese', 'Spaghetti bolognese', 'Espaguetis a la boloñesa', 'Esparguete à bolonhesa'],
    ingredienten: [['spaghetti', 100, 'g'], ['gehakt', 100, 'g'], ['tomatenblokjes', 120, 'g'], ['wortelen', 50, 'g'], ['ui', 0.5, 'stuk']],
  },
  {
    id: 'stoemp-worst', soort: 'vlees', minuten: 30, stijlen: ['klassiek'], basis: 'aardappel',
    namen: ['Stoemp met worst', 'Stoemp et saucisse', 'Stoemp mit Wurst', 'Stoemp with sausage', 'Stoemp con salchicha', 'Stoemp com salsicha'],
    ingredienten: [['aardappelen', 250, 'g'], ['wortelen', 150, 'g'], ['worsten', 1, 'stuk'], ['boter', 10, 'g']],
  },
  {
    id: 'balletjes-tomatensaus', soort: 'vlees', minuten: 40, stijlen: ['klassiek'], basis: 'aardappel',
    namen: ['Balletjes in tomatensaus met frietjes uit de oven', 'Boulettes sauce tomate et frites au four', 'Fleischbällchen in Tomatensauce mit Ofenpommes', 'Meatballs in tomato sauce with oven chips', 'Albóndigas en salsa de tomate con patatas al horno', 'Almôndegas com molho de tomate e batatas no forno'],
    ingredienten: [['gehakt', 100, 'g'], ['tomatenblokjes', 150, 'g'], ['ui', 0.5, 'stuk'], ['aardappelen', 250, 'g']],
  },
  {
    id: 'kipcurry', soort: 'vlees', minuten: 25, stijlen: ['aziatisch'], basis: 'rijst',
    namen: ['Kipcurry met kokosmelk en rijst', 'Curry de poulet au lait de coco et riz', 'Hähnchencurry mit Kokosmilch und Reis', 'Chicken coconut curry with rice', 'Curry de pollo con leche de coco y arroz', 'Caril de frango com leite de coco e arroz'],
    ingredienten: [['kipfilet', 120, 'g'], ['kokosmelk', 100, 'ml'], ['currypasta', 15, 'g'], ['rijst', 75, 'g']],
  },
  {
    id: 'kip-fajitas', soort: 'vlees', minuten: 20, stijlen: ['mexicaans'], basis: 'wrap',
    namen: ['Kip-fajita’s', 'Fajitas au poulet', 'Hähnchen-Fajitas', 'Chicken fajitas', 'Fajitas de pollo', 'Fajitas de frango'],
    ingredienten: [['kipfilet', 110, 'g'], ['tortillas', 2, 'stuk'], ['paprika', 0.5, 'stuk'], ['ui', 0.5, 'stuk']],
  },
  {
    id: 'stoverij', soort: 'vlees', minuten: 150, stijlen: ['klassiek'], basis: 'aardappel',
    namen: ['Vlaamse stoverij met frietjes', 'Carbonnade flamande et frites', 'Flämischer Rindfleischeintopf mit Pommes', 'Flemish beef stew with chips', 'Estofado flamenco con patatas fritas', 'Guisado flamengo com batatas fritas'],
    ingredienten: [['rundvlees', 150, 'g'], ['ui', 0.5, 'stuk'], ['bruin-bier', 100, 'ml'], ['aardappelen', 250, 'g']],
  },
  {
    id: 'lasagne', soort: 'vlees', minuten: 60, stijlen: ['italiaans'], basis: 'pasta',
    namen: ['Lasagne', 'Lasagne', 'Lasagne', 'Lasagne', 'Lasaña', 'Lasanha'],
    ingredienten: [['lasagnevellen', 80, 'g'], ['gehakt', 100, 'g'], ['tomatenblokjes', 120, 'g'], ['kaas', 40, 'g'], ['melk', 100, 'ml']],
  },
  {
    id: 'kip-ovenschotel', soort: 'vlees', minuten: 45, stijlen: ['mediterraan'], basis: 'aardappel',
    namen: ['Kip uit de oven met mediterrane groenten', 'Poulet au four et légumes méditerranéens', 'Ofenhähnchen mit mediterranem Gemüse', 'Roast chicken with Mediterranean vegetables', 'Pollo al horno con verduras mediterráneas', 'Frango no forno com legumes mediterrânicos'],
    ingredienten: [['kippendijen', 150, 'g'], ['courgette', 100, 'g'], ['paprika', 0.5, 'stuk'], ['krieltjes', 200, 'g']],
  },
  {
    id: 'hachis-parmentier', soort: 'vlees', minuten: 50, stijlen: ['klassiek'], basis: 'aardappel',
    namen: ['Hachis parmentier', 'Hachis parmentier', 'Hackfleisch-Kartoffelauflauf', 'Cottage pie', 'Pastel de carne y puré', 'Empadão de carne'],
    ingredienten: [['gehakt', 100, 'g'], ['aardappelen', 250, 'g'], ['wortelen', 80, 'g'], ['melk', 50, 'ml']],
  },
  // ── ontbijt (WEEK-43) ──
  {
    id: 'havermout-fruit', soort: 'vegetarisch', minuten: 10, stijlen: ['klassiek'], basis: 'granen', moment: 'ontbijt',
    namen: ['Havermout met fruit', 'Flocons d’avoine aux fruits', 'Haferflocken mit Obst', 'Oatmeal with fruit', 'Avena con fruta', 'Aveia com fruta'],
    ingredienten: [['havermout', 60, 'g'], ['melk', 150, 'ml'], ['fruit', 100, 'g'], ['honing', 10, 'ml']],
  },
  {
    id: 'yoghurt-muesli', soort: 'vegetarisch', minuten: 5, stijlen: ['klassiek'], basis: 'granen', moment: 'ontbijt',
    namen: ['Yoghurt met muesli en fruit', 'Yaourt, muesli et fruits', 'Joghurt mit Müsli und Obst', 'Yogurt with muesli and fruit', 'Yogur con muesli y fruta', 'Iogurte com muesli e fruta'],
    ingredienten: [['yoghurt', 150, 'g'], ['muesli', 50, 'g'], ['fruit', 100, 'g']],
  },
  {
    id: 'boterham-kaas', soort: 'vegetarisch', minuten: 5, stijlen: ['klassiek'], basis: 'brood', moment: 'ontbijt',
    namen: ['Boterhammen met kaas en komkommer', 'Tartines au fromage et concombre', 'Brote mit Käse und Gurke', 'Sandwiches with cheese and cucumber', 'Bocadillos de queso y pepino', 'Sandes de queijo e pepino'],
    ingredienten: [['brood', 100, 'g'], ['kaas', 30, 'g'], ['komkommer', 0.5, 'stuk']],
  },
  {
    id: 'avocado-ei', soort: 'vegetarisch', minuten: 15, stijlen: ['mediterraan'], basis: 'brood', moment: 'ontbijt',
    namen: ['Avocadotoast met ei', 'Toast à l’avocat et œuf', 'Avocado-Toast mit Ei', 'Avocado toast with egg', 'Tostada de aguacate y huevo', 'Torrada de abacate e ovo'],
    ingredienten: [['brood', 80, 'g'], ['avocado', 0.5, 'stuk'], ['eieren', 1, 'stuk']],
  },
  // ── middag (WEEK-43) ──
  {
    id: 'tonijnsalade', soort: 'vis', minuten: 10, stijlen: ['mediterraan'], basis: 'brood', moment: 'middag',
    namen: ['Tonijnsalade op brood', 'Salade au thon sur pain', 'Thunfischsalat auf Brot', 'Tuna salad on bread', 'Ensalada de atún con pan', 'Salada de atum com pão'],
    ingredienten: [['tonijn', 80, 'g'], ['sla', 50, 'g'], ['tomaten', 0.5, 'stuk'], ['brood', 80, 'g']],
  },
  {
    id: 'kipwrap', soort: 'vlees', minuten: 15, stijlen: ['mexicaans'], basis: 'wrap', moment: 'middag',
    namen: ['Kipwrap met sla en tomaat', 'Wrap au poulet, laitue et tomate', 'Hähnchen-Wrap mit Salat und Tomate', 'Chicken wrap with lettuce and tomato', 'Wrap de pollo con lechuga y tomate', 'Wrap de frango com alface e tomate'],
    ingredienten: [['kipfilet', 100, 'g'], ['tortillas', 1, 'stuk'], ['sla', 40, 'g'], ['tomaten', 0.5, 'stuk'], ['kaas', 20, 'g']],
  },
  {
    id: 'pastasalade', soort: 'vegetarisch', minuten: 20, stijlen: ['mediterraan'], basis: 'pasta', moment: 'middag',
    namen: ['Pastasalade met feta', 'Salade de pâtes à la feta', 'Nudelsalat mit Feta', 'Pasta salad with feta', 'Ensalada de pasta con feta', 'Salada de massa com feta'],
    ingredienten: [['pasta', 100, 'g'], ['tomaten', 0.5, 'stuk'], ['feta', 40, 'g'], ['komkommer', 0.5, 'stuk']],
  },
  {
    id: 'eiersalade-brood', soort: 'vegetarisch', minuten: 15, stijlen: ['klassiek'], basis: 'brood', moment: 'middag',
    namen: ['Eiersalade op brood', 'Salade d’œufs sur pain', 'Eiersalat auf Brot', 'Egg salad on bread', 'Ensalada de huevo sobre pan', 'Salada de ovo em pão'],
    ingredienten: [['eieren', 2, 'stuk'], ['sla', 40, 'g'], ['brood', 100, 'g'], ['komkommer', 0.5, 'stuk']],
  },
];
