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

const ontbijt = RECEPTENBANK.find((r) => r.moment === 'ontbijt')!;
const middag = RECEPTENBANK.find((r) => r.moment === 'middag')!;
const avond = RECEPTENBANK.find((r) => !r.moment)!;
const alle = { kooktijden: [], stijlen: [], vermijd: [], zoek: '', taal: 'nl' as const };

const dag = (d: PlanDag['dag'], r: BankRecept, moment?: PlanDag['moment']): PlanDag => ({
  dag: d,
  ...(moment ? { moment } : {}),
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

describe('kiesbareRecepten', () => {
  test('geeft enkel recepten van het gekozen moment', () => {
    const res = kiesbareRecepten(RECEPTENBANK, { ...alle, moment: 'middag' });
    assert.ok(res.length > 0);
    assert.ok(res.every((r) => momentVan(r) === 'middag'));
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
    const naam = middag.namen[0];
    const zoek = naam.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    const res = kiesbareRecepten(RECEPTENBANK, { ...alle, moment: 'middag', zoek });
    assert.ok(res.some((r) => r.id === middag.id));
  });

  test('zoeken gebruikt de naam in de gekozen taal', () => {
    const res = kiesbareRecepten(RECEPTENBANK, { ...alle, moment: 'middag', zoek: middag.namen[1], taal: 'fr' });
    assert.ok(res.some((r) => r.id === middag.id));
  });

  test('zoekterm zonder treffers geeft een lege lijst', () => {
    assert.deepEqual(kiesbareRecepten(RECEPTENBANK, { ...alle, moment: 'avond', zoek: 'zzzz-geen-recept' }), []);
  });
});

describe('vervangDoorRecept', () => {
  test('behoudt dag en moment, wisselt het recept', () => {
    const p = plan([dag('dinsdag', ontbijt, 'ontbijt')]);
    const nieuw = vervangDoorRecept(p, 0, middag);
    assert.equal(nieuw.dagen[0].dag, 'dinsdag');
    assert.equal(nieuw.dagen[0].moment, 'ontbijt');
    assert.equal(nieuw.dagen[0].recept.id, middag.id);
  });

  test('voortgang (gekookt) van het oude recept gaat weg', () => {
    const p = plan([{ ...dag('maandag', avond), gedaan: true }]);
    const nieuw = vervangDoorRecept(p, 0, middag);
    assert.equal(nieuw.dagen[0].gedaan, undefined);
  });

  test('een avondrecept blijft zonder moment-veld (regressie)', () => {
    const p = plan([dag('maandag', avond)]);
    const nieuw = vervangDoorRecept(p, 0, middag);
    assert.equal('moment' in nieuw.dagen[0], false);
  });

  test('onbekende index laat het plan ongewijzigd', () => {
    const p = plan([dag('maandag', avond)]);
    assert.equal(vervangDoorRecept(p, 5, middag), p);
  });
});

describe('voegToe', () => {
  test('voegt op de eerste vrije weekdag toe', () => {
    const res = voegToe(plan([]), middag, 'middag');
    assert.equal(res?.dagen.length, 1);
    assert.equal(res?.dagen[0].dag, 'zondag');
    assert.equal(res?.dagen[0].moment, 'middag');
  });

  test('avond krijgt geen moment-veld (regressie)', () => {
    const res = voegToe(plan([]), avond, 'avond');
    assert.equal('moment' in (res?.dagen[0] ?? {}), false);
  });

  test('slaat dagen over die voor hetzelfde moment al bezet zijn', () => {
    const res = voegToe(plan([dag('zondag', ontbijt, 'ontbijt')]), ontbijt, 'ontbijt');
    assert.equal(res?.dagen.find((d) => d.moment === 'ontbijt' && d.dag !== 'zondag')?.dag, 'maandag');
  });

  test('een bezette dag voor een ander moment blijft vrij (regressie)', () => {
    const res = voegToe(plan([dag('zondag', avond)]), middag, 'middag');
    assert.equal(res?.dagen.find((d) => d.moment === 'middag')?.dag, 'zondag');
  });

  test('sorteert op weekdag en daarbinnen op moment', () => {
    const p = plan([dag('maandag', avond)]);
    const res = voegToe(p, ontbijt, 'ontbijt');
    assert.deepEqual(
      res?.dagen.map((d) => [d.dag, momentVan(d)]),
      [
        ['zondag', 'ontbijt'],
        ['maandag', 'avond'],
      ]
    );
  });

  test('geeft undefined als alle dagen voor dat moment bezet zijn', () => {
    const vol = plan(
      (['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'] as const).map((d) =>
        dag(d, middag, 'middag')
      )
    );
    assert.equal(voegToe(vol, middag, 'middag'), undefined);
  });
});

describe('verwijderDag', () => {
  const p = plan([dag('zondag', avond), dag('maandag', middag, 'middag')]);
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
