import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { dagenTussen, houdbaarStatus, isoDatum, leesDatum, vandaag, WAARSCHUW_DAGEN } from '@/lib/houdbaarheid';

// Lokale middag, zodat tijdzones de dag niet verschuiven.
const nu = new Date(2026, 9, 17, 12, 0, 0); // 17 oktober 2026

describe('leesDatum (WEEK-20)', () => {
  test('leest dd-mm-jjjj en dd/mm/jjjj als yyyy-mm-dd', () => {
    assert.equal(leesDatum('20-10-2026'), '2026-10-20');
    assert.equal(leesDatum('20/10/2026'), '2026-10-20');
    assert.equal(leesDatum(' 5-1-2027 '), '2027-01-05');
  });

  test('weigert datums die niet bestaan', () => {
    assert.equal(leesDatum('31-02-2026'), undefined);
    assert.equal(leesDatum('29-02-2027'), undefined, '2027 is geen schrikkeljaar');
    assert.equal(leesDatum('29-02-2028'), '2028-02-29');
  });

  test('weigert tekst en onvolledige datums', () => {
    assert.equal(leesDatum('morgen'), undefined);
    assert.equal(leesDatum('20-10'), undefined);
    assert.equal(leesDatum(''), undefined);
  });
});

describe('houdbaarStatus (WEEK-20)', () => {
  test('zonder datum: niet gekend, nooit geschat', () => {
    assert.equal(houdbaarStatus(undefined, nu), 'onbekend');
  });

  test('datum in het verleden: verlopen', () => {
    assert.equal(houdbaarStatus('2026-10-16', nu), 'verlopen');
  });

  test('vandaag en tot de waarschuwingsgrens: bijna verlopen', () => {
    assert.equal(houdbaarStatus('2026-10-17', nu), 'bijnaVerlopen');
    assert.equal(houdbaarStatus('2026-10-20', nu), 'bijnaVerlopen', `${WAARSCHUW_DAGEN} dagen`);
  });

  test('ruimschoots in de toekomst: ok', () => {
    assert.equal(houdbaarStatus('2026-10-21', nu), 'ok');
    assert.equal(houdbaarStatus('2027-01-01', nu), 'ok');
  });

  test('vergelijkt op de dag, niet op het uur', () => {
    const laat = new Date(2026, 9, 17, 23, 59, 0);
    assert.equal(houdbaarStatus('2026-10-17', laat), 'bijnaVerlopen');
    assert.equal(houdbaarStatus('2026-10-16', laat), 'verlopen');
  });
});

describe('dagenTussen en vandaag', () => {
  test('telt dagen over de maand- en jaargrens', () => {
    assert.equal(dagenTussen('2026-12-30', '2027-01-02'), 3);
    assert.equal(dagenTussen('2026-03-01', '2026-02-28'), -1);
  });

  test('vandaag is de lokale datum', () => {
    assert.equal(vandaag(nu), '2026-10-17');
  });
});

describe('isoDatum (opgeslagen datum)', () => {
  test('accepteert alleen een bestaande yyyy-mm-dd', () => {
    assert.equal(isoDatum('2026-10-20'), '2026-10-20');
    assert.equal(isoDatum('2026-02-31'), undefined);
    assert.equal(isoDatum('20-10-2026'), undefined, 'andere vorm niet opgeslagen');
    assert.equal(isoDatum(42), undefined);
    assert.equal(isoDatum(undefined), undefined);
  });
});
