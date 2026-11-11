import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { additievenMetRegel, EU_ADDITIEVEN, euRegel, telEuRegels } from '@/data/euAdditieven';
import { additiefWeergave } from '@/data/additieven';

describe('euRegel (WEEK-224)', () => {
  test('de zes kleurstoffen met verplichte waarschuwing voor kinderen', () => {
    for (const code of ['E102', 'E104', 'E110', 'E122', 'E124', 'E129']) {
      assert.deepEqual(euRegel(code), { status: 'waarschuwing', bron: 'v1333_2008' }, code);
    }
  });

  test('niet meer toegelaten: titaandioxide, rood 2G en de parabenen', () => {
    assert.deepEqual(euRegel('en:e171-titanium-dioxide'), { status: 'verboden', bron: 'v2022_63' });
    assert.deepEqual(euRegel('E128'), { status: 'verboden', bron: 'v884_2007' });
    assert.equal(euRegel('E216')?.status, 'verboden');
    assert.equal(euRegel('E217')?.status, 'verboden');
  });

  test('gewone additieven, varianten en tags zonder E-nummer hebben geen regel', () => {
    assert.equal(euRegel('E330'), null);
    assert.equal(euRegel('E218'), null); // methylparabeen is wel toegelaten
    assert.equal(euRegel('E129A'), null);
    assert.equal(euRegel('en:palm-oil'), null);
  });

  test('regressie: de lijst bevat precies deze tien nummers', () => {
    assert.deepEqual(Object.keys(EU_ADDITIEVEN).sort(), ['E102', 'E104', 'E110', 'E122', 'E124', 'E128', 'E129', 'E171', 'E216', 'E217']);
  });

  test('elk nummer uit de lijst heeft een naam in elke taal', () => {
    for (const code of Object.keys(EU_ADDITIEVEN)) {
      for (const taal of ['nl', 'fr', 'de', 'en'] as const) {
        assert.ok(additiefWeergave(code, taal).omschrijving, `${code} ${taal}`);
      }
    }
  });
});

describe('additievenMetRegel', () => {
  test('eerst niet toegelaten, dan met waarschuwing, dan de rest in de oorspronkelijke volgorde', () => {
    const lijst = additievenMetRegel(['E330', 'E129', 'E322', 'E171', 'E102']);
    assert.deepEqual(lijst.map((a) => a.tag), ['E171', 'E129', 'E102', 'E330', 'E322']);
    assert.equal(lijst[3].regel, null);
  });

  test('zonder regels blijft de volgorde ongewijzigd (regressie)', () => {
    assert.deepEqual(additievenMetRegel(['E471', 'E330', 'E322']).map((a) => a.tag), ['E471', 'E330', 'E322']);
    assert.deepEqual(additievenMetRegel([]), []);
  });
});

describe('telEuRegels', () => {
  test('telt per soort en een dubbel E-nummer maar één keer', () => {
    assert.deepEqual(telEuRegels(['E129', 'en:e129-allura-red', 'E102', 'E171', 'E330']), { verboden: 1, waarschuwing: 2 });
    assert.deepEqual(telEuRegels(['E330']), { verboden: 0, waarschuwing: 0 });
  });
});
