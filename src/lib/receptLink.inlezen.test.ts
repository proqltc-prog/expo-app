// WEEK-326: een ingelezen recept (receptkaart, foto) verliest geen ingrediënten meer; tips en weetjes zijn geen stappen.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { koppelIngredient, moetNakijkenMelden, ontleedRegel, schikStappen, verwerkRecept, type RuwRecept } from './receptLink';

const recept = (ingredienten: string[], stappen: string[] = []): RuwRecept => ({ naam: 'Test', personen: 1, taal: 'fr', ingredienten, stappen });

describe('WEEK-326: hoeveelheid achteraan (receptkaarten)', () => {
  test('"Riz basmati 75 g" wordt gelezen als 75 g riz basmati', () => {
    const o = ontleedRegel('Riz basmati 75 g');
    assert.equal(o.hoeveelheid, 75);
    assert.equal(o.bron?.soort, 'g');
    assert.equal(o.naam, 'Riz basmati');
  });
  test('"Gousse d\'ail 1 pièce": de eenheid van de naam (teentje) telt', () => {
    const o = ontleedRegel("Gousse d'ail 1 pièce");
    assert.equal(o.hoeveelheid, 1);
    assert.equal(o.bron?.soort, 'teentje');
    assert.equal(o.naam, 'ail');
  });
  test('"Cube de bouillon ¼ pièce": breuk achteraan', () => {
    const o = ontleedRegel('Cube de bouillon ¼ pièce');
    assert.equal(o.hoeveelheid, 0.25);
    assert.equal(o.bron?.soort, 'stuk');
    assert.equal(o.naam, 'Cube de bouillon');
  });
  test('"Lait de coco 90 ml" en "Tomates 2"', () => {
    assert.deepEqual([ontleedRegel('Lait de coco 90 ml').hoeveelheid, ontleedRegel('Lait de coco 90 ml').bron?.soort], [90, 'ml']);
    assert.equal(ontleedRegel('Tomates 2').hoeveelheid, 2);
  });
  test('onbekend woord achteraan: de regel blijft zoals hij is', () => {
    const o = ontleedRegel('Pizza 4 seizoenen');
    assert.equal(o.hoeveelheid, undefined);
    assert.equal(o.naam, 'Pizza 4 seizoenen');
  });
});

describe('WEEK-326: duidelijke ingrediënten worden meteen gekoppeld', () => {
  for (const [naam, code] of [
    ['basilic thaï', 'basilicum'],
    ['noix de cajou concassées', 'cashewnoten'],
    ['cube de bouillon', 'bouillonblokje'],
    ['cube de bouillon de légumes', 'bouillonblokje'],
    ['épices de curry vert', 'currypasta'],
    ['pâte de curry rouge', 'currypasta'],
    ['green curry paste', 'currypasta'],
    ['groene curry', 'currypasta'],
  ] as const) {
    test(`${naam} → ${code}`, () => assert.deepEqual(koppelIngredient(naam, ['fr', 'nl']), { code, zeker: true }));
  }
  test('curry vert is geen currybladeren', () => assert.notEqual(koppelIngredient('épices de curry vert', ['fr'])?.code, 'currybladeren'));
});

describe('WEEK-326: de receptkaart van het voorbeeld', () => {
  const r = verwerkRecept(
    recept([
      'Chou-fleur 1/2 pièce',
      'Riz basmati 75 g',
      "Gousse d'ail 1 pièce",
      'Basilic thaï 2,5 g',
      'Noix de cajou concassées 10 g',
      'Cube de bouillon ¼ pièce',
      'Lait de coco 90 ml',
    ]),
    'nl'
  );
  test('alle ingrediënten staan in het gerecht, niets om na te kijken', () => {
    assert.deepEqual(
      r.ingredienten.map((i) => i.code),
      ['bloemkool', 'rijst_basmati', 'knoflook', 'basilicum', 'cashewnoten', 'bouillonblokje', 'kokosmelk']
    );
    assert.deepEqual(r.nakijken, []);
  });
  test('"1 sachet" (geen maat) blijft na te kijken, met het juiste ingrediënt', () => {
    const s = verwerkRecept(recept(['Épices de curry vert 1 sachet']), 'nl');
    assert.equal(s.nakijken[0]?.code, 'currypasta');
    assert.equal(s.nakijken[0]?.reden, 'hoeveelheid');
  });
});

describe('WEEK-326: tips en weetjes in de stappen', () => {
  test('weetjes vallen weg, een tip komt bij de vorige stap', () => {
    assert.deepEqual(
      schikStappen(['Préchauffez le four.', 'Le saviez-vous ? Ce plat contient 250 g de légumes.', 'Coupez le pak-choï.', 'Conseil : Essayez de le couper le plus petit possible.', 'Servez.']),
      ['Préchauffez le four.', 'Coupez le pak-choï. Conseil : Essayez de le couper le plus petit possible.', 'Servez.']
    );
  });
  test('in alle talen', () => {
    assert.deepEqual(schikStappen(['A', 'Wist je dat? x', 'Did you know: y', 'Wusstest du? z', 'Tip: fijn']), ['A Tip: fijn']);
  });
  test('een tip als eerste stap blijft een stap', () => assert.deepEqual(schikStappen(['Tip: eerst lezen', 'A']), ['Tip: eerst lezen', 'A']));
  test('een gewone stap die met "tipje" of "Wist" begint, blijft', () =>
    assert.deepEqual(schikStappen(['A', 'Tipje van de sluier: roer']), ['A', 'Tipje van de sluier: roer']));
  test('verwerkRecept gebruikt de geschikte stappen', () => {
    assert.deepEqual(verwerkRecept(recept([], ['A', 'Le saviez-vous ? x', 'B']), 'nl').stappen, ['A', 'B']);
  });
});

describe('WEEK-326: bewaren met regels om na te kijken', () => {
  test('regels over en niet bevestigd: eerst melden', () => assert.equal(moetNakijkenMelden(2, false), true));
  test('bevestigd: bewaren', () => assert.equal(moetNakijkenMelden(2, true), false));
  test('niets na te kijken: meteen bewaren', () => assert.equal(moetNakijkenMelden(0, false), false));
});

describe('WEEK-326: regressie – bestaande regels blijven zoals voorheen', () => {
  test('hoeveelheid vooraan', () => {
    const o = ontleedRegel('200 g de farine');
    assert.deepEqual([o.hoeveelheid, o.bron?.soort, o.naam], [200, 'g', 'farine']);
  });
  test('"1 ½ dl melk" en "½ ui"', () => {
    assert.equal(ontleedRegel('1 ½ dl melk').hoeveelheid, 150 / 100);
    assert.equal(ontleedRegel('½ ui').hoeveelheid, 0.5);
  });
  test('"2 teentjes look" en "zout naar smaak"', () => {
    assert.deepEqual([ontleedRegel('2 teentjes look').hoeveelheid, ontleedRegel('2 teentjes look').bron?.soort], [2, 'teentje']);
    assert.equal(ontleedRegel('zout naar smaak').hoeveelheid, undefined);
  });
  test('gewone stappen blijven ongewijzigd', () => assert.deepEqual(schikStappen(['A', 'B']), ['A', 'B']));
  test('geroosterde paprika blijft een eigen ingrediënt', () =>
    assert.equal(koppelIngredient('geroosterde paprika', ['nl'])?.code, 'geroosterde_paprika'));
  test('curry in poeder blijft currypoeder',() => assert.equal(koppelIngredient('curry en poudre', ['fr'])?.code, 'currypoeder'));
});
