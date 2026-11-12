// WEEK-252: de ingrediëntenlijst aanvullen met de databank, enkel bij een nieuwe versie.
// "yuzu" bestaat (nog) niet in de ingebouwde lijst: zo testen we een ingrediënt dat enkel in de databank staat.
import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  afdelingVan,
  dbCodeVanNaam,
  eenheidVan,
  ingredientInfo,
  ingredientNaam,
  INGREDIENT_CODES,
  isIngredient,
  zetIngredientenUitDatabank,
} from '@/data/ingredienten';
import { INGREDIENTEN_DB } from '@/data/ingredienten.gegenereerd';
import { leesIngredientRijen, leesVersies, moetOphalen } from './gegevensVersie';
import { koppelIngredient, verwerkRecept } from './receptLink';

const YUZU = {
  code: 'yuzu',
  categorie: 'fruit',
  eenheid: 'stuk',
  ingredient_vertalingen: [
    { taal: 'nl', naam: 'yuzu' },
    { taal: 'fr', naam: 'yuzu' },
    { taal: 'de', naam: 'Yuzu' },
    { taal: 'en', naam: 'yuzu' },
  ],
};
const AANTAL_INGEBOUWD = Object.keys(INGREDIENTEN_DB).length;

afterEach(() => {
  // Terug naar enkel de ingebouwde lijst, zodat andere tests er niets van merken.
  zetIngredientenUitDatabank({});
});

describe('WEEK-252: moetOphalen', () => {
  test('enkel ophalen als de databank een andere versie heeft dan het toestel', () => {
    assert.equal(moetOphalen(undefined, 3), true);
    assert.equal(moetOphalen(2, 3), true);
    assert.equal(moetOphalen(3, 3), false);
  });
  test('zonder internet (versie onbekend) niets ophalen', () => {
    assert.equal(moetOphalen(undefined, undefined), false);
    assert.equal(moetOphalen(3, undefined), false);
  });
});

describe('WEEK-252: leesVersies', () => {
  test('leest de rijen van data_versie, ook een getal als tekst (bigint)', () => {
    assert.deepEqual(leesVersies([{ naam: 'ingredienten', versie: 4 }, { naam: 'recepten', versie: '12' }]), { ingredienten: 4, recepten: 12 });
  });
  test('onbekende namen en ongeldige versies vallen weg', () => {
    assert.deepEqual(leesVersies([{ naam: 'iets', versie: 1 }, { naam: 'recepten', versie: 'x' }, null]), {});
    assert.deepEqual(leesVersies('geen lijst'), {});
  });
});

describe('WEEK-252: leesIngredientRijen', () => {
  test('een volledig ingrediënt wordt [categorie, eenheid, [nl, fr, de, en]]', () => {
    assert.deepEqual(leesIngredientRijen([YUZU]), { yuzu: ['fruit', 'stuk', ['yuzu', 'yuzu', 'Yuzu', 'yuzu']] });
  });
  test('zonder alle 4 de namen, zonder eenheid of met een vreemde code: weggelaten', () => {
    const zonderDuits = { ...YUZU, ingredient_vertalingen: YUZU.ingredient_vertalingen.filter((v) => v.taal !== 'de') };
    assert.deepEqual(leesIngredientRijen([zonderDuits]), {});
    assert.deepEqual(leesIngredientRijen([{ ...YUZU, eenheid: '' }]), {});
    assert.deepEqual(leesIngredientRijen([{ ...YUZU, code: 'Yuzu Fruit' }]), {});
    assert.deepEqual(leesIngredientRijen([{ ...YUZU, code: '<script>' }]), {});
    assert.deepEqual(leesIngredientRijen('geen lijst'), {});
  });
  test('code met accent (zoals maïs in de ingebouwde lijst) mag', () => {
    assert.ok(leesIngredientRijen([{ ...YUZU, code: 'maïs' }])['maïs']);
  });
});

describe('WEEK-252: de lijst aanvullen met de databank', () => {
  test('een nieuw ingrediënt is daarna gekend: naam, eenheid, winkelafdeling', () => {
    assert.equal(isIngredient('yuzu'), false);
    const nieuw = zetIngredientenUitDatabank(leesIngredientRijen([YUZU]));
    assert.equal(nieuw, 1);
    assert.equal(isIngredient('yuzu'), true);
    assert.equal(ingredientNaam('yuzu', 'de'), 'Yuzu');
    assert.equal(eenheidVan('yuzu'), 'stuk');
    assert.equal(afdelingVan('yuzu'), 'groenten-fruit');
    assert.equal(dbCodeVanNaam('Yuzu'), 'yuzu');
    assert.equal(INGREDIENT_CODES.length, AANTAL_INGEBOUWD + 1);
    assert.equal(INGREDIENT_CODES.at(-1), 'yuzu');
  });

  test('het inlezen van een recept (link of foto) herkent het nieuwe ingrediënt meteen', () => {
    assert.equal(koppelIngredient('verse yuzu', ['nl']), undefined);
    zetIngredientenUitDatabank(leesIngredientRijen([YUZU]));
    assert.deepEqual(koppelIngredient('verse yuzu', ['nl']), { code: 'yuzu', zeker: true });
    const r = verwerkRecept({ naam: 'X', personen: 2, ingredienten: ['2 yuzu'], stappen: [] }, 'nl');
    assert.deepEqual(r.ingredienten.map((i) => [i.code, i.hoeveelheid, i.eenheid]), [['yuzu', 1, 'stuk']]);
  });

  test('de databank wint bij een bestaande code (bv. een verbeterde vertaling)', () => {
    const [cat, eenheid, namen] = INGREDIENTEN_DB.witlof;
    zetIngredientenUitDatabank({ witlof: [cat, eenheid, [namen[0], 'chicon', namen[2], namen[3]]] });
    assert.equal(ingredientNaam('witlof', 'fr'), 'chicon');
    assert.equal(INGREDIENT_CODES.length, AANTAL_INGEBOUWD);
  });

  test('regressie: zonder databank blijft de ingebouwde lijst exact zoals ze was', () => {
    zetIngredientenUitDatabank(leesIngredientRijen([YUZU]));
    zetIngredientenUitDatabank({});
    assert.equal(isIngredient('yuzu'), false);
    assert.equal(INGREDIENT_CODES.length, AANTAL_INGEBOUWD);
    assert.deepEqual(INGREDIENT_CODES, Object.keys(INGREDIENTEN_DB));
    assert.deepEqual(ingredientInfo('witlof'), INGREDIENTEN_DB.witlof);
    assert.equal(ingredientNaam('witlof', 'fr'), 'endive');
  });

  test('een onbekende code geeft geen fout: naam = code, eenheid gram, afdeling droge voeding', () => {
    assert.equal(ingredientNaam('bestaat_niet', 'nl'), 'bestaat_niet');
    assert.equal(eenheidVan('bestaat_niet'), 'g');
    assert.equal(afdelingVan('bestaat_niet'), 'droge-voeding');
  });
});
