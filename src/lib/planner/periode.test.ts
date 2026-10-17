import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseerPeriode, PERIODE_OPTIES, PERIODE_STANDAARD } from './periode';
import { normaliseerKeuzes } from './normaliseer';
import { planLokaal, STANDAARD_AANTAL_DAGEN } from './lokaal';
import { bouwAiVerzoek } from './ai';
import type { PlanVerzoek } from './types';
import { standaardProfiel } from '@/lib/profiel';

const basis: PlanVerzoek = { opdracht: '', kooktijden: [], stijlen: [], profiel: standaardProfiel(), taal: 'nl', seed: 7 };

describe('periode', () => {
  test('biedt 2 tot en met 7 dagen aan; standaard is 6', () => {
    assert.deepEqual([...PERIODE_OPTIES], [2, 3, 4, 5, 6, 7]);
    assert.equal(PERIODE_STANDAARD, 6);
    assert.equal(STANDAARD_AANTAL_DAGEN, PERIODE_STANDAARD);
  });

  test('normalisePeriode laat enkel geldige keuzes door', () => {
    assert.equal(normaliseerPeriode(3), 3);
    assert.equal(normaliseerPeriode(7), 7);
    assert.equal(normaliseerPeriode(1), undefined);
    assert.equal(normaliseerPeriode(8), undefined);
    assert.equal(normaliseerPeriode('5'), undefined);
    assert.equal(normaliseerPeriode(undefined), undefined);
  });

  test('keuzes bewaren de periode en vallen terug op de standaard', () => {
    assert.equal(normaliseerKeuzes({ aantalDagen: 4 }).aantalDagen, 4);
    assert.equal(normaliseerKeuzes({ aantalDagen: 99 }).aantalDagen, PERIODE_STANDAARD);
    assert.equal(normaliseerKeuzes(null).aantalDagen, PERIODE_STANDAARD);
  });

  test('het plan telt het gekozen aantal dagen', () => {
    for (const n of PERIODE_OPTIES) {
      assert.equal(planLokaal({ ...basis, aantalDagen: n }).dagen.length, n, `periode ${n}`);
    }
  });

  test('regressie: zonder keuze geldt het standaardaantal', () => {
    assert.equal(planLokaal(basis).dagen.length, PERIODE_STANDAARD);
  });

  test('regressie: een getal in de opdracht werkt nog als geen periode gekozen is', () => {
    assert.equal(planLokaal({ ...basis, opdracht: 'vier dagen' }).dagen.length, 4);
  });

  test('de gekozen periode gaat voor een getal in de opdracht', () => {
    assert.equal(planLokaal({ ...basis, opdracht: 'vier dagen', aantalDagen: 2 }).dagen.length, 2);
  });

  test('de AI-aanvraag krijgt dezelfde dagen mee', () => {
    assert.equal(bouwAiVerzoek({ ...basis, aantalDagen: 3 }).dagen.length, 3);
    assert.equal(bouwAiVerzoek(basis).dagen.length, PERIODE_STANDAARD);
  });
});
