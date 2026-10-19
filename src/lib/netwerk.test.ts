import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { probeerAchtereen } from '@/lib/netwerk';

describe('probeerAchtereen (WEEK-95)', () => {
  test('geeft het antwoord van de eerste bron die lukt, en vraagt de rest niet', async () => {
    const aangeroepen: string[] = [];
    const uit = await probeerAchtereen([
      async () => (aangeroepen.push('a'), 'A'),
      async () => (aangeroepen.push('b'), 'B'),
    ]);
    assert.equal(uit, 'A');
    assert.deepEqual(aangeroepen, ['a']);
  });

  test('valt terug op de tweede bron als de eerste faalt', async () => {
    const uit = await probeerAchtereen([
      async () => {
        throw new Error('Overpass 504');
      },
      async () => 'B',
    ]);
    assert.equal(uit, 'B');
  });

  test('gooit de fout van de laatste bron als alle bronnen falen', async () => {
    await assert.rejects(
      probeerAchtereen([
        async () => {
          throw new Error('eerste');
        },
        async () => {
          throw new Error('tweede');
        },
      ]),
      /tweede/,
    );
  });

  test('zonder bronnen is het een fout, geen leeg antwoord', async () => {
    await assert.rejects(probeerAchtereen<string>([]), /Geen bron/);
  });
});
