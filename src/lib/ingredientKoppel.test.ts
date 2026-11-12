// WEEK-254: onbekende ingrediënten automatisch koppelen of toevoegen. Zelfgemaakte antwoorden; nooit de echte functie.
import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ingredientNaam, isIngredient, voegIngredientenToe, zetIngredientenUitDatabank } from '@/data/ingredienten';
import { infoUit, koppelingenUit, leesKoppelAntwoord } from './ingredientKoppel';
import { verwerkRecept } from './receptLink';

const YUZU_INFO = ['fruit', 'stuk', ['yuzu', 'yuzu', 'Yuzu', 'yuzu']];
const ANTWOORD = {
  resultaten: [
    { naam: 'yuzu', status: 'nieuw', code: 'yuzu', info: YUZU_INFO },
    { naam: 'sojaboontjes', status: 'bestaand', code: 'edamame', info: ['peulvrucht', 'g', ['edamamebonen', 'edamame', 'Edamame', 'edamame beans']] },
    { naam: 'liefde', status: 'geen' },
    { naam: 'sumak', status: 'druk' },
  ],
};

afterEach(() => zetIngredientenUitDatabank({}));

describe('WEEK-254: leesKoppelAntwoord', () => {
  test('een goed antwoord wordt overgenomen', () => {
    const r = leesKoppelAntwoord(ANTWOORD);
    assert.deepEqual(r.map((x) => [x.naam, x.status, x.code]), [
      ['yuzu', 'nieuw', 'yuzu'],
      ['sojaboontjes', 'bestaand', 'edamame'],
      ['liefde', 'geen', undefined],
      ['sumak', 'druk', undefined],
    ]);
  });
  test('ongeldige rijen vallen weg: vreemde status, code of gegevens', () => {
    const r = leesKoppelAntwoord({
      resultaten: [
        { naam: 'a', status: 'raar' },
        { naam: 'b', status: 'nieuw', code: 'B Code', info: YUZU_INFO },
        { naam: 'c', status: 'nieuw', code: 'c', info: ['fruit', 'kilo', ['c', 'c', 'c', 'c']] },
        { naam: 'd', status: 'bestaand', code: 'd', info: ['fruit', 'g', ['d', '', 'd', 'd']] },
        { naam: 'e', status: 'bestaand' },
      ],
    });
    assert.deepEqual(r, []);
    assert.deepEqual(leesKoppelAntwoord(null), []);
    assert.deepEqual(leesKoppelAntwoord({ resultaten: 'x' }), []);
  });
});

describe('WEEK-254: koppelingen en nieuwe ingrediënten', () => {
  test('koppelingen per kern van de naam, enkel met een code', () => {
    const r = leesKoppelAntwoord(ANTWOORD);
    assert.deepEqual(koppelingenUit(r), { yuzu: 'yuzu', sojaboontjes: 'edamame' });
    assert.deepEqual(Object.keys(infoUit(r)), ['yuzu', 'edamame']);
  });

  test('een nieuw ingrediënt is meteen bruikbaar (voor de volgende start)', () => {
    assert.equal(isIngredient('yuzu'), false);
    voegIngredientenToe(infoUit(leesKoppelAntwoord(ANTWOORD)));
    assert.equal(isIngredient('yuzu'), true);
    assert.equal(ingredientNaam('yuzu', 'de'), 'Yuzu');
  });

  test('toevoegen behoudt wat al uit de databank kwam', () => {
    zetIngredientenUitDatabank({ sumak: ['specerij', 'g', ['sumak', 'sumac', 'Sumach', 'sumac']] });
    voegIngredientenToe({ yuzu: YUZU_INFO as never });
    assert.equal(isIngredient('sumak'), true);
    assert.equal(isIngredient('yuzu'), true);
  });
});

describe('WEEK-254: verwerkRecept met koppelingen van de functie', () => {
  const recept = { naam: 'Zalm met yuzu en sojaboontjes', personen: 2, ingredienten: ['300 g zalmfilet', '2 yuzu', '150 g verse sojaboontjes', 'liefde'], stappen: [] };

  test('zonder koppelingen: yuzu, sojaboontjes en liefde zijn onbekend (regressie WEEK-247)', () => {
    const r = verwerkRecept(recept, 'nl');
    assert.deepEqual(r.nakijken.filter((n) => n.reden === 'onbekend').map((n) => n.tekst), ['2 yuzu', '150 g verse sojaboontjes', 'liefde']);
    assert.ok(!r.ingredienten.some((i) => i.code === 'edamame'));
  });

  test('met koppelingen: yuzu (nieuw) en sojaboontjes (bestaand) staan meteen in het recept, omgerekend', () => {
    voegIngredientenToe(infoUit(leesKoppelAntwoord(ANTWOORD)));
    const r = verwerkRecept(recept, 'nl', koppelingenUit(leesKoppelAntwoord(ANTWOORD)));
    const codes = Object.fromEntries(r.ingredienten.map((i) => [i.code, [i.hoeveelheid, i.eenheid]]));
    assert.deepEqual(codes.yuzu, [1, 'stuk']);
    assert.deepEqual(codes.edamame, [75, 'g']);
    assert.deepEqual(codes.zalm, [150, 'g']);
    assert.deepEqual(r.nakijken.map((n) => n.tekst), ['liefde']);
  });

  test('een koppeling naar een code die de app niet kent, wordt genegeerd', () => {
    const r = verwerkRecept(recept, 'nl', { yuzu: 'bestaat_niet' });
    assert.ok(r.nakijken.some((n) => n.tekst === '2 yuzu' && n.reden === 'onbekend'));
  });
});
