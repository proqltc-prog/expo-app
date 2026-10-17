import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { RECEPTENBANK, BankRecept } from '@/data/receptenbank';
import { isAlleenAvond, momentVan, normaliseerMomenten } from './moment';
import { planLokaal, STANDAARD_AANTAL_DAGEN } from './lokaal';
import { resetDagLokaal, kiesVervanging } from './reset';
import { standaardProfiel } from '@/lib/profiel';
import { normaliseerWeekplan } from './normaliseer';
import type { PlanVerzoek, Weekplan } from './types';

const basis: PlanVerzoek = { opdracht: '', kooktijden: [], stijlen: [], profiel: standaardProfiel(), taal: 'nl', seed: 11 };
const momentVanId = (id: string) => momentVan(RECEPTENBANK.find((r) => r.id === id) as BankRecept);

describe('momenten', () => {
  test('recepten zonder moment zijn avondrecepten', () => {
    assert.equal(momentVan({}), 'avond');
    assert.equal(momentVan({ moment: 'ontbijt' }), 'ontbijt');
  });

  test('normaliseerMomenten: vaste volgorde, onbekende waarden weg, leeg is avond', () => {
    assert.deepEqual(normaliseerMomenten(['avond', 'ontbijt', 'x']), ['ontbijt', 'avond']);
    assert.deepEqual(normaliseerMomenten([]), ['avond']);
    assert.deepEqual(normaliseerMomenten(null), ['avond']);
    assert.equal(isAlleenAvond(undefined), true);
    assert.equal(isAlleenAvond(['ontbijt']), false);
  });

  test('de bank heeft ontbijt- en middagrecepten', () => {
    assert.ok(RECEPTENBANK.some((r) => momentVan(r) === 'ontbijt'));
    assert.ok(RECEPTENBANK.some((r) => momentVan(r) === 'middag'));
  });

  test('regressie: zonder momentkeuze blijft het avondplan zoals het was', () => {
    const plan = planLokaal(basis);
    assert.equal(plan.dagen.length, STANDAARD_AANTAL_DAGEN);
    assert.ok(plan.dagen.every((d) => d.moment === undefined));
    assert.ok(plan.dagen.every((d) => momentVan(RECEPTENBANK.find((r) => r.id === d.recept.id) as BankRecept) === 'avond'));
  });

  test('een ontbijt-plan kiest enkel ontbijtrecepten', () => {
    const plan = planLokaal({ ...basis, aantalDagen: 3, momenten: ['ontbijt'] });
    assert.equal(plan.dagen.length, 3);
    assert.ok(plan.dagen.every((d) => d.moment === 'ontbijt'));
    assert.ok(plan.dagen.every((d) => momentVanId(d.recept.id) === 'ontbijt'));
  });

  test('meerdere momenten: per dag een plek per moment, dag voor dag', () => {
    const plan = planLokaal({ ...basis, aantalDagen: 2, momenten: ['ontbijt', 'avond'] });
    assert.equal(plan.dagen.length, 4);
    assert.deepEqual(plan.dagen.map((d) => d.moment), ['ontbijt', 'avond', 'ontbijt', 'avond']);
    assert.deepEqual(plan.dagen.map((d) => d.dag), [plan.dagen[0].dag, plan.dagen[0].dag, plan.dagen[2].dag, plan.dagen[2].dag]);
    for (const d of plan.dagen) assert.equal(momentVanId(d.recept.id), d.moment);
  });

  test('zonder kiesbaar recept voor een moment wordt die plek overgeslagen', () => {
    const avondenEnkel = RECEPTENBANK.filter((r) => momentVan(r) === 'avond');
    const plan = planLokaal({ ...basis, aantalDagen: 2, momenten: ['ontbijt'] }, avondenEnkel);
    assert.equal(plan.dagen.length, 0);
  });

  test('vervangen van een ontbijt blijft een ontbijt', () => {
    const plan = planLokaal({ ...basis, aantalDagen: 3, momenten: ['ontbijt', 'avond'], seed: 3 });
    const vervanging = kiesVervanging(plan, 0, 42);
    assert.ok(vervanging);
    assert.equal(momentVan(vervanging), 'ontbijt');
    const nieuw = resetDagLokaal(plan, 0, 42);
    assert.equal(nieuw.dagen[0].moment, 'ontbijt');
    assert.equal(momentVanId(nieuw.dagen[0].recept.id), 'ontbijt');
  });

  test('regressie: vervangen van een avondrecept blijft een avondrecept', () => {
    const plan = planLokaal({ ...basis, aantalDagen: 3, seed: 5 });
    const nieuw = resetDagLokaal(plan, 1, 9);
    assert.equal(nieuw.dagen[1].moment, undefined);
    assert.equal(momentVanId(nieuw.dagen[1].recept.id), 'avond');
  });

  test('het moment van een plek blijft bewaard na opslaan en inlezen', () => {
    const plan: Weekplan = planLokaal({ ...basis, aantalDagen: 2, momenten: ['middag', 'avond'], seed: 8 });
    const terug = normaliseerWeekplan(JSON.parse(JSON.stringify(plan)));
    assert.ok(terug);
    assert.deepEqual(terug.dagen.map((d) => d.moment), plan.dagen.map((d) => d.moment));
  });
});
