import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DbRecept, leesDbRecept, leesSeizoenen } from '@/lib/planner/db';
import { DbPoolRecept, maakDbPool, planUitDatabase, vervangDbDag } from '@/lib/planner/dbplan';
import { standaardProfiel } from '@/lib/profiel';
import type { PlanVerzoek } from '@/lib/planner/types';

// Een zomerdag (6 juli 2026) voor de seizoenstests (WEEK-156).
// Een plan mag enkel datums binnen 7 dagen bevatten, dus voor twee seizoenen op één plan nemen we de grens zomer/herfst.
const ZOMERDAG = '2026-07-06';
const GRENS = ['2026-08-31', '2026-09-01'] as const;

const verzoek = (wijziging: Partial<PlanVerzoek> = {}): PlanVerzoek => ({
  kooktijden: [],
  stijlen: [],
  profiel: standaardProfiel(),
  taal: 'nl',
  seed: 1,
  momenten: ['avond'],
  ...wijziging,
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

const zomer = dbRecept(1, { seizoenen: ['zomer'] });
const herfst = dbRecept(2, { seizoenen: ['herfst'] });
const winter = dbRecept(8, { seizoenen: ['winter'] });
const jaar = dbRecept(3, { seizoenen: [] });

describe('leesDbRecept en seizoenen (WEEK-156)', () => {
  test('leest de seizoenen uit de databank, onbekende waarden vallen weg', () => {
    const r = leesDbRecept({ id: 1, kooktijd_min: 20, seizoenen: ['zomer', 'onzin', 'herfst'] });
    assert.deepEqual(r?.seizoenen, ['zomer', 'herfst']);
  });
  test('zonder seizoenenkolom is het recept het hele jaar', () => {
    assert.deepEqual(leesDbRecept({ id: 1, kooktijd_min: 20 })?.seizoenen, []);
    assert.deepEqual(leesSeizoenen(undefined), []);
    assert.deepEqual(leesSeizoenen('zomer'), []);
  });
  test('seizoenen komen in vaste volgorde: lente, zomer, herfst, winter', () => {
    assert.deepEqual(leesSeizoenen(['winter', 'lente', 'zomer']), ['lente', 'zomer', 'winter']);
  });
  test('maakDbPool neemt de seizoenen mee', () => {
    const [k] = pool(zomer);
    assert.deepEqual(k.seizoenen, ['zomer']);
    assert.deepEqual(pool(dbRecept(9))[0].seizoenen, []);
  });
});

describe('planUitDatabase per seizoen (WEEK-156)', () => {
  test('op een zomerdag komt geen winterrecept op het plan', () => {
    const uit = planUitDatabase(verzoek({ datums: [ZOMERDAG] }), pool(winter, zomer))!;
    assert.equal(uit.dagen.length, 1);
    assert.equal(uit.dagen[0].recept.id, 'db-1');
  });
  test('op een zomerdag kiest de planner steeds het zomerrecept boven het recept van het hele jaar', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const uit = planUitDatabase(verzoek({ datums: [ZOMERDAG], seed }), pool(zomer, jaar))!;
      assert.equal(uit.dagen[0].recept.id, 'db-1', `seed ${seed}`);
    }
  });
  test('terugval naar het hele jaar als er geen seizoensrecept voor het moment is', () => {
    const uit = planUitDatabase(verzoek({ datums: [ZOMERDAG] }), pool(winter, jaar))!;
    assert.equal(uit.dagen[0].recept.id, 'db-3');
  });
  test('geen passend recept (enkel een winterrecept op een zomerdag): de plek blijft leeg', () => {
    const uit = planUitDatabase(verzoek({ datums: [ZOMERDAG] }), pool(winter))!;
    assert.equal(uit.dagen.length, 0);
  });
  test('de kooktijd gaat voor het seizoen: een hele-jaar recept dat past bij de kooktijd wint van een langer zomerrecept', () => {
    const langZomer = dbRecept(4, { seizoenen: ['zomer'], kooktijdMin: 120 });
    const uit = planUitDatabase(verzoek({ datums: [ZOMERDAG], kooktijden: ['snel'] }), pool(langZomer, jaar))!;
    assert.equal(uit.dagen[0].recept.id, 'db-3');
  });
  test('per dag een ander seizoen: zomerdag en herfstdag krijgen elk een passend recept', () => {
    const uit = planUitDatabase(verzoek({ datums: [...GRENS] }), pool(zomer, herfst))!;
    const perDatum = Object.fromEntries(uit.dagen.map((d) => [d.datum, d.recept.id]));
    assert.deepEqual(perDatum, { '2026-08-31': 'db-1', '2026-09-01': 'db-2' });
  });
  test('het seizoen geldt per moment: ontbijt en avond op dezelfde dag kiezen allebei uit het seizoen', () => {
    const ontbijtZomer = dbRecept(5, { moment: 'ontbijt', seizoenen: ['zomer'] });
    const ontbijtWinter = dbRecept(6, { moment: 'ontbijt', seizoenen: ['winter'] });
    const uit = planUitDatabase(verzoek({ datums: [ZOMERDAG], momenten: ['ontbijt', 'avond'] }), pool(zomer, ontbijtZomer, ontbijtWinter))!;
    assert.deepEqual(uit.dagen.map((d) => d.recept.id), ['db-5', 'db-1']);
  });

  test('regressie: zonder datums is er geen seizoensfilter; een winterrecept kan dan gewoon gekozen worden', () => {
    const uit = planUitDatabase(verzoek({ seed: 1 }), pool(herfst))!;
    assert.equal(uit.dagen[0].recept.id, 'db-2');
  });
  test('regressie: recepten zonder seizoenen gedragen zich als voorheen op een datum', () => {
    const uit = planUitDatabase(verzoek({ datums: [...GRENS] }), pool(jaar))!;
    assert.deepEqual(uit.dagen.map((d) => d.recept.id), ['db-3', 'db-3']);
  });
  test('regressie: het plan houdt de datums bij elke dag', () => {
    const uit = planUitDatabase(verzoek({ datums: [ZOMERDAG] }), pool(zomer))!;
    assert.equal(uit.dagen[0].datum, ZOMERDAG);
  });
});

describe('vervangDbDag met seizoen (WEEK-156)', () => {
  test('een vervangen dag blijft in het seizoen van de dag', () => {
    const p = pool(zomer, dbRecept(7, { seizoenen: ['zomer'] }), winter);
    const plan = planUitDatabase(verzoek({ datums: [ZOMERDAG] }), p)!;
    const vervangen = vervangDbDag(plan, 0, p, 3);
    assert.notEqual(vervangen.dagen[0].recept.id, 'db-2');
    assert.ok(['db-1', 'db-7'].includes(vervangen.dagen[0].recept.id));
  });
});
