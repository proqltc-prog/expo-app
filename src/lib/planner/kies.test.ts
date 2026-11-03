import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { BankRecept, RECEPTENBANK } from '@/data/receptenbank';
import { kooktijdVan, PlanDag, Weekplan } from '@/lib/planner/types';
import { naarPlanRecept } from '@/lib/planner/lokaal';
import { momentVan } from '@/lib/planner/moment';
import { bankReceptVermijdt } from '@/lib/planner/vermijden';
import type { LijstItem } from '@/lib/lijst';
import {
  kiesbareRecepten,
  verwijderDag,
  vervangDoorRecept,
  voegToe,
  zonderReceptVanLijst,
} from '@/lib/planner/kies';

const avond = RECEPTENBANK.find((r) => !r.moment)!;
const avond2 = RECEPTENBANK.filter((r) => !r.moment)[1];
const alle = { kooktijden: [], stijlen: [], vermijd: [], zoek: '', taal: 'nl' as const };

const dag = (d: PlanDag['dag'], r: BankRecept): PlanDag => ({
  dag: d,
  recept: naarPlanRecept(r, 'nl', 2),
});

const plan = (dagen: PlanDag[]): Weekplan => ({
  dagen,
  kooktijden: [],
  stijlen: [],
  taal: 'nl',
  porties: 2,
  bron: 'lokaal',
  gemaaktOp: '2026-10-12T10:00:00.000Z',
});

describe('kiesbareRecepten (WEEK-189: enkel avondeten)', () => {
  test('geeft enkel avondrecepten', () => {
    const res = kiesbareRecepten(RECEPTENBANK, { ...alle, moment: 'avond' });
    assert.ok(res.length > 0);
    assert.ok(res.every((r) => momentVan(r) === 'avond'));
  });

  test('recepten zonder moment zijn avondrecepten (regressie)', () => {
    const res = kiesbareRecepten(RECEPTENBANK, { ...alle, moment: 'avond' });
    assert.ok(res.some((r) => r.id === avond.id));
    assert.ok(res.every((r) => !r.moment));
  });

  test('kooktijd-filter houdt enkel de gekozen kooktijden over', () => {
    const res = kiesbareRecepten(RECEPTENBANK, { ...alle, moment: 'avond', kooktijden: ['snel'] });
    assert.ok(res.every((r) => kooktijdVan(r.minuten) === 'snel'));
  });

  test('vermijd-filter sluit recepten met een vermeden ingrediënt uit', () => {
    const res = kiesbareRecepten(RECEPTENBANK, { ...alle, moment: 'avond', vermijd: ['zuivel'] });
    assert.ok(res.every((r) => !bankReceptVermijdt(r, ['zuivel'])));
  });

  test('zoeken negeert hoofdletters en accenten', () => {
    const naam = avond.namen[0];
    const zoek = naam.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    const res = kiesbareRecepten(RECEPTENBANK, { ...alle, moment: 'avond', zoek });
    assert.ok(res.some((r) => r.id === avond.id));
  });

  test('zoeken gebruikt de naam in de gekozen taal', () => {
    const res = kiesbareRecepten(RECEPTENBANK, { ...alle, moment: 'avond', zoek: avond.namen[1], taal: 'fr' });
    assert.ok(res.some((r) => r.id === avond.id));
  });

  test('zoekterm zonder treffers geeft een lege lijst', () => {
    assert.deepEqual(kiesbareRecepten(RECEPTENBANK, { ...alle, moment: 'avond', zoek: 'zzzz-geen-recept' }), []);
  });
});

describe('vervangDoorRecept', () => {
  test('behoudt de dag, wisselt het recept', () => {
    const p = plan([dag('dinsdag', avond)]);
    const nieuw = vervangDoorRecept(p, 0, avond2);
    assert.equal(nieuw.dagen[0].dag, 'dinsdag');
    assert.equal(nieuw.dagen[0].recept.id, avond2.id);
  });

  test('voortgang (gekookt) van het oude recept gaat weg', () => {
    const p = plan([{ ...dag('maandag', avond), gedaan: true }]);
    const nieuw = vervangDoorRecept(p, 0, avond2);
    assert.equal(nieuw.dagen[0].gedaan, undefined);
  });

  test('een avondrecept blijft zonder moment-veld (regressie)', () => {
    const p = plan([dag('maandag', avond)]);
    const nieuw = vervangDoorRecept(p, 0, avond2);
    assert.equal('moment' in nieuw.dagen[0], false);
  });

  test('onbekende index laat het plan ongewijzigd', () => {
    const p = plan([dag('maandag', avond)]);
    assert.equal(vervangDoorRecept(p, 5, avond2), p);
  });
});

describe('voegToe', () => {
  test('voegt op de eerste vrije weekdag toe', () => {
    const res = voegToe(plan([]), avond2, 'avond');
    assert.equal(res?.dagen.length, 1);
    assert.equal(res?.dagen[0].dag, 'zondag');
  });

  test('avond krijgt geen moment-veld (regressie)', () => {
    const res = voegToe(plan([]), avond, 'avond');
    assert.equal('moment' in (res?.dagen[0] ?? {}), false);
  });

  test('slaat dagen over die al bezet zijn', () => {
    const res = voegToe(plan([dag('zondag', avond)]), avond2, 'avond');
    assert.equal(res?.dagen.find((d) => d.dag !== 'zondag')?.dag, 'maandag');
  });

  test('sorteert op weekdag', () => {
    const p = plan([dag('maandag', avond)]);
    const res = voegToe(p, avond2, 'avond');
    assert.deepEqual(res?.dagen.map((d) => d.dag), ['zondag', 'maandag']);
  });

  test('geeft undefined als alle dagen bezet zijn', () => {
    const vol = plan((['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'] as const).map((d) => dag(d, avond2)));
    assert.equal(voegToe(vol, avond, 'avond'), undefined);
  });
});

describe('verwijderDag', () => {
  const p = plan([dag('zondag', avond), dag('maandag', avond2)]);
  const verwacht = { gemaaktOp: p.gemaaktOp, receptNaam: p.dagen[1].recept.naam };

  test('verwijdert de maaltijd op de index', () => {
    const res = verwijderDag(p, 1, verwacht);
    assert.equal(res.dagen.length, 1);
    assert.equal(res.dagen[0].dag, 'zondag');
  });

  test('doet niets als het plan intussen veranderd is (andere gemaaktOp)', () => {
    assert.equal(verwijderDag(p, 1, { ...verwacht, gemaaktOp: 'anders' }), p);
  });

  test('doet niets als op die plek een ander recept staat (regressie)', () => {
    assert.equal(verwijderDag(p, 1, { ...verwacht, receptNaam: 'iets anders' }), p);
  });

  test('een gekookt gerecht kan niet verwijderd worden', () => {
    const gekookt = plan([{ ...dag('zondag', avond), gedaan: true }]);
    const v = { gemaaktOp: gekookt.gemaaktOp, receptNaam: gekookt.dagen[0].recept.naam };
    assert.equal(verwijderDag(gekookt, 0, v), gekookt);
  });

  test('doet niets bij een onbekende index', () => {
    assert.equal(verwijderDag(p, 9, verwacht), p);
  });
});

describe('zonderReceptVanLijst', () => {
  const item = (id: string, naam: string, recept?: LijstItem['recept']): LijstItem => ({
    id,
    naam,
    categorie: 'avondeten',
    afgevinkt: false,
    ...(recept ? { recept } : {}),
  });

  test('verwijdert enkel de items van dat recept op die dag', () => {
    const items = [
      item('1', 'ui', { dag: 'zondag', naam: 'Pasta' }),
      item('2', 'tomaat', { dag: 'zondag', naam: 'Pasta' }),
      item('3', 'melk', { dag: 'maandag', naam: 'Pasta' }),
      item('4', 'brood'),
    ];
    const res = zonderReceptVanLijst(items, 'zondag', 'Pasta');
    assert.equal(res.verwijderd, 2);
    assert.deepEqual(res.over.map((i) => i.id), ['3', '4']);
  });

  test('zonder overeenkomst blijft de lijst gelijk en is verwijderd 0', () => {
    const items = [item('1', 'ui')];
    const res = zonderReceptVanLijst(items, 'zondag', 'Pasta');
    assert.equal(res.verwijderd, 0);
    assert.deepEqual(res.over, items);
  });
});
