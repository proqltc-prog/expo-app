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
  vernieuwKooktijden,
  KOOKTIJD_IDS,
  STIJL_IDS,
} from '@/lib/planner/opties';

const ids = (lijst: { id: string }[]) => lijst.map((o) => o.id);

describe('kooktijd voor avondeten (WEEK-199: snel, gemiddeld en uitgebreid)', () => {
  test('avond heeft Snel, Gemiddeld en Uitgebreid', () => {
    assert.deepEqual(kooktijdOpties('avond').map((o) => o.naam), ['Snel', 'Gemiddeld', 'Uitgebreid']);
  });
  test('de namen "chef" en "verfijnd" komen niet meer voor', () => {
    const namen = kooktijdOpties('avond').map((o) => o.naam.toLowerCase());
    assert.equal(namen.some((n) => n.includes('chef') || n.includes('verfijnd')), false);
  });
  test('avond: tot 30 minuten snel, 31 tot 45 gemiddeld, 46 tot 60 uitgebreid, daarboven niets', () => {
    assert.equal(kooktijdVan('avond', 1), 'snel');
    assert.equal(kooktijdVan('avond', 30), 'snel');
    assert.equal(kooktijdVan('avond', 31), 'gemiddeld');
    assert.equal(kooktijdVan('avond', 45), 'gemiddeld');
    assert.equal(kooktijdVan('avond', 46), 'uitgebreid');
    assert.equal(kooktijdVan('avond', 60), 'uitgebreid');
    assert.equal(kooktijdVan('avond', 61), undefined);
  });
  test('de kooktijd-ids zijn snel, gemiddeld en uitgebreid, in die volgorde', () => {
    assert.deepEqual(KOOKTIJD_IDS, ['snel', 'gemiddeld', 'uitgebreid']);
  });
  test('de bereiken sluiten op elkaar aan en lopen tot 60', () => {
    const [snel, gemiddeld, uitgebreid] = kooktijdOpties('avond');
    assert.equal(snel.van, 1);
    assert.equal(gemiddeld.van, snel.tot + 1);
    assert.equal(uitgebreid.van, gemiddeld.tot + 1);
    assert.equal(uitgebreid.tot, 60);
  });
});

describe('oude kooktijdkeuzes omzetten (WEEK-199)', () => {
  test('"verfijnd" (31–50 min) wordt gemiddeld en uitgebreid', () => {
    assert.deepEqual(vernieuwKooktijden(['verfijnd']), ['gemiddeld', 'uitgebreid']);
  });
  test('huidige keuzes blijven, in vaste volgorde en zonder dubbele', () => {
    assert.deepEqual(vernieuwKooktijden(['uitgebreid', 'snel', 'snel']), ['snel', 'uitgebreid']);
    assert.deepEqual(vernieuwKooktijden(['snel', 'verfijnd']), ['snel', 'gemiddeld', 'uitgebreid']);
  });
  test('onbekende en ongeldige waarden vallen weg', () => {
    assert.deepEqual(vernieuwKooktijden(['rustig', 42, null, 'chef']), []);
    assert.deepEqual(vernieuwKooktijden([]), []);
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
