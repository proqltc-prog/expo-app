// Lokale receptenbank: gebruikt als er geen AI-planner beschikbaar is (of als die faalt).
// Hoeveelheden zijn per volwassen portie. Namen in volgorde: nl, fr, de, en, es, pt.
import type { IngredientCode } from './ingredienten';

export type Soort = 'vegetarisch' | 'vis' | 'vlees';
export type StijlCode = 'klassiek' | 'italiaans' | 'aziatisch' | 'mexicaans' | 'mediterraan' | 'thais' | 'japans' | 'koreaans';
export type Basis = 'pasta' | 'rijst' | 'aardappel' | 'brood' | 'wrap' | 'noedels' | 'granen';
export type Eenheid = 'g' | 'ml' | 'stuk' | 'teentje';
/** Wanneer het recept gegeten wordt. De app plant enkel avondeten (WEEK-189). */
export type Moment = 'avond';
export const MOMENTEN: readonly Moment[] = ['avond'];

// Stijlen van de receptenbank. 'licht' en 'comfort' zijn verwijderd (WEEK-78), ook in de database.
export const STIJLEN: StijlCode[] = ['klassiek', 'italiaans', 'aziatisch', 'mexicaans', 'mediterraan', 'thais', 'japans', 'koreaans'];

export type BankRecept = {
  id: string;
  namen: readonly [string, string, string, string];
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
    namen: ['Pasta pesto met broccoli', 'Pâtes au pesto et brocoli', 'Pasta mit Pesto und Brokkoli', 'Pesto pasta with broccoli'],
    ingredienten: [['pasta', 100, 'g'], ['pesto', 40, 'g'], ['broccoli', 0.5, 'stuk'], ['kaas_parmezaan', 15, 'g']],
  },
  {
    id: 'omelet', soort: 'vegetarisch', minuten: 15, stijlen: ['klassiek'], basis: 'brood',
    namen: ['Omelet met groenten en brood', 'Omelette aux légumes et pain', 'Gemüseomelett mit Brot', 'Vegetable omelette with bread'],
    ingredienten: [['eieren', 2, 'stuk'], ['paprika', 0.5, 'stuk'], ['champignons', 60, 'g'], ['brood', 80, 'g']],
  },
  {
    id: 'linzencurry', soort: 'vegetarisch', minuten: 30, stijlen: ['aziatisch'], basis: 'rijst',
    namen: ['Linzencurry met rijst', 'Curry de lentilles et riz', 'Linsencurry mit Reis', 'Lentil curry with rice'],
    ingredienten: [['linzen', 70, 'g'], ['kokosmelk', 100, 'ml'], ['currypasta', 15, 'g'], ['rijst', 75, 'g'], ['spinazie', 60, 'g']],
  },
  {
    id: 'groentesoep', soort: 'vegetarisch', minuten: 30, stijlen: ['klassiek'], basis: 'brood',
    namen: ['Groentesoep met kaasboterhammen', 'Soupe de légumes et tartines au fromage', 'Gemüsesuppe mit Käsebroten', 'Vegetable soup with cheese sandwiches'],
    ingredienten: [['soepgroenten', 200, 'g'], ['bouillonblokje', 0.5, 'stuk'], ['brood', 100, 'g'], ['kaas_geraspt', 30, 'g']],
  },
  {
    id: 'wok-noedels', soort: 'vegetarisch', minuten: 20, stijlen: ['aziatisch'], basis: 'noedels',
    namen: ['Noedels met wokgroenten en ei', 'Nouilles sautées aux légumes et œuf', 'Gebratene Nudeln mit Gemüse und Ei', 'Stir-fried noodles with vegetables and egg'],
    ingredienten: [['noedels', 90, 'g'], ['wokgroenten', 200, 'g'], ['sojasaus', 15, 'ml'], ['eieren', 1, 'stuk']],
  },
  {
    id: 'veggie-chili', soort: 'vegetarisch', minuten: 30, stijlen: ['mexicaans'], basis: 'rijst',
    namen: ['Vegetarische chili met rijst', 'Chili végétarien et riz', 'Vegetarisches Chili mit Reis', 'Vegetarian chilli with rice'],
    ingredienten: [['kidneybonen', 100, 'g'], ['maïs', 50, 'g'], ['tomaat_blokjes', 120, 'g'], ['ui', 0.5, 'stuk'], ['rijst', 75, 'g']],
  },
  {
    id: 'quesadillas', soort: 'vegetarisch', minuten: 15, stijlen: ['mexicaans'], basis: 'wrap',
    namen: ['Quesadilla’s met paprika en maïs', 'Quesadillas au poivron et maïs', 'Quesadillas mit Paprika und Mais', 'Pepper and sweetcorn quesadillas'],
    ingredienten: [['tortilla_wrap', 2, 'stuk'], ['kaas_geraspt', 50, 'g'], ['paprika', 0.5, 'stuk'], ['maïs', 40, 'g']],
  },
  {
    id: 'shakshuka', soort: 'vegetarisch', minuten: 25, stijlen: ['mediterraan'], basis: 'brood',
    namen: ['Shakshuka met brood', 'Chakchouka et pain', 'Shakshuka mit Brot', 'Shakshuka with bread'],
    ingredienten: [['eieren', 2, 'stuk'], ['tomaat_blokjes', 150, 'g'], ['paprika', 0.5, 'stuk'], ['ui', 0.5, 'stuk'], ['brood', 80, 'g']],
  },
  {
    id: 'couscous-feta', soort: 'vegetarisch', minuten: 25, stijlen: ['mediterraan'], basis: 'granen',
    namen: ['Couscous met courgette en feta', 'Couscous à la courgette et feta', 'Couscous mit Zucchini und Feta', 'Couscous with courgette and feta'],
    ingredienten: [['couscous', 70, 'g'], ['courgette', 0.5, 'stuk'], ['feta', 50, 'g'], ['tomaat', 1, 'stuk']],
  },
  {
    id: 'mac-kaas', soort: 'vegetarisch', minuten: 25, stijlen: ['klassiek'], basis: 'pasta',
    namen: ['Macaroni met kaassaus en broccoli', 'Macaronis sauce fromage et brocoli', 'Makkaroni mit Käsesauce und Brokkoli', 'Macaroni cheese with broccoli'],
    ingredienten: [['macaroni', 100, 'g'], ['kaas_geraspt', 50, 'g'], ['melk', 100, 'ml'], ['broccoli', 0.5, 'stuk']],
  },
  {
    id: 'groentelasagne', soort: 'vegetarisch', minuten: 60, stijlen: ['italiaans'], basis: 'pasta',
    namen: ['Groentelasagne met spinazie', 'Lasagne aux légumes et épinards', 'Gemüselasagne mit Spinat', 'Vegetable and spinach lasagne'],
    ingredienten: [['lasagnebladen', 80, 'g'], ['courgette', 0.5, 'stuk'], ['spinazie', 60, 'g'], ['kaas_geraspt', 40, 'g'], ['tomaat_blokjes', 120, 'g']],
  },
  // ── vis ──
  {
    id: 'zalm-krieltjes', soort: 'vis', minuten: 30, stijlen: ['klassiek'], basis: 'aardappel',
    namen: ['Zalm uit de oven met krieltjes', 'Saumon au four et grenailles', 'Ofenlachs mit Drillingen', 'Oven-baked salmon with baby potatoes'],
    ingredienten: [['zalm', 125, 'g'], ['krieltjes', 200, 'g'], ['sperziebonen', 100, 'g'], ['citroen', 0.25, 'stuk']],
  },
  {
    id: 'vissticks-puree', soort: 'vis', minuten: 25, stijlen: ['klassiek'], basis: 'aardappel',
    namen: ['Vissticks met puree en wortelen', 'Bâtonnets de poisson, purée et carottes', 'Fischstäbchen mit Püree und Karotten', 'Fish fingers with mash and carrots'],
    ingredienten: [['vissticks', 4, 'stuk'], ['aardappel', 200, 'g'], ['melk', 50, 'ml'], ['wortel', 1.5, 'stuk']],
  },
  {
    id: 'pasta-tonijn', soort: 'vis', minuten: 20, stijlen: ['italiaans'], basis: 'pasta',
    namen: ['Pasta met tonijn en tomatensaus', 'Pâtes au thon et sauce tomate', 'Pasta mit Thunfisch und Tomatensauce', 'Tuna and tomato pasta'],
    ingredienten: [['pasta', 100, 'g'], ['tonijn_blik', 50, 'g'], ['tomaat_blokjes', 120, 'g'], ['ui', 0.5, 'stuk']],
  },
  {
    id: 'kabeljauw-teriyaki', soort: 'vis', minuten: 20, stijlen: ['aziatisch'], basis: 'rijst',
    namen: ['Kabeljauw teriyaki met rijst', 'Cabillaud teriyaki et riz', 'Kabeljau Teriyaki mit Reis', 'Teriyaki cod with rice'],
    ingredienten: [['kabeljauw', 125, 'g'], ['rijst', 75, 'g'], ['teriyakisaus', 20, 'ml'], ['wokgroenten', 150, 'g']],
  },
  {
    id: 'vistacos', soort: 'vis', minuten: 20, stijlen: ['mexicaans'], basis: 'wrap',
    namen: ['Vistaco’s met limoen', 'Tacos de poisson au citron vert', 'Fisch-Tacos mit Limette', 'Fish tacos with lime'],
    ingredienten: [['witvis', 110, 'g'], ['tortilla_wrap', 2, 'stuk'], ['sla', 0.5, 'stuk'], ['limoen', 0.25, 'stuk'], ['tomaat', 0.5, 'stuk']],
  },
  {
    id: 'scampi-spaghetti', soort: 'vis', minuten: 20, stijlen: ['mediterraan', 'italiaans'], basis: 'pasta',
    namen: ['Spaghetti met scampi en look', 'Spaghetti aux scampis et à l’ail', 'Spaghetti mit Garnelen und Knoblauch', 'Garlic prawn spaghetti'],
    ingredienten: [['scampi', 100, 'g'], ['pasta_spaghetti', 100, 'g'], ['knoflook', 1, 'teentje'], ['tomaat', 1, 'stuk']],
  },
  {
    id: 'vispannetje', soort: 'vis', minuten: 35, stijlen: ['klassiek'], basis: 'aardappel',
    namen: ['Vispannetje met prei en puree', 'Gratin de poisson aux poireaux et purée', 'Fischpfanne mit Lauch und Püree', 'Fish and leek bake with mash'],
    ingredienten: [['witvis', 125, 'g'], ['prei', 0.5, 'stuk'], ['room', 50, 'ml'], ['aardappel', 200, 'g']],
  },
  {
    id: 'paella', soort: 'vis', minuten: 50, stijlen: ['mediterraan'], basis: 'rijst',
    namen: ['Paella met zeevruchten', 'Paella aux fruits de mer', 'Meeresfrüchte-Paella', 'Seafood paella'],
    ingredienten: [['rijst', 80, 'g'], ['scampi', 80, 'g'], ['witvis', 60, 'g'], ['paprika', 0.5, 'stuk'], ['doperwten', 50, 'g']],
  },
  // ── vlees ──
  {
    id: 'kip-rijst', soort: 'vlees', minuten: 25, stijlen: ['klassiek'], basis: 'rijst',
    namen: ['Kip met rijst en paprika', 'Poulet, riz et poivron', 'Hähnchen mit Reis und Paprika', 'Chicken with rice and peppers'],
    ingredienten: [['kipfilet', 125, 'g'], ['rijst', 75, 'g'], ['paprika', 0.5, 'stuk'], ['ui', 0.5, 'stuk']],
  },
  {
    id: 'bolognaise', soort: 'vlees', minuten: 30, stijlen: ['italiaans'], basis: 'pasta',
    namen: ['Spaghetti bolognaise', 'Spaghetti bolognaise', 'Spaghetti Bolognese', 'Spaghetti bolognese'],
    ingredienten: [['pasta_spaghetti', 100, 'g'], ['gehakt', 100, 'g'], ['tomaat_blokjes', 120, 'g'], ['wortel', 0.5, 'stuk'], ['ui', 0.5, 'stuk']],
  },
  {
    id: 'stoemp-worst', soort: 'vlees', minuten: 30, stijlen: ['klassiek'], basis: 'aardappel',
    namen: ['Stoemp met worst', 'Stoemp et saucisse', 'Stoemp mit Wurst', 'Stoemp with sausage'],
    ingredienten: [['aardappel', 250, 'g'], ['wortel', 2, 'stuk'], ['worst', 1, 'stuk'], ['boter', 10, 'g']],
  },
  {
    id: 'balletjes-tomatensaus', soort: 'vlees', minuten: 40, stijlen: ['klassiek'], basis: 'aardappel',
    namen: ['Balletjes in tomatensaus met frietjes uit de oven', 'Boulettes sauce tomate et frites au four', 'Fleischbällchen in Tomatensauce mit Ofenpommes', 'Meatballs in tomato sauce with oven chips'],
    ingredienten: [['gehakt', 100, 'g'], ['tomaat_blokjes', 150, 'g'], ['ui', 0.5, 'stuk'], ['aardappel', 250, 'g']],
  },
  {
    id: 'kipcurry', soort: 'vlees', minuten: 25, stijlen: ['aziatisch'], basis: 'rijst',
    namen: ['Kipcurry met kokosmelk en rijst', 'Curry de poulet au lait de coco et riz', 'Hähnchencurry mit Kokosmilch und Reis', 'Chicken coconut curry with rice'],
    ingredienten: [['kipfilet', 120, 'g'], ['kokosmelk', 100, 'ml'], ['currypasta', 15, 'g'], ['rijst', 75, 'g']],
  },
  {
    id: 'kip-fajitas', soort: 'vlees', minuten: 20, stijlen: ['mexicaans'], basis: 'wrap',
    namen: ['Kip-fajita’s', 'Fajitas au poulet', 'Hähnchen-Fajitas', 'Chicken fajitas'],
    ingredienten: [['kipfilet', 110, 'g'], ['tortilla_wrap', 2, 'stuk'], ['paprika', 0.5, 'stuk'], ['ui', 0.5, 'stuk']],
  },
  {
    id: 'stoverij', soort: 'vlees', minuten: 150, stijlen: ['klassiek'], basis: 'aardappel',
    namen: ['Vlaamse stoverij met frietjes', 'Carbonnade flamande et frites', 'Flämischer Rindfleischeintopf mit Pommes', 'Flemish beef stew with chips'],
    ingredienten: [['rundvlees', 150, 'g'], ['ui', 0.5, 'stuk'], ['bier', 100, 'ml'], ['aardappel', 250, 'g']],
  },
  {
    id: 'lasagne', soort: 'vlees', minuten: 60, stijlen: ['italiaans'], basis: 'pasta',
    namen: ['Lasagne', 'Lasagne', 'Lasagne', 'Lasagne'],
    ingredienten: [['lasagnebladen', 80, 'g'], ['gehakt', 100, 'g'], ['tomaat_blokjes', 120, 'g'], ['kaas_geraspt', 40, 'g'], ['melk', 100, 'ml']],
  },
  {
    id: 'kip-ovenschotel', soort: 'vlees', minuten: 45, stijlen: ['mediterraan'], basis: 'aardappel',
    namen: ['Kip uit de oven met mediterrane groenten', 'Poulet au four et légumes méditerranéens', 'Ofenhähnchen mit mediterranem Gemüse', 'Roast chicken with Mediterranean vegetables'],
    ingredienten: [['kipdijen', 150, 'g'], ['courgette', 0.5, 'stuk'], ['paprika', 0.5, 'stuk'], ['krieltjes', 200, 'g']],
  },
  {
    id: 'hachis-parmentier', soort: 'vlees', minuten: 50, stijlen: ['klassiek'], basis: 'aardappel',
    namen: ['Hachis parmentier', 'Hachis parmentier', 'Hackfleisch-Kartoffelauflauf', 'Cottage pie'],
    ingredienten: [['gehakt', 100, 'g'], ['aardappel', 250, 'g'], ['wortel', 1, 'stuk'], ['melk', 50, 'ml']],
  },
  // ── avond (kipwrap en pastasalade waren middagrecepten, WEEK-189) ──
  {
    id: 'kipwrap', soort: 'vlees', minuten: 15, stijlen: ['mexicaans'], basis: 'wrap',
    namen: ['Kipwrap met sla en tomaat', 'Wrap au poulet, laitue et tomate', 'Hähnchen-Wrap mit Salat und Tomate', 'Chicken wrap with lettuce and tomato'],
    ingredienten: [['kipfilet', 100, 'g'], ['tortilla_wrap', 1, 'stuk'], ['sla', 0.5, 'stuk'], ['tomaat', 0.5, 'stuk'], ['kaas_geraspt', 20, 'g']],
  },
  {
    id: 'pastasalade', soort: 'vegetarisch', minuten: 20, stijlen: ['mediterraan'], basis: 'pasta',
    namen: ['Pastasalade met feta', 'Salade de pâtes à la feta', 'Nudelsalat mit Feta', 'Pasta salad with feta'],
    ingredienten: [['pasta', 100, 'g'], ['tomaat', 0.5, 'stuk'], ['feta', 40, 'g'], ['komkommer', 0.5, 'stuk']],
  },
  // ── thais (WEEK-86) ──
  {
    id: 'thais-kip-curry', soort: 'vlees', minuten: 25, stijlen: ['thais'], basis: 'rijst',
    namen: ['Thaise kipcurry met rijst', 'Curry thaï au poulet et riz', 'Thailändisches Hühner-Curry mit Reis', 'Thai chicken curry with rice'],
    ingredienten: [['kipfilet', 150, 'g'], ['kokosmelk', 200, 'ml'], ['currypasta', 20, 'g'], ['rijst', 75, 'g'], ['paprika', 0.5, 'stuk']],
  },
  {
    id: 'thais-wok-noedels', soort: 'vegetarisch', minuten: 20, stijlen: ['thais'], basis: 'noedels',
    namen: ['Thaise woknoedels met groenten', 'Nouilles sautées thaïes aux légumes', 'Thailändische Wok-Nudeln mit Gemüse', 'Thai stir-fried noodles with vegetables'],
    ingredienten: [['noedels', 100, 'g'], ['wokgroenten', 200, 'g'], ['sojasaus', 15, 'ml'], ['limoen', 0.5, 'stuk']],
  },
  {
    id: 'thais-zalm-curry', soort: 'vis', minuten: 30, stijlen: ['thais'], basis: 'rijst',
    namen: ['Thaise zalmcurry met spinazie', 'Curry thaï de saumon aux épinards', 'Thailändisches Lachs-Curry mit Spinat', 'Thai salmon curry with spinach'],
    ingredienten: [['witvis', 150, 'g'], ['kokosmelk', 200, 'ml'], ['currypasta', 20, 'g'], ['rijst', 75, 'g'], ['spinazie', 60, 'g']],
  },
  // ── japans (WEEK-86) ──
  {
    id: 'japans-teriyaki-kip', soort: 'vlees', minuten: 25, stijlen: ['japans'], basis: 'rijst',
    namen: ['Teriyaki-kip met rijst en wok', 'Poulet teriyaki au riz et wok', 'Teriyaki-Hähnchen mit Reis und Wok', 'Teriyaki chicken with rice and wok vegetables'],
    ingredienten: [['kipfilet', 150, 'g'], ['teriyakisaus', 30, 'ml'], ['rijst', 75, 'g'], ['wokgroenten', 150, 'g']],
  },
  {
    id: 'japans-zalm-teriyaki', soort: 'vis', minuten: 20, stijlen: ['japans'], basis: 'rijst',
    namen: ['Teriyaki-zalm met rijst en komkommer', 'Saumon teriyaki au riz et concombre', 'Teriyaki-Lachs mit Reis und Gurke', 'Teriyaki salmon with rice and cucumber'],
    ingredienten: [['witvis', 150, 'g'], ['teriyakisaus', 30, 'ml'], ['rijst', 75, 'g'], ['komkommer', 0.5, 'stuk']],
  },
  {
    id: 'japans-yakisoba', soort: 'vegetarisch', minuten: 20, stijlen: ['japans'], basis: 'noedels',
    namen: ['Yakisoba met wokgroenten', 'Yakisoba aux légumes sautés', 'Yakisoba mit Wokgemüse', 'Yakisoba with stir-fried vegetables'],
    ingredienten: [['noedels', 120, 'g'], ['wokgroenten', 200, 'g'], ['sojasaus', 20, 'ml'], ['ui', 0.5, 'stuk']],
  },
  // ── koreaans (WEEK-86) ──
  {
    id: 'koreaans-bulgogi-kip', soort: 'vlees', minuten: 25, stijlen: ['koreaans'], basis: 'rijst',
    namen: ['Bulgogi-kip met rijst', 'Bulgogi de poulet au riz', 'Bulgogi-Hähnchen mit Reis', 'Bulgogi chicken with rice'],
    ingredienten: [['kipfilet', 150, 'g'], ['sojasaus', 30, 'ml'], ['knoflook', 1, 'teentje'], ['rijst', 75, 'g'], ['wokgroenten', 150, 'g']],
  },
  {
    id: 'koreaans-bibimbap', soort: 'vegetarisch', minuten: 25, stijlen: ['koreaans'], basis: 'rijst',
    namen: ['Bibimbap met groenten en ei', 'Bibimbap aux légumes et œuf', 'Bibimbap mit Gemüse und Ei', 'Bibimbap with vegetables and egg'],
    ingredienten: [['rijst', 75, 'g'], ['eieren', 1, 'stuk'], ['wokgroenten', 150, 'g'], ['komkommer', 0.5, 'stuk']],
  },
  {
    id: 'koreaans-zalm-rijst', soort: 'vis', minuten: 20, stijlen: ['koreaans'], basis: 'rijst',
    namen: ['Koreaanse zalm met rijst en komkommer', 'Saumon coréen au riz et concombre', 'Koreanischer Lachs mit Reis und Gurke', 'Korean salmon with rice and cucumber'],
    ingredienten: [['witvis', 150, 'g'], ['sojasaus', 20, 'ml'], ['knoflook', 1, 'teentje'], ['rijst', 75, 'g'], ['komkommer', 0.5, 'stuk']],
  },
  // ── testrecepten (WEEK-179): originele gerechten in de stijl van snelle, eerlijke keuken ──
  {
    id: 'risotto-champignons', soort: 'vegetarisch', minuten: 30, stijlen: ['italiaans'], basis: 'rijst',
    namen: ['Risotto met champignons en parmezaan', 'Risotto aux champignons et parmesan', 'Risotto mit Champignons und Parmesan', 'Mushroom risotto with Parmesan'],
    ingredienten: [['rijst', 90, 'g'], ['champignons', 120, 'g'], ['ui', 0.5, 'stuk'], ['knoflook', 1, 'teentje'], ['bouillonblokje', 300, 'ml'], ['kaas_parmezaan', 25, 'g'], ['boter', 10, 'g']],
  },
  {
    id: 'zalm-citroenboter', soort: 'vis', minuten: 25, stijlen: ['klassiek'], basis: 'granen',
    namen: ['Zalm met citroenboter, spinazie en couscous', 'Saumon au beurre citronné, épinards et couscous', 'Lachs mit Zitronenbutter, Spinat und Couscous', 'Salmon with lemon butter, spinach and couscous'],
    ingredienten: [['zalm', 150, 'g'], ['spinazie', 120, 'g'], ['couscous', 80, 'g'], ['boter', 15, 'g'], ['citroen', 0.5, 'stuk'], ['knoflook', 1, 'teentje']],
  },
  {
    id: 'gevulde-courgette', soort: 'vlees', minuten: 40, stijlen: ['mediterraan'], basis: 'rijst',
    namen: ['Gevulde courgette met gehakt en feta', 'Courgettes farcies à la viande hachée et feta', 'Gefüllte Zucchini mit Hackfleisch und Feta', 'Stuffed courgette with minced meat and feta'],
    ingredienten: [['courgette', 1, 'stuk'], ['gehakt', 150, 'g'], ['tomaat', 1, 'stuk'], ['ui', 0.5, 'stuk'], ['knoflook', 1, 'teentje'], ['feta', 40, 'g'], ['rijst', 60, 'g']],
  },
  {
    id: 'kipfilet-citroen', soort: 'vlees', minuten: 40, stijlen: ['klassiek'], basis: 'aardappel',
    namen: ['Kipfilet met citroen, look en krieltjes', 'Filet de poulet au citron, à l’ail et aux pommes de terre grenaille', 'Hähnchenbrust mit Zitrone, Knoblauch und Drillingen', 'Chicken breast with lemon, garlic and baby potatoes'],
    ingredienten: [['kipfilet', 150, 'g'], ['krieltjes', 200, 'g'], ['citroen', 0.5, 'stuk'], ['knoflook', 1, 'teentje'], ['boter', 10, 'g']],
  },
  {
    id: 'cacio-e-pepe', soort: 'vegetarisch', minuten: 15, stijlen: ['italiaans'], basis: 'pasta',
    namen: ['Cacio e pepe met spaghetti', 'Cacio e pepe aux spaghettis', 'Cacio e pepe mit Spaghetti', 'Cacio e pepe with spaghetti'],
    ingredienten: [['pasta_spaghetti', 100, 'g'], ['kaas_parmezaan', 50, 'g'], ['boter', 10, 'g']],
  },
];
