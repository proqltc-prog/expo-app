// WEEK-301: In huis toont de namen in de taal van het toestel, ook als een gezinslid in een andere taal afvinkte.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { FrigoItem, frigoNaamInTaal, frigoSecties, regelsInTaal } from '@/lib/frigo';

const nu = new Date('2026-11-14T10:00:00Z').toISOString();
const item = (id: string, naam: string, extra: Partial<FrigoItem> = {}): FrigoItem => ({
  id, naam, afdeling: 'groenten-fruit', toegevoegdOp: nu, bron: 'planner', ...extra,
});

describe('frigoNaamInTaal (WEEK-301)', () => {
  test('een weekmenu-ingrediënt met code volgt de taal van het toestel', () => {
    const f = item('a', 'chou-fleur', { code: 'bloemkool' });
    assert.equal(frigoNaamInTaal(f, 'nl'), 'bloemkool');
    assert.equal(frigoNaamInTaal(f, 'fr'), 'chou-fleur');
    assert.equal(frigoNaamInTaal(f, 'de'), 'Blumenkohl');
  });

  test('een oud weekmenu-item zonder code wordt via zijn naam herkend', () => {
    assert.equal(frigoNaamInTaal(item('a', 'chou-fleur'), 'nl'), 'bloemkool');
  });

  test('een onbekende naam blijft staan', () => {
    assert.equal(frigoNaamInTaal(item('a', 'iets heel raars'), 'nl'), 'iets heel raars');
  });

  test('een zelf getypt los product blijft zoals het getypt is (zelfde regel als de lijst)', () => {
    assert.equal(frigoNaamInTaal(item('a', 'chou-fleur', { bron: 'los' }), 'nl'), 'chou-fleur');
  });
});

describe('regelsInTaal (WEEK-301)', () => {
  test('vertaalt de regels en laat de bewaarde frigo ongemoeid', () => {
    const frigo = [item('a', 'chou-fleur', { code: 'bloemkool' }), item('b', 'poivron')];
    const bewaard = frigo.map((f) => ({ ...f }));
    const regels = frigoSecties(frigo).flatMap((s) => s.regels);
    const nl = regelsInTaal(regels, frigo, 'nl');
    assert.deepEqual(nl.map((r) => r.naam).sort(), ['bloemkool', 'paprika'].sort());
    assert.deepEqual(frigo, bewaard, 'enkel weergave: de bewaarde naam verandert niet');
    assert.deepEqual(nl.map((r) => r.ids), regels.map((r) => r.ids), 'ids blijven gelijk, zodat bewerken en verwijderen blijven werken');
  });

  test('geeft dezelfde regel terug als de naam al klopt (regressie)', () => {
    const frigo = [item('a', 'bloemkool', { code: 'bloemkool' })];
    const regels = frigoSecties(frigo).flatMap((s) => s.regels);
    assert.equal(regelsInTaal(regels, frigo, 'nl')[0], regels[0]);
  });
});
