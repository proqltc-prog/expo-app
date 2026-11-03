// Regressietests voor het nieuwe weekmenu (WEEK-73): de stappen, de statussen en de vertalingen ervan.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { TALEN, VERTALINGEN } from '@/i18n';
import { FASEN } from '@/lib/planner/fasen';

const SLEUTELS_NIEUW = ['planning.nogTeBevestigen', 'planning.bevestigDeze'] as const;

describe('weekmenu-teksten (WEEK-73)', () => {
  test('de stappen blijven in de afgesproken volgorde', () => {
    assert.deepEqual([...FASEN], ['periode', 'kooktijd', 'stijl', 'vermijden', 'plan']);
  });

  for (const taal of TALEN) {
    test(`${taal}: elke stap heeft een naam in de stappenbalk`, () => {
      const tabel = VERTALINGEN[taal] as Record<string, string>;
      for (const fase of FASEN) {
        assert.ok(tabel[`stap.${fase}`]?.trim(), `ontbreekt: stap.${fase}`);
      }
    });

    test(`${taal}: de statussen en knoptekst van de dagkaart zijn ingevuld`, () => {
      const tabel = VERTALINGEN[taal] as Record<string, string>;
      for (const sleutel of SLEUTELS_NIEUW) {
        assert.ok(tabel[sleutel]?.trim(), `ontbreekt: ${sleutel} in ${taal}`);
      }
    });
  }
});
