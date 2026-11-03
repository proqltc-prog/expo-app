import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  behoudGeldige,
  kooktijdOpties,
  kooktijdVan,
  kooktijdVoorMomenten,
  standaardStijlen,
  stijlOpties,
  stijlVoorMomenten,
  vermijdOpties,
  vermijdVoorMomenten,
  KOOKTIJD_IDS,
  STIJL_IDS,
} from '@/lib/planner/opties';

const ids = (lijst: { id: string }[]) => lijst.map((o) => o.id);

describe('kooktijd voor avondeten (WEEK-189)', () => {
  test('avond heeft Snel en Verfijnd', () => {
    assert.deepEqual(kooktijdOpties('avond').map((o) => o.naam), ['Snel', 'Verfijnd']);
  });
  test('de naam "chef" komt niet meer voor (hernoemd naar Verfijnd)', () => {
    const namen = kooktijdOpties('avond').map((o) => o.naam.toLowerCase());
    assert.equal(namen.some((n) => n.includes('chef')), false);
  });
  test('avond: tot 30 minuten snel, 31 tot 50 minuten verfijnd', () => {
    assert.equal(kooktijdVan('avond', 0), 'snel');
    assert.equal(kooktijdVan('avond', 30), 'snel');
    assert.equal(kooktijdVan('avond', 31), 'verfijnd');
    assert.equal(kooktijdVan('avond', 50), 'verfijnd');
    assert.equal(kooktijdVan('avond', 51), undefined);
  });
  test('de kooktijd-ids zijn enkel snel en verfijnd', () => {
    assert.deepEqual(KOOKTIJD_IDS, ['snel', 'verfijnd']);
  });
});

describe('stijl voor avondeten (WEEK-189)', () => {
  test('de gevraagde avondstijlen staan erin', () => {
    const verwacht = ['mediterraan', 'chinees', 'indiaas', 'frans', 'mexicaans', 'italiaans', 'koreaans', 'thais', 'japans', 'belgisch'];
    assert.deepEqual(ids(stijlOpties('avond')), verwacht);
    assert.deepEqual(STIJL_IDS, verwacht);
  });
  test('"ovenschotels" en "snel en eenvoudig" zijn verwijderd', () => {
    const alle = ids(stijlOpties('avond'));
    assert.equal(alle.includes('ovenschotels'), false);
    assert.equal(alle.some((id) => id.includes('snel')), false);
  });
  test('de standaardstijl staat in de lijst van het avondmoment', () => {
    const lijst = ids(stijlOpties('avond'));
    for (const s of standaardStijlen('avond')) assert.ok(lijst.includes(s), s);
  });
});

describe('vermijden voor avondeten (WEEK-189)', () => {
  test('avond bevat alle zes ingrediënten', () => {
    assert.deepEqual(ids(vermijdOpties('avond')), ['varkensvlees', 'schaaldieren', 'zuivel', 'vis', 'eieren', 'noten']);
  });
});

describe('keuzes behouden (WEEK-184 regressie)', () => {
  test('een keuze die bij de lijst hoort, blijft staan', () => {
    assert.deepEqual(behoudGeldige(['mediterraan', 'nietbestaand'], stijlOpties('avond')), ['mediterraan']);
  });
  test('een keuze die niet meer in de lijst staat, valt weg', () => {
    assert.deepEqual(behoudGeldige(['ovenschotels'], stijlOpties('avond')), []);
  });
  test('lege keuze blijft leeg', () => {
    assert.deepEqual(behoudGeldige([], vermijdOpties('avond')), []);
  });
  test('kooktijden en vermijden van het avondmoment zijn gelijk aan de lijsten van dat moment', () => {
    assert.deepEqual(kooktijdVoorMomenten(['avond']), kooktijdOpties('avond'));
    assert.deepEqual(vermijdVoorMomenten(['avond']), vermijdOpties('avond'));
    assert.deepEqual(stijlVoorMomenten(['avond']), stijlOpties('avond'));
  });
});
