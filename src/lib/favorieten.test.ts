import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bewaarFavoriet,
  favorietId,
  favorietUitDag,
  isFavoriet,
  kookboek,
  leesFavoriet,
  naarPlanRecept,
  normaliseerFavorieten,
  verwijderFavoriet,
} from '@/lib/favorieten';
import type { PlanDag } from '@/lib/planner/types';

const NU = new Date('2026-10-10T19:00:00Z');
const dag: PlanDag = {
  dag: 'zondag',
  gedaan: true,
  recept: {
    id: 'linzencurry', naam: 'Linzencurry met rijst', soort: 'vegetarisch', minuten: 30, stijlen: ['aziatisch'], basis: 'rijst',
    ingredienten: [
      { naam: 'rode linzen', hoeveelheid: 210, eenheid: 'g', afdeling: 'droge-voeding' },
      { naam: 'kokosmelk', hoeveelheid: 300, eenheid: 'ml', afdeling: 'conserven-sauzen' },
      { naam: 'ui', hoeveelheid: 1.5, eenheid: 'stuk', afdeling: 'groenten-fruit' },
    ],
  },
};

describe('favorietUitDag (WEEK-21)', () => {
  test('bewaart naam, stijl, kooktijd, ingrediënten en aantal personen', () => {
    const f = favorietUitDag(dag, 3, 4, NU, 'Maarten');
    assert.equal(f.naam, 'Linzencurry met rijst');
    assert.deepEqual(f.stijlen, ['aziatisch']);
    assert.equal(f.minuten, 30);
    assert.equal(f.personen, 4);
    assert.equal(f.porties, 3);
    assert.deepEqual(f.ingredienten, dag.recept.ingredienten);
    assert.equal(f.door, 'Maarten');
    assert.equal(f.opgeslagenOp, NU.toISOString());
    assert.notEqual(f.ingredienten, dag.recept.ingredienten, 'een kopie, geen verwijzing');
  });
  test('zonder naam van wie bewaarde, geen veld door', () => {
    assert.ok(!('door' in favorietUitDag(dag, 3, 4, NU)));
  });
});

describe('favorietId', () => {
  test('dezelfde naam (hoofdletters, accenten, spaties) = dezelfde id', () => {
    assert.equal(favorietId('Linzencurry met rijst'), favorietId('  linzencurry MET rijst '));
    assert.equal(favorietId('Crème brûlée'), favorietId('creme brulee'));
    assert.notEqual(favorietId('Pasta pesto'), favorietId('Pasta tonijn'));
    assert.equal(favorietId('!!!'), 'fav:recept');
  });
});

describe('kookboek bijhouden', () => {
  const a = favorietUitDag(dag, 3, 4, NU);
  const b = favorietUitDag({ ...dag, recept: { ...dag.recept, naam: 'Appeltaart' } }, 3, 4, NU);

  test('hetzelfde recept twee keer bewaren = één favoriet, bijgewerkt', () => {
    const een = bewaarFavoriet([], a);
    const twee = bewaarFavoriet(een, { ...a, minuten: 35 });
    assert.equal(twee.length, 1);
    assert.equal(twee[0].minuten, 35);
    assert.ok(isFavoriet(twee, 'linzencurry met rijst'));
    assert.ok(!isFavoriet(twee, 'Appeltaart'));
  });
  test('verwijderen en alfabetisch tonen', () => {
    const lijst = bewaarFavoriet(bewaarFavoriet([], a), b);
    assert.deepEqual(kookboek(lijst).map((f) => f.naam), ['Appeltaart', 'Linzencurry met rijst']);
    assert.deepEqual(verwijderFavoriet(lijst, a.id).map((f) => f.naam), ['Appeltaart']);
  });
});

describe('naarPlanRecept', () => {
  const f = favorietUitDag(dag, 3, 4, NU);
  test('zelfde aantal porties = zelfde hoeveelheden', () => {
    assert.deepEqual(naarPlanRecept(f, 3).ingredienten.map((i) => i.hoeveelheid), [210, 300, 1.5]);
  });
  test('herrekent naar het huidige gezin en rondt af naar koopbare hoeveelheden', () => {
    assert.deepEqual(naarPlanRecept(f, 2).ingredienten.map((i) => i.hoeveelheid), [140, 200, 1]);
    assert.deepEqual(naarPlanRecept(f, 4.5).ingredienten.map((i) => i.hoeveelheid), [320, 450, 3]);
  });
  test('neemt naam, soort, kooktijd en stijlen over', () => {
    const r = naarPlanRecept(f, 3);
    assert.deepEqual([r.naam, r.soort, r.minuten, r.stijlen, r.basis, r.id], ['Linzencurry met rijst', 'vegetarisch', 30, ['aziatisch'], 'rijst', f.id]);
  });
});

describe('leesFavoriet / normaliseerFavorieten', () => {
  test('leest een bewaarde favoriet ongewijzigd in', () => {
    const f = favorietUitDag(dag, 3, 4, NU, 'Pauline');
    assert.deepEqual(leesFavoriet(JSON.parse(JSON.stringify(f))), f);
  });
  test('slaat onbruikbare favorieten over en herstelt foute velden', () => {
    const ok = { id: 'fav:x', naam: ' X ', soort: 'vis', ingredienten: [{ naam: 'zalm', hoeveelheid: -1, afdeling: 'maan' }, { naam: '' }], stijlen: ['italiaans', 'raar'], minuten: -5 };
    const lijst = normaliseerFavorieten([ok, { id: 'y', naam: 'Y', soort: 'snoep', ingredienten: [] }, null, 'tekst']);
    assert.equal(lijst.length, 1);
    assert.equal(lijst[0].naam, 'X');
    assert.deepEqual(lijst[0].ingredienten, [{ naam: 'zalm', hoeveelheid: 0, eenheid: '', afdeling: 'droge-voeding' }]);
    assert.deepEqual(lijst[0].stijlen, ['italiaans']);
    assert.equal(lijst[0].minuten, 30);
    assert.equal(lijst[0].personen, 1);
    assert.deepEqual(normaliseerFavorieten({}), []);
  });
});
