import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { RECEPTENBANK, BankRecept } from '@/data/receptenbank';
import { isAlleenAvond, momentVan, normaliseerMomenten } from './moment';
import { planLokaal, STANDAARD_AANTAL_DAGEN } from './lokaal';
import { resetDagLokaal } from './reset';
import { standaardProfiel } from '@/lib/profiel';
import { normaliseerWeekplan } from './normaliseer';
import type { PlanVerzoek, Weekplan } from './types';

const basis: PlanVerzoek = { kooktijden: [], stijlen: [], profiel: standaardProfiel(), taal: 'nl', seed: 11 };
const momentVanId = (id: string) => momentVan(RECEPTENBANK.find((r) => r.id === id) as BankRecept);

describe('enkel avondeten (WEEK-189)', () => {
  test('recepten zonder moment zijn avondrecepten', () => {
    assert.equal(momentVan({}), 'avond');
  });

  test('de bank bevat geen ontbijt- of middagrecepten meer', () => {
    assert.ok(RECEPTENBANK.every((r) => momentVan(r) === 'avond'));
    assert.ok(RECEPTENBANK.every((r) => r.moment === undefined || r.moment === 'avond'));
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
    const plan = planLokaal(basis);
    assert.equal(plan.dagen.length, STANDAARD_AANTAL_DAGEN);
    assert.ok(plan.dagen.every((d) => d.moment === undefined));
    assert.ok(plan.dagen.every((d) => momentVanId(d.recept.id) === 'avond'));
  });

  test('regressie: vervangen van een avondrecept blijft een avondrecept', () => {
    const plan = planLokaal({ ...basis, aantalDagen: 3, seed: 5 });
    const nieuw = resetDagLokaal(plan, 1, 9);
    assert.equal(nieuw.dagen[1].moment, undefined);
    assert.equal(momentVanId(nieuw.dagen[1].recept.id), 'avond');
  });

  test('het plan blijft bewaard na opslaan en inlezen', () => {
    const plan: Weekplan = planLokaal({ ...basis, aantalDagen: 2, seed: 8 });
    const terug = normaliseerWeekplan(JSON.parse(JSON.stringify(plan)));
    assert.ok(terug);
    assert.deepEqual(terug.dagen.map((d) => d.recept.id), plan.dagen.map((d) => d.recept.id));
  });
});
