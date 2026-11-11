import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { beoordeelRij, VOLGORDE, voedingstabel } from '@/lib/voedingstabel';
import { berekenScore } from '@/lib/score';
import type { Product } from '@/lib/openfoodfacts';

const basis: Product = { barcode: '1', naam: 'Test', additieven: [] };
const muesli: Product = { ...basis, kcal: 430, vet: 12, verzadigd: 1.4, koolhydraten: 62, suikers: 24, vezels: 8, eiwitten: 9, zout: 0.5 };
const sleutels = (rijen: { sleutel: string }[]) => rijen.map((r) => r.sleutel);

describe('beoordeelRij', () => {
  test('vet, verzadigd vet, suikers en zout volgen de officiële drempels, met de grens erbij', () => {
    assert.deepEqual(beoordeelRij({ ...basis, zout: 0.3 }, 'zout', false), {
      sleutel: 'zout', waarde: 0.3, beoordeling: 'goed', grens: { code: 'laag', max: 0.3 },
    });
    assert.deepEqual(beoordeelRij({ ...basis, vet: 12 }, 'vet', false), {
      sleutel: 'vet', waarde: 12, beoordeling: 'gemiddeld', grens: { code: 'midden', min: 3, max: 17.5 },
    });
    assert.deepEqual(beoordeelRij({ ...basis, suikers: 22.6 }, 'suikers', false), {
      sleutel: 'suikers', waarde: 22.6, beoordeling: 'teVeel', grens: { code: 'hoog', min: 22.5 },
    });
  });

  test('drank gebruikt de grenzen per 100 ml', () => {
    const cola = beoordeelRij({ ...basis, suikers: 10.6 }, 'suikers', true);
    assert.equal(cola.beoordeling, 'gemiddeld');
    assert.deepEqual(cola.grens, { code: 'midden', min: 2.5, max: 11.25 });
    assert.equal(beoordeelRij({ ...basis, suikers: 11.3 }, 'suikers', true).beoordeling, 'teVeel');
  });

  test('vezels: vanaf 6 g goed, daaronder ter info', () => {
    assert.deepEqual(beoordeelRij({ ...basis, vezels: 6 }, 'vezels', false).grens, { code: 'vezels', min: 6 });
    assert.equal(beoordeelRij({ ...basis, vezels: 5.9 }, 'vezels', false).beoordeling, 'info');
  });

  test('eiwit: vanaf 20 % van de energie goed; zonder calorieën ter info', () => {
    assert.deepEqual(beoordeelRij({ ...basis, eiwitten: 20, kcal: 400 }, 'eiwitten', false).grens, { code: 'eiwit', procent: 20 });
    assert.equal(beoordeelRij({ ...basis, eiwitten: 19, kcal: 400 }, 'eiwitten', false).beoordeling, 'info');
    assert.equal(beoordeelRij({ ...basis, eiwitten: 30 }, 'eiwitten', false).beoordeling, 'info');
  });

  test('energie en koolhydraten hebben geen grens; onbekende waarden worden niet geschat', () => {
    assert.deepEqual(beoordeelRij({ ...basis, kcal: 900 }, 'kcal', false), { sleutel: 'kcal', waarde: 900, beoordeling: 'info' });
    assert.equal(beoordeelRij({ ...basis, koolhydraten: 90 }, 'koolhydraten', false).beoordeling, 'info');
    assert.deepEqual(beoordeelRij(basis, 'zout', false), { sleutel: 'zout', waarde: undefined, beoordeling: 'info' });
  });
});

describe('voedingstabel', () => {
  test('voorbeeld muesli: pluspunten, dan te veel voor gemiddeld, dan de rest', () => {
    const t = voedingstabel(muesli, false);
    assert.deepEqual(sleutels(t.plus), ['verzadigd', 'vezels']);
    assert.deepEqual(sleutels(t.min), ['suikers', 'vet', 'zout']);
    assert.deepEqual(sleutels(t.overig), ['kcal', 'koolhydraten', 'eiwitten']);
  });

  test('elke rij van het etiket staat precies één keer in de tabel', () => {
    for (const p of [basis, muesli, { ...muesli, vet: 30, zout: 0.1, eiwitten: 30 }]) {
      const t = voedingstabel(p, false);
      assert.deepEqual([...t.plus, ...t.min, ...t.overig].map((r) => r.sleutel).sort(), [...VOLGORDE].sort());
    }
  });

  test('zonder gegevens staat alles onder overige', () => {
    const t = voedingstabel(basis, false);
    assert.equal(t.plus.length + t.min.length, 0);
    assert.equal(t.overig.length, VOLGORDE.length);
  });

  test('regressie: tabel en score zijn het eens (elke aftrek is een minpunt, elke bonus een pluspunt)', () => {
    const p: Product = { ...muesli, vet: 30, eiwitten: 30, kcal: 400 };
    const t = voedingstabel(p, false);
    const o = berekenScore(p, false);
    const aftrek = o.redenen.filter((r) => r.punten < 0 && r.code !== 'nova4').length;
    const bonus = o.redenen.filter((r) => r.punten > 0).length;
    assert.equal(t.min.length, aftrek);
    assert.equal(t.plus.filter((r) => r.sleutel === 'vezels' || r.sleutel === 'eiwitten').length, bonus);
  });
});
