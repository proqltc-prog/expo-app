// WEEK-331: stappenbalk volgt het vegen; synoniemen naar de nieuwe, specifiekere ingrediënten; runderlappen.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { koppelIngredient } from './receptLink';
import { kaartOpPositie } from './bereiding';

describe('WEEK-331: de kaart bij een schuifpositie (stappenbalk tijdens het vegen)', () => {
  test('vanaf halfweg de volgende kaart', () => {
    assert.equal(kaartOpPositie(0, 400, 5), 0);
    assert.equal(kaartOpPositie(150, 400, 5), 0);
    assert.equal(kaartOpPositie(210, 400, 5), 1);
    assert.equal(kaartOpPositie(400, 400, 5), 1);
    assert.equal(kaartOpPositie(1590, 400, 5), 4);
  });
  test('voorbij het einde of ervoor: begrensd', () => {
    assert.equal(kaartOpPositie(9999, 400, 5), 4);
    assert.equal(kaartOpPositie(-80, 400, 5), 0);
  });
  test('nog geen breedte gemeten: de eerste kaart', () => assert.equal(kaartOpPositie(300, 0, 5), 0));
});

describe('WEEK-331: synoniemen', () => {
  test('runderlappen → rundvlees', () => {
    assert.deepEqual(koppelIngredient('runderlappen', ['nl']), { code: 'rundvlees', zeker: true });
    assert.deepEqual(koppelIngredient('1 kg runderlappen'.replace('1 kg ', ''), ['nl']), { code: 'rundvlees', zeker: true });
  });
  test('Thaise basilicum en de currypasta’s naar het nieuwe, specifieke ingrediënt', () => {
    assert.equal(koppelIngredient('basilic thaï', ['fr'])?.code, 'thaise_basilicum');
    assert.equal(koppelIngredient('Thai basil', ['en'])?.code, 'thaise_basilicum');
    assert.equal(koppelIngredient('rode currypasta', ['nl'])?.code, 'rode_currypasta');
    assert.equal(koppelIngredient('pâte de curry jaune', ['fr'])?.code, 'gele_currypasta');
  });
  test('extra vierge olijfolie telt in een recept als olijfolie, in de 4 talen', () => {
    for (const [naam, taal] of [
      ['extra vierge olijfolie', 'nl'],
      ["huile d'olive vierge extra", 'fr'],
      ['extra virgin olive oil', 'en'],
      ['natives Olivenöl extra', 'de'],
    ] as const) assert.equal(koppelIngredient(naam, [taal])?.code, 'olijfolie', naam);
  });
  test('regressie: paprika in het Engels blijft paprikapoeder, niet gerookt paprikapoeder', () => {
    assert.equal(koppelIngredient('paprika', ['en'])?.code, 'paprikapoeder');
    assert.equal(koppelIngredient('smoked paprika', ['en'])?.code, 'gerookt_paprikapoeder');
  });
  test('regressie: gewoon basilicum blijft basilicum', () => assert.equal(koppelIngredient('basilicum', ['nl'])?.code, 'basilicum'));
});
