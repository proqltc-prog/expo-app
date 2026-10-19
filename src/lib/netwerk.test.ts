import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { metTimeout, probeerAchtereen, probeerOpnieuw, TIMEOUT_MS } from '@/lib/netwerk';

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

describe('probeerOpnieuw (WEEK-115)', () => {
  const geenPauze = async () => undefined;

  test('geeft het antwoord van de eerste poging als die lukt, zonder pauze', async () => {
    let pauzes = 0;
    const uit = await probeerOpnieuw(async () => 'A', 1500, async () => {
      pauzes++;
    });
    assert.equal(uit, 'A');
    assert.equal(pauzes, 0);
  });

  test('probeert \u00e9\u00e9n keer opnieuw na een storing', async () => {
    let pogingen = 0;
    const uit = await probeerOpnieuw(
      async () => {
        pogingen++;
        if (pogingen === 1) throw new Error('Overpass 504');
        return 'B';
      },
      1500,
      geenPauze,
    );
    assert.equal(uit, 'B');
    assert.equal(pogingen, 2);
  });

  test('geeft op na de tweede mislukte poging', async () => {
    let pogingen = 0;
    await assert.rejects(
      probeerOpnieuw(
        async () => {
          pogingen++;
          throw new Error('Overpass 429');
        },
        1500,
        geenPauze,
      ),
      /429/,
    );
    assert.equal(pogingen, 2);
  });
});

describe('metTimeout (WEEK-120)', () => {
  test('breekt de aanvraag af na de wachttijd, zodat de zoeker nooit blijft draaien', async () => {
    const wacht = metTimeout(5);
    assert.equal(wacht.signal.aborted, false);
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(wacht.signal.aborted, true);
  });
  test('klaar() annuleert de wachttijd als het antwoord op tijd komt', async () => {
    const wacht = metTimeout(5);
    wacht.klaar();
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(wacht.signal.aborted, false);
  });
  test('standaard wacht de app 10 seconden', () => {
    assert.equal(TIMEOUT_MS, 10000);
  });
});
