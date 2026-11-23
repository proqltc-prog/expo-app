// WEEK-326: de + naast het zoekveld doet altijd iets zinvols.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { isExactBekend, plusActie } from './eigenrecepten';

const aardappel = { code: 'aardappel', naam: 'aardappel' } as const;
const zoete = { code: 'zoete_aardappel', naam: 'zoete aardappel' } as const;

describe('WEEK-326: de + naast het zoekveld', () => {
  test('exacte naam bij meerdere treffers: die kiezen', () =>
    assert.deepEqual(plusActie('Aardappel', [aardappel, zoete] as never), { actie: 'kies', keuze: aardappel }));
  test('één treffer: die kiezen', () => assert.deepEqual(plusActie('zoete', [zoete] as never), { actie: 'kies', keuze: zoete }));
  test('meerdere treffers zonder exacte naam: de gebruiker kiest', () =>
    assert.deepEqual(plusActie('aard', [aardappel, zoete] as never), { actie: 'meerdere' }));
  test('geen treffer: opzoeken als nieuw ingrediënt', () => assert.deepEqual(plusActie('dragon', []), { actie: 'nieuw' }));
  test('leeg zoekveld: niets', () => assert.deepEqual(plusActie('  ', []), { actie: 'niets' }));
  test('regressie: isExactBekend blijft werken', () => assert.equal(isExactBekend('aardappel', [aardappel] as never), true));
});
