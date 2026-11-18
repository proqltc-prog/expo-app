import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dbReceptId, markeerVerstuurd, moetVragen, naarRij, normaliseerBeoordelingen, teVersturen, zetSterren } from './beoordeling';

const NU = '2026-11-18T22:00:00.000Z';
const LATER = '2026-11-18T22:05:00.000Z';

test('WEEK-316: enkel gerechten van de app krijgen sterren', () => {
  assert.equal(dbReceptId('db-123'), 123);
  assert.equal(dbReceptId('eigen-1'), undefined);
  assert.equal(dbReceptId(undefined), undefined);
  assert.equal(dbReceptId('db-12x'), undefined);
});

test('WEEK-316: sterren zetten en wijzigen, één beoordeling per gerecht', () => {
  let l = zetSterren([], 5, 4, NU);
  assert.deepEqual(l, [{ receptId: 5, sterren: 4, op: NU, verstuurd: false }]);
  l = zetSterren(l, 5, 2, LATER);
  assert.equal(l.length, 1);
  assert.equal(l[0].sterren, 2);
});

test('WEEK-316: sterren blijven tussen 1 en 5', () => {
  assert.equal(zetSterren([], 1, 9, NU)[0].sterren, 5);
  assert.equal(zetSterren([], 1, 0, NU)[0].sterren, 1);
});

test('WEEK-316: verstuurd markeren enkel als er sindsdien niets veranderde', () => {
  const l = zetSterren([], 3, 5, NU);
  const weg = teVersturen(l);
  assert.equal(weg.length, 1);
  const gewijzigd = zetSterren(l, 3, 1, LATER);
  assert.equal(teVersturen(markeerVerstuurd(gewijzigd, weg)).length, 1);
  assert.equal(teVersturen(markeerVerstuurd(l, weg)).length, 0);
});

test('WEEK-316: vragen zolang er geen score is (na "Later" opnieuw)', () => {
  assert.equal(moetVragen([], 4), true);
  assert.equal(moetVragen(zetSterren([], 5, 4, NU), 4), true);
});

test('WEEK-316: een al beoordeeld gerecht wordt niet opnieuw gevraagd', () => {
  assert.equal(moetVragen(zetSterren([], 8, 3, NU), 8), false);
});

test('WEEK-316: normaliseren laat onbruikbare rijen weg; oude redenen vallen weg', () => {
  const l = normaliseerBeoordelingen([
    { receptId: 1, sterren: 3, redenen: ['flauw'], op: NU, verstuurd: true },
    { receptId: 2, sterren: 6 },
    { receptId: 'x', sterren: 3 },
    null,
  ]);
  assert.deepEqual(l, [{ receptId: 1, sterren: 3, op: NU, verstuurd: true }]);
  assert.deepEqual(normaliseerBeoordelingen('kapot'), []);
});

test('WEEK-316: rij voor de databank zonder naam of e-mail', () => {
  assert.deepEqual(naarRij({ receptId: 9, sterren: 2, op: NU, verstuurd: false }), { recept_id: 9, sterren: 2, bijgewerkt_op: NU });
});
