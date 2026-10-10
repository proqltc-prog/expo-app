import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { leesTegoed, resterend, tegoedTekst } from '@/lib/planner/tegoed';

describe('AI-tegoed (WEEK-33)', () => {
  test('leest het antwoord van de database', () => {
    assert.deepEqual(leesTegoed({ limiet: 1, gebruikt: 0 }), { limiet: 1, gebruikt: 0 });
    assert.deepEqual(leesTegoed({ limiet: 3, gebruikt: 2 }), { limiet: 3, gebruikt: 2 });
  });

  test('onbruikbare data geeft null', () => {
    assert.equal(leesTegoed(null), null);
    assert.equal(leesTegoed('x'), null);
    assert.equal(leesTegoed({ limiet: '1', gebruikt: 0 }), null);
    assert.equal(leesTegoed({ limiet: 1 }), null);
    assert.equal(leesTegoed({ limiet: -1, gebruikt: 0 }), null);
    assert.equal(leesTegoed({ limiet: Infinity, gebruikt: 0 }), null);
  });

  test('resterend is nooit negatief', () => {
    assert.equal(resterend({ limiet: 1, gebruikt: 0 }), 1);
    assert.equal(resterend({ limiet: 3, gebruikt: 1 }), 2);
    assert.equal(resterend({ limiet: 1, gebruikt: 4 }), 0);
  });

  test('tekst: nog over of op', () => {
    assert.deepEqual(tegoedTekst({ limiet: 3, gebruikt: 1 }), { sleutel: 'planning.aiTegoed', waarden: { n: 2, limiet: 3 } });
    assert.deepEqual(tegoedTekst({ limiet: 1, gebruikt: 1 }), { sleutel: 'planning.aiTegoedOp', waarden: { n: 0, limiet: 1 } });
  });
});
