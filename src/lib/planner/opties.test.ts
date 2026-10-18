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
} from '@/lib/planner/opties';

const ids = (lijst: { id: string }[]) => lijst.map((o) => o.id);

describe('kooktijd per moment', () => {
  test('ochtend heeft Snel, Rustig en Uitgebreid', () => {
    assert.deepEqual(kooktijdOpties('ontbijt').map((o) => o.naam), ['Snel', 'Rustig', 'Uitgebreid']);
  });
  test('middag en avond hebben Snel en Verfijnd', () => {
    assert.deepEqual(kooktijdOpties('middag').map((o) => o.naam), ['Snel', 'Verfijnd']);
    assert.deepEqual(kooktijdOpties('avond'), kooktijdOpties('middag'));
  });
  test('de naam "chef" komt niet meer voor (hernoemd naar Verfijnd)', () => {
    const namen = [...kooktijdOpties('middag'), ...kooktijdOpties('ontbijt')].map((o) => o.naam.toLowerCase());
    assert.equal(namen.some((n) => n.includes('chef')), false);
  });
  test('ochtend: tot 5, tot 15 en tot 30 minuten', () => {
    assert.equal(kooktijdVan('ontbijt', 0), 'snel');
    assert.equal(kooktijdVan('ontbijt', 5), 'snel');
    assert.equal(kooktijdVan('ontbijt', 6), 'rustig');
    assert.equal(kooktijdVan('ontbijt', 15), 'rustig');
    assert.equal(kooktijdVan('ontbijt', 16), 'uitgebreid');
    assert.equal(kooktijdVan('ontbijt', 30), 'uitgebreid');
    assert.equal(kooktijdVan('ontbijt', 31), undefined);
  });
  test('middag en avond: tot 30 minuten en 30 tot 50 minuten', () => {
    assert.equal(kooktijdVan('middag', 30), 'snel');
    assert.equal(kooktijdVan('middag', 31), 'verfijnd');
    assert.equal(kooktijdVan('avond', 50), 'verfijnd');
    assert.equal(kooktijdVan('avond', 51), undefined);
  });
});

describe('stijl per moment', () => {
  test('de gevraagde middag- en avondstijlen staan erin', () => {
    const verwacht = ['mediterraan', 'chinees', 'indiaas', 'frans', 'mexicaans', 'italiaans', 'koreaans', 'thais', 'japans', 'belgisch'];
    assert.deepEqual(ids(stijlOpties('middag')), verwacht);
    assert.deepEqual(ids(stijlOpties('avond')), verwacht);
  });
  test('"ovenschotels" en "snel en eenvoudig" zijn verwijderd', () => {
    for (const m of ['ontbijt', 'middag', 'avond'] as const) {
      const alle = ids(stijlOpties(m));
      assert.equal(alle.includes('ovenschotels'), false);
      assert.equal(alle.some((id) => id.includes('snel')), false);
    }
  });
  test('ochtend heeft eigen stijlen en geen landenkeuken', () => {
    assert.deepEqual(ids(stijlOpties('ontbijt')), ['hartig', 'zoet', 'mediterraan', 'belgisch']);
  });
  test('de standaardstijl staat altijd in de lijst van het moment', () => {
    for (const m of ['ontbijt', 'middag', 'avond'] as const) {
      const lijst = ids(stijlOpties(m));
      for (const s of standaardStijlen(m)) assert.ok(lijst.includes(s), `${m}: ${s}`);
    }
  });
});

describe('vermijden per moment', () => {
  test('ochtend heeft alleen zuivel, eieren en noten', () => {
    const ontbijt = ids(vermijdOpties('ontbijt'));
    assert.deepEqual(ontbijt, ['zuivel', 'eieren', 'noten']);
  });
  test('middag en avond bevatten alle zes', () => {
    assert.deepEqual(ids(vermijdOpties('middag')), ['varkensvlees', 'schaaldieren', 'zuivel', 'vis', 'eieren', 'noten']);
    assert.deepEqual(ids(vermijdOpties('avond')), ids(vermijdOpties('middag')));
  });
});

describe('keuzes bij wisselen van moment', () => {
  test('een keuze die bij het nieuwe moment past, blijft staan', () => {
    assert.deepEqual(behoudGeldige(['mediterraan', 'thais'], stijlOpties('ontbijt')), ['mediterraan']);
  });
  test('een keuze die niet meer bij het moment hoort, valt weg', () => {
    assert.deepEqual(behoudGeldige(['thais', 'japans'], stijlOpties('ontbijt')), []);
  });
  test('lege keuze blijft leeg', () => {
    assert.deepEqual(behoudGeldige([], vermijdOpties('ontbijt')), []);
  });
});

describe('keuzes van meerdere momenten', () => {
  test('kooktijden van ontbijt en avond zonder dubbele, in volgorde', () => {
    assert.deepEqual(kooktijdVoorMomenten(['ontbijt', 'avond']).map((o) => o.id), ['snel', 'rustig', 'uitgebreid', 'verfijnd']);
  });
  test('stijlen van middag en ontbijt zonder dubbele', () => {
    const ids = stijlVoorMomenten(['middag', 'ontbijt']).map((o) => o.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.includes('hartig') && ids.includes('thais'));
  });
  test('vermijden van één moment is gelijk aan dat moment', () => {
    assert.deepEqual(vermijdVoorMomenten(['avond']), vermijdOpties('avond'));
  });
});
