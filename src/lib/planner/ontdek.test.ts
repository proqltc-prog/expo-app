// WEEK-191: de tabs "Ontdek" (databank) en "Ons gezin" (eigen recepten) in de receptenlijst.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { EigenRecept } from '@/lib/eigenrecepten';
import type { DbPoolRecept } from '@/lib/planner/dbplan';
import type { KiesFilter } from '@/lib/planner/kies';
import {
  eigenNaarPlanRecept,
  kiesbareEigenRecepten,
  kiesbarePoolRecepten,
  vervangDoorPlanRecept,
  voegPlanReceptToe,
} from '@/lib/planner/kies';
import type { PlanDag, PlanRecept, Weekplan } from '@/lib/planner/types';
import { standaardProfiel } from '@/lib/profiel';
import { geschaaldeHoeveelheid } from '@/lib/schaal';

const basis: KiesFilter = { moment: 'avond', kooktijden: [], stijlen: [], vermijd: [], zoek: '', taal: 'nl' };

const recept = (id: string, naam: string, minuten: number, soort: PlanRecept['soort'], ingredienten: string[] = ['ui']): PlanRecept => ({
  id,
  naam,
  soort,
  minuten,
  stijlen: ['mediterraan'],
  ingredienten: ingredienten.map((n) => ({ naam: n, hoeveelheid: 100, eenheid: 'g', afdeling: 'groenten-fruit' })),
});

const pool = (r: PlanRecept, stijlen: DbPoolRecept['stijlen'] = ['mediterraan']): DbPoolRecept => ({
  recept: r,
  moment: 'avond',
  soort: r.soort,
  kooktijd: r.minuten <= 20 ? 'snel' : r.minuten <= 40 ? 'gemiddeld' : 'uitgebreid',
  stijlen,
  seizoenen: [],
});

const eigen = (id: string, naam: string, minuten: number, soort: EigenRecept['soort'], ingredienten: EigenRecept['ingredienten'] = []): EigenRecept => ({
  id,
  naam,
  soort,
  minuten,
  stijlen: ['klassiek'],
  ingredienten: ingredienten.length ? ingredienten : [{ naam: 'ui', hoeveelheid: 100, eenheid: 'g' }],
  stappen: ['Bak de ui.'],
  bijgewerkt: '2026-11-04T10:00:00.000Z',
});

const plan = (dagen: PlanDag[]): Weekplan => ({
  dagen,
  kooktijden: [],
  stijlen: [],
  vermijd: [],
  taal: 'nl',
  porties: 1,
  bron: 'db',
  gemaaktOp: '2026-11-04T10:00:00.000Z',
});

describe('Ontdek: recepten uit de databank', () => {
  const pot = [
    pool(recept('a', 'Pasta pesto', 15, 'vegetarisch')),
    pool(recept('b', 'Garnalen', 25, 'vis', ['scampi'])),
    pool(recept('c', 'Stoverij', 90, 'vlees', ['worsten'])),
    pool(recept('d', 'Linzensoep', 30, 'vegetarisch'), ['klassiek']),
  ];

  test('zonder voorwaarden blijven alle avondrecepten over', () => {
    assert.equal(kiesbarePoolRecepten(pot, basis).length, 4);
  });

  test('kooktijd en stijl filteren de lijst', () => {
    const snel = kiesbarePoolRecepten(pot, { ...basis, kooktijden: ['snel'] });
    assert.deepEqual(snel.map((k) => k.recept.id), ['a']);
    const klassiek = kiesbarePoolRecepten(pot, { ...basis, stijlen: ['klassiek'] });
    assert.deepEqual(klassiek.map((k) => k.recept.id), ['d']);
  });

  test('een vermeden ingrediënt haalt het recept weg', () => {
    const zonderVarkens = kiesbarePoolRecepten(pot, { ...basis, vermijd: ['varkensvlees'] });
    assert.ok(!zonderVarkens.some((k) => k.recept.id === 'c'));
    const zonderSchaal = kiesbarePoolRecepten(pot, { ...basis, vermijd: ['schaaldieren'] });
    assert.ok(!zonderSchaal.some((k) => k.recept.id === 'b'));
  });

  test('enkel vegetarisch laat alleen vegetarische recepten over', () => {
    const veg = kiesbarePoolRecepten(pot, { ...basis, enkelVegetarisch: true });
    assert.ok(veg.length > 0);
    assert.ok(veg.every((k) => k.soort === 'vegetarisch'));
  });

  test('de zoekterm vindt ook een naam met accenten', () => {
    const gevonden = kiesbarePoolRecepten([pool(recept('e', 'Crème brûlée', 30, 'vegetarisch'))], { ...basis, zoek: 'creme' });
    assert.equal(gevonden.length, 1);
  });
});

describe('Ons gezin: eigen recepten', () => {
  const lijst = [
    eigen('eigen:1', 'Gehaktballen van oma', 35, 'vlees'),
    eigen('eigen:2', 'Groentewok', 15, 'vegetarisch'),
    eigen('eigen:3', 'Scampi-pasta', 20, 'vis', [{ naam: 'scampi', hoeveelheid: 150, eenheid: 'g' }]),
  ];

  test('toont alle eigen recepten zonder voorwaarden', () => {
    assert.equal(kiesbareEigenRecepten(lijst, basis).length, 3);
  });

  test('kooktijd, vermijd, vegetarisch en zoeken werken ook hier', () => {
    assert.deepEqual(kiesbareEigenRecepten(lijst, { ...basis, kooktijden: ['snel'] }).map((r) => r.id), ['eigen:2', 'eigen:3']);
    assert.ok(!kiesbareEigenRecepten(lijst, { ...basis, vermijd: ['schaaldieren'] }).some((r) => r.id === 'eigen:3'));
    assert.deepEqual(kiesbareEigenRecepten(lijst, { ...basis, enkelVegetarisch: true }).map((r) => r.id), ['eigen:2']);
    assert.deepEqual(kiesbareEigenRecepten(lijst, { ...basis, zoek: 'oma' }).map((r) => r.id), ['eigen:1']);
  });

  test('de gezinsstijl laat het stijl-filter altijd door, andere stijlen filteren', () => {
    const gezinRecept = { ...eigen('eigen:4', 'Ons stoofvlees', 30, 'vlees'), stijlen: [], gezinStijl: true };
    const klassiek = eigen('eigen:5', 'Klassieke soep', 20, 'vegetarisch');
    const lijstMetStijl = [gezinRecept, klassiek];
    assert.deepEqual(kiesbareEigenRecepten(lijstMetStijl, { ...basis, stijlen: ['italiaans'] }).map((r) => r.id), ['eigen:4']);
    assert.deepEqual(kiesbareEigenRecepten(lijstMetStijl, { ...basis, stijlen: ['klassiek'] }).map((r) => r.id), ['eigen:4', 'eigen:5']);
  });

  test('eigen recepten gelden als avondeten, dus een ander moment geeft niets', () => {
    assert.deepEqual(kiesbareEigenRecepten(lijst, { ...basis, moment: 'avond' as const }).length, 3);
  });

  test('een eigen recept wordt een planrecept met de gezinsgrootte als schaal', () => {
    const gezin = standaardProfiel();
    const pr = eigenNaarPlanRecept(lijst[2], gezin);
    assert.equal(pr.id, 'eigen:3');
    assert.equal(pr.naam, 'Scampi-pasta');
    assert.equal(pr.ingredienten[0].hoeveelheid, geschaaldeHoeveelheid(150, gezin, 'g'));
    assert.equal(pr.ingredienten[0].code, undefined);
  });
});

describe('planrecepten op het weekmenu', () => {
  const r1 = recept('x', 'Eerste', 15, 'vegetarisch');
  const r2 = recept('y', 'Tweede', 25, 'vis');

  test('een planrecept toevoegen kiest de eerste vrije avond', () => {
    const p = plan([{ dag: 'maandag', recept: r1 }]);
    const nieuw = voegPlanReceptToe(p, r2, 'avond');
    if (!nieuw) throw new Error('er is een vrije dag');
    assert.equal(nieuw.dagen.find((d) => d.recept.id === 'y')?.dag, 'zondag');
  });

  test('een planrecept vervangen houdt dag en moment en wist de voortgang', () => {
    const p = plan([{ dag: 'woensdag', moment: 'avond', recept: r1, gedaan: true }]);
    const nieuw = vervangDoorPlanRecept(p, 0, r2);
    assert.equal(nieuw.dagen[0].dag, 'woensdag');
    assert.equal(nieuw.dagen[0].recept.id, 'y');
    assert.equal(nieuw.dagen[0].gedaan, undefined);
  });
});
