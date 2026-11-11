import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { dagenTussen, datumToestel, houdbaarStatus, isoDatum, leesDatum, naarInvoerDatum, startMaand, vandaag, WAARSCHUW_DAGEN } from '@/lib/houdbaarheid';

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

describe('datum in het formaat van het toestel (WEEK-242)', () => {
  test('volgt de taal en het formaat van het toestel', () => {
    assert.equal(datumToestel('2026-11-20', 'nl-BE'), new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(2026, 10, 20, 12)));
    assert.match(datumToestel('2026-11-20', 'en-US'), /Nov 20, 2026/);
    assert.match(datumToestel('2026-11-20', 'fr-BE'), /20 nov\.? 2026/);
  });
  test('een ongeldige datum geeft lege tekst', () => {
    assert.equal(datumToestel('2026-02-31', 'nl-BE'), '');
    assert.equal(datumToestel('morgen', 'nl-BE'), '');
  });
  test('de kalender opent op de gekozen maand, anders op deze maand', () => {
    assert.deepEqual(startMaand('2027-03-05', '2026-11-11'), { jaar: 2027, maand: 2 });
    assert.deepEqual(startMaand(undefined, '2026-11-11'), { jaar: 2026, maand: 10 });
    assert.deepEqual(startMaand('rommel', '2026-11-11'), { jaar: 2026, maand: 10 });
  });
  test('naar het oude invoerformaat en terug (regressie popup)', () => {
    assert.equal(naarInvoerDatum('2026-11-20'), '20-11-2026');
    assert.equal(leesDatum(naarInvoerDatum('2026-11-20')), '2026-11-20');
    assert.equal(naarInvoerDatum(undefined), '');
  });
});
