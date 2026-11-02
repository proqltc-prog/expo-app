import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { BEREIDING_TALEN, BEREIDINGEN } from '@/data/bereidingen';
import { RECEPTENBANK } from '@/data/receptenbank';

describe('bereidingen van de receptenbank (WEEK-81)', () => {
  test('elk recept uit de receptenbank heeft bereidingsstappen', () => {
    for (const r of RECEPTENBANK) {
      assert.ok(BEREIDINGEN[r.id], `geen bereiding voor ${r.id}`);
    }
  });

  test('elk recept heeft stappen in de vier talen van de app, en dat aantal is gelijk', () => {
    for (const r of RECEPTENBANK) {
      const per = BEREIDINGEN[r.id];
      const aantal = per.nl.length;
      assert.ok(aantal >= 2, `${r.id}: te weinig stappen`);
      for (const taal of BEREIDING_TALEN) {
        assert.equal(per[taal].length, aantal, `${r.id} (${taal}): ander aantal stappen`);
        for (const stap of per[taal]) assert.ok(stap.trim().length > 0, `${r.id} (${taal}): lege stap`);
      }
    }
  });

  test('de bereidingen horen bij bestaande recepten, geen losse id’s', () => {
    const ids = new Set(RECEPTENBANK.map((r) => r.id));
    for (const id of Object.keys(BEREIDINGEN)) assert.ok(ids.has(id), `onbekend id ${id}`);
  });
});

describe('bereidingen zonder hoeveelheden (WEEK-74)', () => {
  // Een getal met een maat- of tellingseenheid (400 g, 2 eetlepels, 3 stuks). Tijden en temperaturen vallen daar niet onder.
  const hoeveelheid = /\d+\s?(g|kg|ml|cl|dl|l|el|tl|stuks?|tbsp|tsp|cups?|oz|gram|grammes?|cuill\S*|eetlepels?|theelepels?|pièces?|cucharadas?|cucharaditas?|pezzi|cucchiai\S*)\b/i;

  test('geen enkele stap bevat een hoeveelheid, in alle zes talen', () => {
    for (const [id, talen] of Object.entries(BEREIDINGEN)) {
      for (const [taal, stappen] of Object.entries(talen)) {
        for (const stap of stappen) {
          assert.doesNotMatch(stap, hoeveelheid, `hoeveelheid in ${id} (${taal}): ${stap}`);
        }
      }
    }
  });

  test('de controle vangt een hoeveelheid wél op', () => {
    assert.match('Kook 400 g spaghetti.', hoeveelheid);
    assert.match('Voeg 2 eetlepels olie toe.', hoeveelheid);
    assert.doesNotMatch('Kook 20 minuten op 180 °C.', hoeveelheid);
  });
});
