import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { isAlleenAvond, momentVan, normaliseerMomenten } from './moment';
import { planUitDatabase, vervangDbDag } from './dbplan';
import { PERIODE_STANDAARD } from './periode';
import { testPool, TESTRECEPTEN } from './testrecepten';
import { standaardProfiel } from '@/lib/profiel';
import { normaliseerWeekplan } from './normaliseer';
import type { PlanVerzoek, Weekplan } from './types';

const basis: PlanVerzoek = { kooktijden: [], stijlen: [], profiel: standaardProfiel(), taal: 'nl', seed: 11 };
const pool = testPool();
const planVan = (verzoek: PlanVerzoek): Weekplan => {
  const plan = planUitDatabase(verzoek, pool);
  if (!plan) throw new Error('er is een plan');
  return plan;
};

describe('enkel avondeten (WEEK-189)', () => {
  test('recepten zonder moment zijn avondrecepten', () => {
    assert.equal(momentVan({}), 'avond');
    assert.equal(momentVan({ moment: 'avond' }), 'avond');
  });

  test('de databankrecepten in de pool zijn allemaal avondrecepten', () => {
    assert.ok(TESTRECEPTEN.every((r) => momentVan(r) === 'avond'));
    assert.ok(pool.every((k) => k.moment === 'avond'));
  });

  test('normaliseerMomenten: enkel avond blijft over, leeg of onbekend geeft avond', () => {
    assert.deepEqual(normaliseerMomenten(['avond', 'ontbijt', 'middag']), ['avond']);
    assert.deepEqual(normaliseerMomenten(['ontbijt']), ['avond']);
    assert.deepEqual(normaliseerMomenten([]), ['avond']);
    assert.deepEqual(normaliseerMomenten(null), ['avond']);
    assert.equal(isAlleenAvond(undefined), true);
    assert.equal(isAlleenAvond(['avond']), true);
  });

  test('regressie: het avondplan vult alle dagen met avondrecepten', () => {
    const plan = planVan(basis);
    assert.equal(plan.dagen.length, PERIODE_STANDAARD);
    assert.ok(plan.dagen.every((d) => momentVan(d) === 'avond'));
  });

  test('regressie: een gevraagd ander moment valt terug op avond', () => {
    const plan = planVan({ ...basis, momenten: ['ontbijt' as never] });
    assert.equal(plan.dagen.length, PERIODE_STANDAARD);
    assert.ok(plan.dagen.every((d) => momentVan(d) === 'avond'));
  });

  test('regressie: vervangen van een avondrecept blijft een avondrecept', () => {
    const plan = planVan({ ...basis, aantalDagen: 3, seed: 5 });
    const nieuw = vervangDbDag(plan, 1, pool, 9);
    assert.notEqual(nieuw.dagen[1].recept.id, plan.dagen[1].recept.id);
    assert.equal(momentVan(nieuw.dagen[1]), 'avond');
  });

  test('het plan blijft bewaard na opslaan en inlezen', () => {
    const plan = planVan({ ...basis, aantalDagen: 2, seed: 8 });
    const terug = normaliseerWeekplan(JSON.parse(JSON.stringify(plan)));
    assert.ok(terug);
    assert.deepEqual(terug.dagen.map((d) => d.recept.id), plan.dagen.map((d) => d.recept.id));
  });
});
