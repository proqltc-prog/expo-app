// WEEK-327: "Missie volbracht!" op de boodschappenlijst en de kaarten van de bereiding.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { kiesMissieZin, lijstVoortgang, missieVolbracht, MISSIE_ZINNEN, teKopen } from './lijstKop';
import { begrensKaart, bereidingKaarten, kookbareDag, segmentStand } from './bereiding';
import type { LijstItem } from './lijst';
import type { Weekplan } from './planner/types';

describe('WEEK-327: Missie volbracht', () => {
  test('het laatste product afgevinkt door de gebruiker', () => assert.equal(missieVolbracht(1, 0, 11, true), true));
  test('niet bij openen van een al afgevinkte lijst (vorig open = 0)', () => assert.equal(missieVolbracht(0, 0, 11, true), false));
  test('niet door een ander gezinslid (sync)', () => assert.equal(missieVolbracht(1, 0, 11, false), false));
  test('niet bij een lege lijst', () => assert.equal(missieVolbracht(1, 0, 0, true), false));
  test('niet als er nog iets open staat', () => assert.equal(missieVolbracht(3, 2, 11, true), false));
  test('de zin wisselt en blijft binnen 1 … N', () => {
    for (let k = 0; k < 1; k += 0.05) {
      const n = kiesMissieZin(k);
      assert.ok(n >= 1 && n <= MISSIE_ZINNEN);
      assert.notEqual(kiesMissieZin(k, n), n);
    }
    assert.equal(kiesMissieZin(0.99999, MISSIE_ZINNEN), 1);
  });
});

describe('WEEK-327: voortgang over de hele lijst', () => {
  const item = (id: string, afgevinkt: boolean, recept = true): LijstItem =>
    recept
      ? { id, naam: 'tomaat', code: 'tomaat', categorie: 'avondeten', afdeling: 'groenten-fruit', hoeveelheid: 2, eenheid: 'stuk', afgevinkt, recept: { dag: 'maandag', naam: 'Pasta', id: 'r1' } }
      : { id, naam: 'wc-papier', categorie: 'extra', hoeveelheid: 1, eenheid: 'stuk', afgevinkt };
  test('telt beide tabbladen en blijft gelijk met de teller Te kopen (regressie)', () => {
    const items = [item('a', true), item('b', false, false)];
    const v = lijstVoortgang(items, 'recept');
    assert.equal(v.open, teKopen(items, 'recept').totaal);
    assert.equal(v.totaal >= 2, true);
  });
});

describe('WEEK-327: bereiding als kaarten', () => {
  test('eerst de ingrediënten, dan de stappen', () =>
    assert.deepEqual(bereidingKaarten(['A', 'B'], true), [{ soort: 'ingredienten' }, { soort: 'stap', nummer: 1, tekst: 'A' }, { soort: 'stap', nummer: 2, tekst: 'B' }]));
  test('zonder ingrediënten meteen stap 1', () => assert.deepEqual(bereidingKaarten(['A'], false), [{ soort: 'stap', nummer: 1, tekst: 'A' }]));
  test('stappenbalk', () => assert.deepEqual([0, 1, 2].map((i) => segmentStand(i, 1)), ['gedaan', 'huidig', 'nog']));
  test('kaart begrenzen (vegen voorbij het einde)', () => {
    assert.equal(begrensKaart(-1, 5), 0);
    assert.equal(begrensKaart(7, 5), 4);
    assert.equal(begrensKaart(2.4, 5), 2);
    assert.equal(begrensKaart(3, 0), 0);
  });
});

describe('WEEK-327: welke dag gaat op gekookt', () => {
  const dag = (id: string, bevestigd: boolean, gedaan = false) => ({ dag: 'maandag', recept: { id, naam: id }, bevestigd, gedaan });
  const plan = { gemaaktOp: 'x', dagen: [dag('a', true, true), dag('b', false), dag('a', true), dag('c', true)] } as unknown as Weekplan;
  test('de dag uit het weekmenu gaat voor', () => assert.equal(kookbareDag(plan, 'c', 3), 3));
  test('een gekookte of andere dag als voorkeur: de eerste kookbare met dit recept', () => assert.equal(kookbareDag(plan, 'a', 0), 2));
  test('niet bevestigd: niets', () => assert.equal(kookbareDag(plan, 'b'), undefined));
  test('geen plan of onbekend recept: niets', () => {
    assert.equal(kookbareDag(null, 'a'), undefined);
    assert.equal(kookbareDag(plan, 'z'), undefined);
  });
});
