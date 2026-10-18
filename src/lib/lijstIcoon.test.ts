import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { BOODSCHAPPEN_ICOON, categorieIcoon, WINKEL_ICOON } from '@/lib/lijstIcoon';

describe('lijstIcoon (WEEK-77)', () => {
  test('de twee tabbladen hebben elk een eigen icoon', () => {
    assert.equal(WINKEL_ICOON, 'storefront-outline');
    assert.equal(BOODSCHAPPEN_ICOON, 'cart-outline');
    assert.notEqual(WINKEL_ICOON, BOODSCHAPPEN_ICOON);
  });

  test('bekende categorieën krijgen hun eigen icoon', () => {
    assert.equal(categorieIcoon('fruit'), 'nutrition-outline');
    assert.equal(categorieIcoon('huishouden'), 'home-outline');
    assert.equal(categorieIcoon('avondeten'), 'restaurant-outline');
  });

  test('een onbekende categorie krijgt de winkelmand', () => {
    assert.equal(categorieIcoon('bestaat-niet'), 'basket-outline');
    assert.equal(categorieIcoon(''), 'basket-outline');
  });

  test('regressie: de vaste categorieën uit de lijst hebben allemaal een icoon', () => {
    for (const c of ['brood-beleg', 'fruit', 'school', 'huishouden', 'extra', 'gescand', 'avondeten']) {
      assert.notEqual(categorieIcoon(c), '', c);
    }
  });
});
