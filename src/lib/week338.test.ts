// WEEK-338/339: profiel na aansluiten, teken dat er meer tekst is, einde van de bereiding.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eindeBereiding, meerOnder } from './bereiding';
import { profielNaSync, standaardProfiel, type Profiel } from './profiel';
import type { Weekplan } from './planner/types';

describe('WEEK-338: gedeeld gezinsprofiel komt binnen terwijl het scherm open is', () => {
  const leeg = standaardProfiel();
  const gedeeld: Profiel = { ...leeg, volwassenen: 2, kinderen: 2, adres: { postcode: '1000', gemeente: 'Brussel', land: 'België' } };
  it('niets gewijzigd op het scherm: het gedeelde profiel verschijnt', () => {
    assert.deepEqual(profielNaSync(leeg, leeg, gedeeld), gedeeld);
  });
  it('negatief: wat de gebruiker aan het typen is, wordt niet overschreven', () => {
    const bezig = { ...leeg, volwassenen: 3 };
    assert.deepEqual(profielNaSync(bezig, leeg, gedeeld), bezig);
  });
});

describe('WEEK-339: staat er nog tekst onder?', () => {
  it('ja als de inhoud langer is dan wat je ziet', () => {
    assert.equal(meerOnder(0, 400, 900), true);
    assert.equal(meerOnder(480, 400, 900), true);
  });
  it('nee als alles zichtbaar is of je onderaan bent (kleine afronding mag)', () => {
    assert.equal(meerOnder(0, 400, 380), false);
    assert.equal(meerOnder(500, 400, 900), false);
    assert.equal(meerOnder(497, 400, 900), false);
  });
  it('negatief: nog niet gemeten = geen teken', () => {
    assert.equal(meerOnder(0, 0, 900), false);
    assert.equal(meerOnder(0, 400, 0), false);
  });
});

describe('WEEK-339: einde van de bereiding', () => {
  const dag = (extra: object) => ({ dag: 'ma', recept: { id: 'db-1', naam: 'x', soort: 'vegetarisch', minuten: 10, stijlen: [], ingredienten: [] }, ...extra });
  const plan = (...dagen: object[]) => ({ dagen } as unknown as Weekplan);
  it('bevestigd en niet gekookt: koken', () => {
    assert.equal(eindeBereiding(plan(dag({ bevestigd: true })), 'db-1'), 'koken');
  });
  it('al gekookt: alGekookt', () => {
    assert.equal(eindeBereiding(plan(dag({ bevestigd: true, gedaan: true })), 'db-1'), 'alGekookt');
  });
  it('negatief: niet bevestigd → geen felicitatie', () => {
    assert.equal(eindeBereiding(plan(dag({})), 'db-1'), 'nietBevestigd');
    assert.equal(eindeBereiding(plan(dag({ gedaan: true })), 'db-1'), 'nietBevestigd');
    assert.equal(eindeBereiding(null, 'db-1'), 'nietBevestigd');
    assert.equal(eindeBereiding(plan(dag({ bevestigd: true })), 'db-2'), 'nietBevestigd');
  });
});
