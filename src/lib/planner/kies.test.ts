import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { PlanDag, Weekplan } from '@/lib/planner/types';
import { heeftVermijdNaam } from '@/lib/planner/vermijden';
import { testPool } from '@/lib/planner/testrecepten';
import type { LijstItem } from '@/lib/lijst';
import {
  kiesbarePoolRecepten,
  soortToegelaten,
  startSoorten,
  verwijderDag,
  wisselSoort,
  vervangDoorPlanRecept,
  voegPlanReceptToe,
  zonderReceptVanLijst,
} from '@/lib/planner/kies';

const pool = testPool('nl', { volwassenen: 2, kinderen: 0 });
const poolFr = testPool('fr', { volwassenen: 2, kinderen: 0 });
const avond = pool[0];
const avond2 = pool[1];
const alle = { kooktijden: [], stijlen: [], vermijd: [], zoek: '', taal: 'nl' as const };

const dag = (d: PlanDag['dag'], k: typeof avond): PlanDag => ({
  dag: d,
  recept: k.recept,
});

const plan = (dagen: PlanDag[]): Weekplan => ({
  dagen,
  kooktijden: [],
  stijlen: [],
  taal: 'nl',
  porties: 2,
  bron: 'db',
  gemaaktOp: '2026-10-12T10:00:00.000Z',
});

describe('kiesbarePoolRecepten (WEEK-189: enkel avondeten)', () => {
  test('geeft enkel avondrecepten', () => {
    const res = kiesbarePoolRecepten(pool, { ...alle, moment: 'avond' });
    assert.ok(res.length > 0);
    assert.ok(res.every((k) => k.moment === 'avond'));
  });

  test('zonder voorwaarden blijft elk recept uit de databank over (regressie)', () => {
    const res = kiesbarePoolRecepten(pool, { ...alle, moment: 'avond' });
    assert.equal(res.length, pool.length);
    assert.ok(res.some((k) => k.recept.id === avond.recept.id));
  });

  test('kooktijd-filter houdt enkel de gekozen kooktijden over', () => {
    const res = kiesbarePoolRecepten(pool, { ...alle, moment: 'avond', kooktijden: ['snel'] });
    assert.ok(res.length > 0);
    assert.ok(res.every((k) => k.kooktijd === 'snel' && k.recept.minuten <= 30));
    assert.ok(res.length < pool.length, 'er zijn ook recepten die niet snel zijn');
  });

  test('vermijd-filter sluit recepten met een vermeden ingrediënt uit', () => {
    const res = kiesbarePoolRecepten(pool, { ...alle, moment: 'avond', vermijd: ['zuivel'] });
    assert.ok(res.length > 0);
    assert.ok(res.every((k) => !heeftVermijdNaam(k.recept.ingredienten, ['zuivel'])));
    assert.ok(pool.some((k) => heeftVermijdNaam(k.recept.ingredienten, ['zuivel'])), 'de testrecepten bevatten zuivel');
  });

  test('zoeken negeert hoofdletters en accenten', () => {
    const naam = avond.recept.naam;
    const zoek = naam.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    const res = kiesbarePoolRecepten(pool, { ...alle, moment: 'avond', zoek });
    assert.ok(res.some((k) => k.recept.id === avond.recept.id));
  });

  test('zoeken gebruikt de naam in de taal van de pool', () => {
    const frans = poolFr.find((k) => k.recept.id === avond.recept.id)!;
    assert.notEqual(frans.recept.naam, avond.recept.naam);
    const res = kiesbarePoolRecepten(poolFr, { ...alle, moment: 'avond', zoek: frans.recept.naam, taal: 'fr' });
    assert.ok(res.some((k) => k.recept.id === avond.recept.id));
  });

  test('zoekterm zonder treffers geeft een lege lijst', () => {
    assert.deepEqual(kiesbarePoolRecepten(pool, { ...alle, moment: 'avond', zoek: 'zzzz-geen-recept' }), []);
  });
});

describe('soortfilter (WEEK-216)', () => {
  const soorten = new Set(pool.map((k) => k.soort));

  test('zonder soortfilter blijft alles over (regressie)', () => {
    assert.equal(kiesbarePoolRecepten(pool, { ...alle, moment: 'avond', soorten: [] }).length, pool.length);
    assert.equal(kiesbarePoolRecepten(pool, { ...alle, moment: 'avond' }).length, pool.length);
  });

  test('één soort aan: enkel die soort', () => {
    for (const soort of soorten) {
      const res = kiesbarePoolRecepten(pool, { ...alle, moment: 'avond', soorten: [soort] });
      assert.ok(res.length > 0, soort);
      assert.ok(res.every((k) => k.soort === soort), soort);
    }
  });

  test('twee soorten aan: beide soorten, de derde niet', () => {
    const res = kiesbarePoolRecepten(pool, { ...alle, moment: 'avond', soorten: ['vis', 'vegetarisch'] });
    assert.ok(res.every((k) => k.soort === 'vis' || k.soort === 'vegetarisch'));
    assert.equal(res.length, pool.filter((k) => k.soort !== 'vlees').length);
  });

  test('"enkel vegetarisch" (WEEK-190) blijft gelden, ook met een soortfilter (regressie)', () => {
    const res = kiesbarePoolRecepten(pool, { ...alle, moment: 'avond', enkelVegetarisch: true, soorten: ['vlees', 'vegetarisch'] });
    assert.ok(res.every((k) => k.soort === 'vegetarisch'));
    assert.equal(soortToegelaten('vlees', { enkelVegetarisch: true }), false);
    assert.equal(soortToegelaten('vlees', {}), true);
  });

  test('startSoorten en wisselSoort', () => {
    assert.deepEqual(startSoorten(true), ['vegetarisch']);
    assert.deepEqual(startSoorten(false), []);
    assert.deepEqual(startSoorten(undefined), []);
    assert.deepEqual(wisselSoort([], 'vis'), ['vis']);
    assert.deepEqual(wisselSoort(['vis'], 'vlees'), ['vis', 'vlees']);
    assert.deepEqual(wisselSoort(['vis', 'vlees'], 'vis'), ['vlees']);
  });
});

describe('vervangDoorPlanRecept', () => {
  test('behoudt de dag, wisselt het recept', () => {
    const p = plan([dag('dinsdag', avond)]);
    const nieuw = vervangDoorPlanRecept(p, 0, avond2.recept);
    assert.equal(nieuw.dagen[0].dag, 'dinsdag');
    assert.equal(nieuw.dagen[0].recept.id, avond2.recept.id);
  });

  test('WEEK-272: een gekookt gerecht blijft vast en wordt niet vervangen', () => {
    const p = plan([{ ...dag('maandag', avond), gedaan: true }]);
    assert.equal(vervangDoorPlanRecept(p, 0, avond2.recept), p);
  });

  test('WEEK-272: een bevestigd, niet-gekookt gerecht vervangen wist de bevestiging', () => {
    const p = plan([{ ...dag('maandag', avond), bevestigd: true }]);
    const nieuw = vervangDoorPlanRecept(p, 0, avond2.recept);
    assert.equal(nieuw.dagen[0].recept.naam, avond2.recept.naam);
    assert.equal(nieuw.dagen[0].bevestigd, undefined);
  });

  test('een avondrecept blijft zonder moment-veld (regressie)', () => {
    const p = plan([dag('maandag', avond)]);
    const nieuw = vervangDoorPlanRecept(p, 0, avond2.recept);
    assert.equal('moment' in nieuw.dagen[0], false);
  });

  test('onbekende index laat het plan ongewijzigd', () => {
    const p = plan([dag('maandag', avond)]);
    assert.equal(vervangDoorPlanRecept(p, 5, avond2.recept), p);
  });
});

describe('voegPlanReceptToe', () => {
  test('voegt op de eerste vrije weekdag toe', () => {
    const res = voegPlanReceptToe(plan([]), avond2.recept, 'avond');
    assert.equal(res?.dagen.length, 1);
    assert.equal(res?.dagen[0].dag, 'zondag');
  });

  test('avond krijgt geen moment-veld (regressie)', () => {
    const res = voegPlanReceptToe(plan([]), avond.recept, 'avond');
    assert.equal('moment' in (res?.dagen[0] ?? {}), false);
  });

  test('slaat dagen over die al bezet zijn', () => {
    const res = voegPlanReceptToe(plan([dag('zondag', avond)]), avond2.recept, 'avond');
    assert.equal(res?.dagen.find((d) => d.dag !== 'zondag')?.dag, 'maandag');
  });

  test('sorteert op weekdag', () => {
    const p = plan([dag('maandag', avond)]);
    const res = voegPlanReceptToe(p, avond2.recept, 'avond');
    assert.deepEqual(res?.dagen.map((d) => d.dag), ['zondag', 'maandag']);
  });

  test('geeft undefined als alle dagen bezet zijn', () => {
    const vol = plan((['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'] as const).map((d) => dag(d, avond2)));
    assert.equal(voegPlanReceptToe(vol, avond.recept, 'avond'), undefined);
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

describe('WEEK-272: geen gerecht deze dag (verwijderDag)', () => {
  const verwacht = (p: ReturnType<typeof plan>) => ({ gemaaktOp: p.gemaaktOp, receptNaam: p.dagen[0].recept.naam });
  test('een bevestigd, niet-gekookt gerecht gaat van het weekmenu', () => {
    const p = plan([{ ...dag('maandag', avond), bevestigd: true }, dag('dinsdag', avond2)]);
    const nieuw = verwijderDag(p, 0, verwacht(p));
    assert.equal(nieuw.dagen.length, 1);
    assert.equal(nieuw.dagen[0].dag, 'dinsdag');
  });
  test('een gekookt gerecht blijft staan', () => {
    const p = plan([{ ...dag('maandag', avond), bevestigd: true, gedaan: true }]);
    assert.equal(verwijderDag(p, 0, verwacht(p)), p);
  });
  test('een ander weekmenu of een ander gerecht ondertussen: niets gebeurt', () => {
    const p = plan([dag('maandag', avond)]);
    assert.equal(verwijderDag(p, 0, { gemaaktOp: 'ander', receptNaam: p.dagen[0].recept.naam }), p);
    assert.equal(verwijderDag(p, 0, { gemaaktOp: p.gemaaktOp, receptNaam: 'ander' }), p);
  });
});
