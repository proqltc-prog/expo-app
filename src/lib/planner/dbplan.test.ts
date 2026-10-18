import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { DbRecept } from '@/lib/planner/db';
import { DbPoolRecept, maakDbPool, planUitDatabase, vervangDbDag } from '@/lib/planner/dbplan';
import { standaardProfiel } from '@/lib/profiel';
import type { PlanVerzoek } from '@/lib/planner/types';

const standaardProfielVerzoek = (): PlanVerzoek => ({
  kooktijden: [],
  stijlen: [],
  profiel: standaardProfiel(),
  taal: 'nl',
  seed: 1,
});

const dbRecept = (id: number, wijziging: Partial<DbRecept> = {}): DbRecept => ({
  id,
  porties: 1,
  kooktijdMin: 15,
  moment: 'avond',
  stijl: 'klassiek',
  soort: 'vegetarisch',
  basis: 'pasta',
  titels: { nl: `Recept ${id}` },
  ingredienten: [{ code: 'ui', categorie: 'groente', namen: { nl: 'ui' }, hoeveelheid: 100, eenheid: 'g' }],
  ...wijziging,
});

const pool = (...recepten: DbRecept[]): DbPoolRecept[] => maakDbPool(recepten, 'nl', { volwassenen: 1, kinderen: 0 });

const plan = (p: DbPoolRecept[], wijziging: Partial<PlanVerzoek> = {}) =>
  planUitDatabase({ ...standaardProfielVerzoek(), ...wijziging }, p);

describe('maakDbPool (WEEK-68)', () => {
  test('zet recepten om met moment, kooktijdklasse en stijl', () => {
    const [k] = pool(dbRecept(1, { kooktijdMin: 30, moment: 'middag', stijl: 'klassiek' }));
    assert.equal(k.moment, 'middag');
    assert.equal(k.kooktijd, 'gemiddeld');
    assert.deepEqual(k.stijlen, ['klassiek']);
    assert.equal(k.recept.id, 'db-1');
  });
  test('recepten zonder titel in de taal vallen weg', () => {
    assert.equal(maakDbPool([dbRecept(1, { titels: {} })], 'nl', { volwassenen: 1, kinderen: 0 }).length, 0);
  });
});

describe('planUitDatabase: dagen en momenten (WEEK-68)', () => {
  test('één recept per dag, het aantal dagen gaat tot 7', () => {
    const p = pool(...Array.from({ length: 10 }, (_, i) => dbRecept(i + 1)));
    assert.equal(plan(p, { aantalDagen: 3 })!.dagen.length, 3);
    assert.equal(plan(p, { aantalDagen: 10 })!.dagen.length, 7);
  });
  test('alleen de gekozen momenten komen op het plan', () => {
    const p = pool(dbRecept(1, { moment: 'ontbijt' }), dbRecept(2, { moment: 'avond' }));
    const uit = plan(p, { aantalDagen: 1, momenten: ['ontbijt'] })!;
    assert.equal(uit.dagen.length, 1);
    assert.equal(uit.dagen[0].recept.id, 'db-1');
  });
  test('zonder recepten voor het gekozen moment is er geen plan', () => {
    assert.equal(plan(pool(dbRecept(1, { moment: 'avond' })), { momenten: ['ontbijt'] }), undefined);
  });
  test('zonder recepten is er geen plan', () => {
    assert.equal(plan([]), undefined);
  });
});

describe('planUitDatabase: wensen en versoepelen (WEEK-68)', () => {
  test('kiest recepten die de gevraagde kooktijd en stijl hebben', () => {
    const p = pool(dbRecept(1, { kooktijdMin: 15, stijl: 'italiaans' }), dbRecept(2, { kooktijdMin: 60, stijl: 'aziatisch' }));
    const uit = plan(p, { aantalDagen: 1, kooktijden: ['snel'], stijlen: ['italiaans'] })!;
    assert.equal(uit.dagen[0].recept.id, 'db-1');
    assert.equal(uit.versoepeld, undefined);
  });
  test('versoepelt als er niets past, en zegt dat in het plan', () => {
    const p = pool(dbRecept(1, { kooktijdMin: 60, stijl: 'aziatisch' }));
    const uit = plan(p, { aantalDagen: 1, kooktijden: ['snel'] })!;
    assert.equal(uit.dagen.length, 1);
    assert.equal(uit.versoepeld, true);
  });
  test('herhaalt geen recept zolang er genoeg andere zijn', () => {
    const p = pool(...Array.from({ length: 5 }, (_, i) => dbRecept(i + 1)));
    const uit = plan(p, { aantalDagen: 5 })!;
    assert.equal(new Set(uit.dagen.map((d) => d.recept.id)).size, 5);
  });
  test('herhaalt wel als er te weinig recepten zijn', () => {
    const uit = plan(pool(dbRecept(1)), { aantalDagen: 3 })!;
    assert.equal(uit.dagen.length, 3);
    assert.ok(uit.dagen.every((d) => d.recept.id === 'db-1'));
  });
  test('met hetzelfde seed is het plan hetzelfde (zonder het moment van maken, dat per aanroep verschilt)', () => {
    const p = pool(...Array.from({ length: 8 }, (_, i) => dbRecept(i + 1)));
    const zonderTijd = (w: ReturnType<typeof plan>) => ({ ...w, gemaaktOp: '' });
    assert.deepEqual(zonderTijd(plan(p, { seed: 42 })), zonderTijd(plan(p, { seed: 42 })));
  });
  test('het plan is van bron db en bewaart de wensen', () => {
    const uit = plan(pool(dbRecept(1)), { aantalDagen: 1, kooktijden: ['snel'], stijlen: ['klassiek'] })!;
    assert.equal(uit.bron, 'db');
    assert.deepEqual(uit.kooktijden, ['snel']);
    assert.deepEqual(uit.stijlen, ['klassiek']);
  });
});

describe('vervangDbDag (WEEK-68)', () => {
  test('vervangt enkel die dag, door een recept dat nog niet op het plan staat', () => {
    const p = pool(...Array.from({ length: 4 }, (_, i) => dbRecept(i + 1)));
    const origineel = plan(p, { aantalDagen: 2, seed: 7 })!;
    const nieuw = vervangDbDag(origineel, 0, p, 99);
    assert.equal(nieuw.dagen[1].recept.id, origineel.dagen[1].recept.id);
    assert.notEqual(nieuw.dagen[0].recept.id, origineel.dagen[0].recept.id);
    assert.notEqual(nieuw.dagen[0].recept.id, nieuw.dagen[1].recept.id);
  });
  test('een ongeldige dag verandert niets', () => {
    const p = pool(dbRecept(1), dbRecept(2));
    const origineel = plan(p, { aantalDagen: 1 })!;
    assert.equal(vervangDbDag(origineel, 5, p, 1), origineel);
  });
  test('zonder andere recepten blijft het recept staan', () => {
    const p = pool(dbRecept(1));
    const origineel = plan(p, { aantalDagen: 1 })!;
    assert.equal(vervangDbDag(origineel, 0, p, 1).dagen[0].recept.id, 'db-1');
  });
  test('wist de kooktoestand van de vervangen dag', () => {
    const p = pool(dbRecept(1), dbRecept(2));
    const origineel = { ...plan(p, { aantalDagen: 1 })!, dagen: [{ ...plan(p, { aantalDagen: 1 })!.dagen[0], gedaan: true }] };
    assert.equal(vervangDbDag(origineel, 0, p, 3).dagen[0].gedaan, undefined);
  });
});
