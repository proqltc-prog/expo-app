import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bevestigDag,
  heeftBevestigdeDag,
  kiesRecept,
  magNieuwWeekPlan,
  MAX_DAGEN,
  nieuwWeekPlan,
} from './bevestiging';

describe('nieuwWeekPlan (WEEK-71)', () => {
  test('maakt een leeg plan voor het gekozen aantal dagen', () => {
    const week = nieuwWeekPlan(3);
    assert.equal(week.dagen.length, 3);
    assert.ok(week.dagen.every((d) => d.recept === null && d.bevestigd === false));
  });

  test('een kalender toont nooit meer dan 7 dagen', () => {
    assert.equal(MAX_DAGEN, 7);
    assert.equal(nieuwWeekPlan(10).dagen.length, 7);
  });

  test('minstens 1 dag, ook bij ongeldige invoer', () => {
    assert.equal(nieuwWeekPlan(0).dagen.length, 1);
    assert.equal(nieuwWeekPlan(-4).dagen.length, 1);
  });
});

describe('kiesRecept (WEEK-71)', () => {
  test('een open dag kan een recept krijgen en nog van recept wisselen', () => {
    const eerst = kiesRecept(nieuwWeekPlan(2), 0, 5);
    assert.equal(eerst.toegestaan, true);
    assert.equal(eerst.week.dagen[0].recept, 5);
    const andere = kiesRecept(eerst.week, 0, 9);
    assert.equal(andere.toegestaan, true);
    assert.equal(andere.week.dagen[0].recept, 9);
  });

  test('een bevestigde dag kan niet meer van recept wisselen', () => {
    const bevestigd = bevestigDag(kiesRecept(nieuwWeekPlan(2), 1, 7).week, 1).week;
    const poging = kiesRecept(bevestigd, 1, 3);
    assert.equal(poging.toegestaan, false);
    assert.equal(poging.week.dagen[1].recept, 7);
  });

  test('een ongeldige dag wordt geweigerd', () => {
    assert.equal(kiesRecept(nieuwWeekPlan(2), 5, 1).toegestaan, false);
    assert.equal(kiesRecept(nieuwWeekPlan(2), -1, 1).toegestaan, false);
  });
});

describe('bevestigDag (WEEK-71)', () => {
  test('een dag zonder recept kan niet bevestigd worden', () => {
    const uitkomst = bevestigDag(nieuwWeekPlan(2), 0);
    assert.equal(uitkomst.toegestaan, false);
    assert.equal(uitkomst.week.dagen[0].bevestigd, false);
  });

  test('een dag met recept wordt bevestigd en ligt vast', () => {
    const gekozen = kiesRecept(nieuwWeekPlan(2), 0, 4).week;
    const uitkomst = bevestigDag(gekozen, 0);
    assert.equal(uitkomst.toegestaan, true);
    assert.equal(uitkomst.week.dagen[0].bevestigd, true);
    assert.equal(uitkomst.week.dagen[1].bevestigd, false);
  });

  test('een dag kan niet twee keer bevestigd worden', () => {
    const eenmaal = bevestigDag(kiesRecept(nieuwWeekPlan(1), 0, 4).week, 0);
    assert.equal(bevestigDag(eenmaal.week, 0).toegestaan, false);
  });

  test('een ongeldige dag wordt geweigerd', () => {
    assert.equal(bevestigDag(nieuwWeekPlan(1), 3).toegestaan, false);
  });
});

describe('magNieuwWeekPlan (WEEK-71)', () => {
  test('zonder bevestigde dagen mag je altijd een nieuw plan maken, zonder reset', () => {
    const week = kiesRecept(nieuwWeekPlan(2), 0, 4).week;
    assert.deepEqual(magNieuwWeekPlan(week, false), { toegestaan: true, resetNodig: false });
  });

  test('met een bevestigde dag is een reset nodig en mag het pas na bevestiging', () => {
    const week = bevestigDag(kiesRecept(nieuwWeekPlan(2), 0, 4).week, 0).week;
    assert.equal(heeftBevestigdeDag(week), true);
    assert.deepEqual(magNieuwWeekPlan(week, false), { toegestaan: false, resetNodig: true });
    assert.deepEqual(magNieuwWeekPlan(week, true), { toegestaan: true, resetNodig: true });
  });
});
