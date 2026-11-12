// WEEK-255: een samengevoegd dubbel ingrediënt mag niets breken. De oude code (bv. in een eigen recept, op de
// boodschappenlijst of in de frigo van een toestel) verwijst naar het behouden ingrediënt.
// Voorbeeld: Gemini voegde "yuzu_vrucht" toe, de dagelijkse controle voegde het samen in "yuzu".
import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  afdelingVan,
  dbCodeVan,
  eenheidVan,
  ingredientInfo,
  ingredientNaam,
  naarDbCode,
  zetIngredientAliassen,
  zetIngredientenUitDatabank,
} from '@/data/ingredienten';
import { leesAliassen } from './gegevensVersie';
import { normaliseerFrigo } from './frigo';
import { normaliseerLijst } from './lijst';

const YUZU = { yuzu: ['fruit', 'stuk', ['yuzu', 'yuzu', 'Yuzu', 'yuzu']] } as const;

afterEach(() => {
  zetIngredientenUitDatabank({});
  zetIngredientAliassen({});
});

describe('WEEK-255: leesAliassen', () => {
  test('leest [{oud, nieuw}]; ongeldige rijen vallen weg', () => {
    assert.deepEqual(leesAliassen([{ oud: 'yuzu_vrucht', nieuw: 'yuzu' }, { oud: 'x', nieuw: 'x' }, { oud: 'Raar Ding', nieuw: 'yuzu' }, null]), { yuzu_vrucht: 'yuzu' });
    assert.deepEqual(leesAliassen('geen lijst'), {});
  });
});

describe('WEEK-255: een samengevoegde dubbel blijft werken', () => {
  test('de oude code toont naam, eenheid en afdeling van het behouden ingrediënt', () => {
    zetIngredientenUitDatabank(YUZU);
    zetIngredientAliassen({ yuzu_vrucht: 'yuzu' });
    assert.equal(naarDbCode('yuzu_vrucht'), 'yuzu');
    assert.equal(dbCodeVan('yuzu_vrucht'), 'yuzu');
    assert.equal(ingredientNaam('yuzu_vrucht', 'de'), 'Yuzu');
    assert.equal(eenheidVan('yuzu_vrucht'), 'stuk');
    assert.equal(afdelingVan('yuzu_vrucht'), 'groenten-fruit');
    assert.deepEqual(ingredientInfo('yuzu_vrucht'), YUZU.yuzu);
  });

  test('een ketting van samenvoegingen (a → b → c) komt uit bij het laatste', () => {
    zetIngredientenUitDatabank(YUZU);
    zetIngredientAliassen({ yuzu_a: 'yuzu_b', yuzu_b: 'yuzu' });
    assert.equal(naarDbCode('yuzu_a'), 'yuzu');
  });

  test('een kring (fout in de databank) loopt niet eindeloos', () => {
    zetIngredientAliassen({ a_a: 'b_b', b_b: 'a_a' });
    assert.ok(['a_a', 'b_b'].includes(naarDbCode('a_a')));
  });

  test('boodschappenlijst en frigo met de oude code krijgen de nieuwe code', () => {
    zetIngredientenUitDatabank(YUZU);
    zetIngredientAliassen({ yuzu_vrucht: 'yuzu' });
    const lijst = normaliseerLijst([{ id: '1', naam: 'yuzu', code: 'yuzu_vrucht', afdeling: 'groenten-fruit', afgevinkt: false }]);
    assert.equal(lijst[0]?.code, 'yuzu');
    const frigo = normaliseerFrigo([{ id: '1', naam: 'yuzu', code: 'yuzu_vrucht', afdeling: 'groenten-fruit', toegevoegdOp: '2026-11-12T10:00:00Z', bron: 'planner' }]);
    assert.equal(frigo[0]?.code, 'yuzu');
  });

  test('regressie: zonder doorverwijzingen blijven de oude catalogus-codes (WEEK-205) werken', () => {
    assert.equal(naarDbCode('look'), 'knoflook');
    assert.equal(naarDbCode('witlof'), 'witlof');
    assert.equal(naarDbCode('bestaat_niet'), 'bestaat_niet');
  });
});
