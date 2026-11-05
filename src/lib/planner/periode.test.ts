import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseerPeriode, PERIODE_OPTIES, PERIODE_STANDAARD } from './periode';
import { normaliseerKeuzes } from './normaliseer';
import { planUitDatabase } from './dbplan';
import { testPool } from './testrecepten';
import type { PlanVerzoek } from './types';
import { standaardProfiel } from '@/lib/profiel';

const basis: PlanVerzoek = { kooktijden: [], stijlen: [], profiel: standaardProfiel(), taal: 'nl', seed: 7 };
const pool = testPool();

describe('periode van het weekmenu (WEEK-42)', () => {
  test('de keuzes gaan van 2 tot en met 7 dagen; de standaard is 6', () => {
    assert.deepEqual([...PERIODE_OPTIES], [2, 3, 4, 5, 6, 7]);
    assert.equal(PERIODE_STANDAARD, 6);
  });

  test('normaliseerPeriode houdt enkel een geldige keuze over', () => {
    assert.equal(normaliseerPeriode(4), 4);
    assert.equal(normaliseerPeriode(1), undefined);
    assert.equal(normaliseerPeriode(8), undefined);
    assert.equal(normaliseerPeriode('5'), undefined);
    assert.equal(normaliseerPeriode(undefined), undefined);
  });

  test('bewaarde keuzes zonder of met een ongeldige periode krijgen de standaard', () => {
    assert.equal(normaliseerKeuzes({}).aantalDagen, PERIODE_STANDAARD);
    assert.equal(normaliseerKeuzes({ aantalDagen: 12 }).aantalDagen, PERIODE_STANDAARD);
    assert.equal(normaliseerKeuzes({ aantalDagen: 3 }).aantalDagen, 3);
  });

  test('de planner volgt de gekozen periode; zonder keuze de standaard', () => {
    assert.equal(planUitDatabase(basis, pool)?.dagen.length, PERIODE_STANDAARD);
    for (const aantal of PERIODE_OPTIES) {
      assert.equal(planUitDatabase({ ...basis, aantalDagen: aantal }, pool)?.dagen.length, aantal, `${aantal} dagen`);
    }
  });
});
