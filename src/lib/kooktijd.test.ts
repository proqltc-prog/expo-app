import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  binnenKooktijd,
  KOOKTIJD_BEREIK,
  KOOKTIJD_SCHATTING_STANDAARD,
  KOOKTIJDEN,
  kooktijdSchattingen,
  kooktijdVan,
  MAX_KOOKTIJD_MIN,
  minutenVoorKooktijd,
} from '@/lib/kooktijd';

// WEEK-199: één kooktijdindeling voor de hele app: snel tot 30, gemiddeld 31–45, uitgebreid 46–60 minuten.
describe('WEEK-199: kooktijdindeling', () => {
  test('drie kooktijden, in volgorde van kort naar lang', () => {
    assert.deepEqual(KOOKTIJDEN, ['snel', 'gemiddeld', 'uitgebreid']);
  });

  test('de bereiken sluiten op elkaar aan, van 1 tot de bovengrens van 60 minuten', () => {
    assert.equal(MAX_KOOKTIJD_MIN, 60);
    assert.deepEqual(KOOKTIJD_BEREIK.snel, { van: 1, tot: 30 });
    assert.deepEqual(KOOKTIJD_BEREIK.gemiddeld, { van: 31, tot: 45 });
    assert.deepEqual(KOOKTIJD_BEREIK.uitgebreid, { van: 46, tot: 60 });
  });

  test('kooktijdVan volgt de grenzen 30 en 45', () => {
    assert.equal(kooktijdVan(1), 'snel');
    assert.equal(kooktijdVan(30), 'snel');
    assert.equal(kooktijdVan(31), 'gemiddeld');
    assert.equal(kooktijdVan(45), 'gemiddeld');
    assert.equal(kooktijdVan(46), 'uitgebreid');
    assert.equal(kooktijdVan(60), 'uitgebreid');
  });

  test('elke minuut in een bereik hoort bij die kooktijd', () => {
    for (const code of KOOKTIJDEN) {
      for (let m = KOOKTIJD_BEREIK[code].van; m <= KOOKTIJD_BEREIK[code].tot; m++) assert.equal(kooktijdVan(m), code, `${m} min`);
    }
  });

  test('binnenKooktijd: een geheel aantal minuten van 1 tot en met 60', () => {
    assert.equal(binnenKooktijd(1), true);
    assert.equal(binnenKooktijd(60), true);
    assert.equal(binnenKooktijd(0), false);
    assert.equal(binnenKooktijd(61), false);
    assert.equal(binnenKooktijd(290), false);
    assert.equal(binnenKooktijd(12.5), false);
    assert.equal(binnenKooktijd(Number.NaN), false);
  });
});

describe('WEEK-199: geschatte tijd per kooktijd uit de databank', () => {
  test('zonder recepten geldt de vaste schatting', () => {
    assert.deepEqual(kooktijdSchattingen([]), KOOKTIJD_SCHATTING_STANDAARD);
  });

  test('de vaste schatting ligt binnen het bereik van elke kooktijd', () => {
    for (const code of KOOKTIJDEN) {
      const s = KOOKTIJD_SCHATTING_STANDAARD[code];
      assert.ok(s >= KOOKTIJD_BEREIK[code].van && s <= KOOKTIJD_BEREIK[code].tot, code);
    }
  });

  test('het afgeronde gemiddelde per kooktijd; een kooktijd zonder recepten houdt de vaste schatting', () => {
    const uit = kooktijdSchattingen([20, 25, 31, 44]);
    assert.equal(uit.snel, 23); // (20 + 25) / 2 = 22,5 → 23
    assert.equal(uit.gemiddeld, 38); // (31 + 44) / 2 = 37,5 → 38
    assert.equal(uit.uitgebreid, KOOKTIJD_SCHATTING_STANDAARD.uitgebreid);
  });

  test('recepten boven de bovengrens tellen niet mee', () => {
    const uit = kooktijdSchattingen([50, 290, 61]);
    assert.equal(uit.uitgebreid, 50);
  });

  test('de schatting blijft binnen het bereik van de kooktijd', () => {
    const uit = kooktijdSchattingen([1, 30, 31, 45, 46, 60]);
    for (const code of KOOKTIJDEN) {
      assert.ok(uit[code] >= KOOKTIJD_BEREIK[code].van && uit[code] <= KOOKTIJD_BEREIK[code].tot, code);
    }
  });
});

describe('WEEK-218: minuten uit de gekozen kooktijd', () => {
  test('geeft de geschatte tijd van die kooktijd', () => {
    assert.equal(minutenVoorKooktijd('snel'), 25);
    assert.equal(minutenVoorKooktijd('gemiddeld', { snel: 20, gemiddeld: 38, uitgebreid: 55 }), 38);
  });

  test('valt terug op de vaste schatting als de schatting buiten de kooktijd valt (regressie)', () => {
    assert.equal(minutenVoorKooktijd('snel', { snel: 45, gemiddeld: 40, uitgebreid: 56 }), 25);
  });
});
