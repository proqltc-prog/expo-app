import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { STIJLBEELD_IDS, stijlbeeld } from '@/lib/planner/stijlbeeld';
import { STIJL_IDS } from '@/lib/planner/opties';

const HEX = /^#[0-9A-Fa-f]{6}$/;

describe('stijlbeeld (WEEK-73)', () => {
  test('elke stijl uit de keuzelijsten heeft een beeld', () => {
    for (const id of STIJL_IDS) assert.ok(stijlbeeld(id), `geen beeld voor ${id}`);
  });
  test('elk beeld hoort bij een bestaande stijl', () => {
    for (const id of STIJLBEELD_IDS) assert.ok(STIJL_IDS.includes(id), `beeld ${id} is geen stijl`);
  });
  test('elk beeld heeft een voorbeeldgerecht en drie hex-kleuren', () => {
    for (const id of STIJLBEELD_IDS) {
      const b = stijlbeeld(id)!;
      assert.ok(b.voorbeeld.length > 0);
      assert.equal(b.land.length, 3);
      for (const kleur of b.land) assert.match(kleur, HEX);
    }
  });
  test('onbekende stijl heeft geen beeld', () => {
    assert.equal(stijlbeeld('bestaat-niet'), undefined);
  });
  test('Mediterraan en Italiaans hebben elk een eigen vorm', () => {
    assert.notEqual(stijlbeeld('mediterraan')!.vorm, stijlbeeld('italiaans')!.vorm);
  });
});
