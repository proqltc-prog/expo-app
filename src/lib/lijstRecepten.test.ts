import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { frigoItemUitLijst, type FrigoItem } from '@/lib/frigo';
import { itemsUitPlan, perRecept, samenvoegen, vinkAf, voornaam, voegPlanToe, type LijstItem } from '@/lib/lijst';
import { openBevestigdeDagen } from '@/lib/planner/dagBevestigen';
import { wisselGedaan } from '@/lib/planner/bijwerken';
import type { PlanDag, PlanIngredient, PlanRecept, Weekplan } from '@/lib/planner/types';

// WEEK-159: één dag met drie recepten die ingrediënten delen.
const NU = new Date('2026-10-24T12:00:00.000Z');
const ing = (code: string, naam: string, hoeveelheid: number, eenheid: string): PlanIngredient => ({
  code,
  naam,
  hoeveelheid,
  eenheid,
  afdeling: 'groenten-fruit',
});
const recept = (id: string, naam: string, ingredienten: PlanIngredient[]): PlanRecept => ({
  id,
  naam,
  soort: 'vegetarisch',
  minuten: 20,
  stijlen: ['italiaans'],
  ingredienten,
});
const dag = (r: PlanRecept): PlanDag => ({ dag: 'maandag', recept: r, bevestigd: true });

const ontbijt = recept('db-1', 'Havermout', [ing('havermout', 'havermout', 50, 'g'), ing('melk', 'melk', 200, 'ml'), ing('banaan', 'banaan', 1, 'stuk')]);
const middag = recept('db-2', 'Pasta', [ing('pasta_penne', 'pasta', 100, 'g'), ing('tomaat', 'tomaat', 200, 'g'), ing('ui', 'ui', 1, 'stuk')]);
const avond = recept('db-3', 'Tomatensoep', [ing('tomaat', 'tomaat', 150, 'g'), ing('ui', 'ui', 1, 'stuk'), ing('kipfilet', 'kipfilet', 200, 'g')]);
const dagen: PlanDag[] = [dag(ontbijt), dag(middag), dag(avond)];

const plan = (d: PlanDag[]): Weekplan => ({
  dagen: d,
  kooktijden: [],
  stijlen: [],
  taal: 'nl',
  porties: 1,
  bron: 'db',
  gemaaktOp: NU.toISOString(),
} as Weekplan);

const verwacht = (p: Weekplan, i: number) => ({ gemaaktOp: p.gemaaktOp, receptNaam: p.dagen[i].recept.naam });

describe('één dag, drie recepten met gedeelde ingrediënten (WEEK-159)', () => {
  test('per recept: elk recept heeft zijn eigen regel met de juiste hoeveelheid', () => {
    const items = itemsUitPlan(dagen, 'p');
    const tomaten = items.filter((i) => i.code === 'tomaat');
    assert.equal(tomaten.length, 2, 'twee aparte lijstitems, één per recept');
    assert.deepEqual(tomaten.map((i) => [i.recept?.naam, i.hoeveelheid]).sort(), [['Pasta', 200], ['Tomatensoep', 150]]);
  });

  test('per recept: de weergave toont voor Pasta enkel de pasta-ingrediënten met de juiste tomaat', () => {
    const secties = perRecept(voegPlanToe([], dagen, 'nl', undefined, 'p'));
    const pasta = secties.find((s) => s.soort === 'recept' && s.recept === 'Pasta');
    assert.ok(pasta);
    assert.deepEqual(pasta!.regels.map((r) => [r.naam, r.hoeveelheid]).sort(), [['penne', 100], ['tomaat', 200], ['ui', 1]]);
  });

  test('per categorie: gedeelde ingrediënten staan als 1 regel met de som', () => {
    const items = voegPlanToe([], dagen, 'nl', undefined, 'p');
    const regels = samenvoegen(items, { overCategorieen: true });
    const tomaat = regels.find((r) => r.naam === 'tomaat');
    assert.equal(tomaat?.hoeveelheid, 350);
    assert.deepEqual([...tomaat!.recepten].sort(), ['Pasta', 'Tomatensoep']);
    assert.equal(regels.find((r) => r.naam === 'ui')?.hoeveelheid, 2);
  });

  test('gekookt Pasta: enkel de ingrediënten van Pasta gaan van de lijst én uit de frigo', () => {
    const p = plan(dagen);
    const lijst = voegPlanToe([], dagen, 'nl', undefined, 'p');
    const gekocht: LijstItem[] = vinkAf(lijst, lijst.map((i) => i.id), true, 'Maarten De Ridder');
    const frigo: FrigoItem[] = gekocht.map((i) => frigoItemUitLijst(i, NU));
    const na = wisselGedaan(p, frigo, 1, verwacht(p, 1));

    // Frigo: Pasta's tomaat (200) en ui (1) zijn verbruikt; Tomatensoep en Havermout blijven.
    const restjes = na.frigo.map((f) => [f.code ?? f.naam, f.hoeveelheid]).sort();
    assert.deepEqual(restjes, [['banaan', 1], ['havermout', 50], ['kipfilet', 200], ['melk', 200], ['tomaat', 150], ['ui', 1]].sort());

    // Lijst: na het koken blijven enkel de open recepten over.
    const opnieuw = voegPlanToe([], openBevestigdeDagen(na.plan), 'nl', undefined, 'p');
    assert.ok(!opnieuw.some((i) => i.recept?.naam === 'Pasta'), 'Pasta verdwijnt van de lijst');
    assert.equal(opnieuw.find((i) => i.code === 'tomaat')?.recept?.naam, 'Tomatensoep');
  });

  test('gekookt zonder gekocht: de ingrediënten verdwijnen van de lijst, de frigo blijft gelijk', () => {
    const p = plan(dagen);
    const na = wisselGedaan(p, [], 1, verwacht(p, 1));
    assert.deepEqual(na.frigo, []);
    const opnieuw = voegPlanToe([], openBevestigdeDagen(na.plan), 'nl', undefined, 'p');
    assert.ok(!opnieuw.some((i) => i.recept?.naam === 'Pasta'));
  });

  test('ontkoken: de verbruikte ingrediënten komen weer in de frigo', () => {
    const p = plan(dagen);
    const lijst = voegPlanToe([], dagen, 'nl', undefined, 'p');
    const frigo = lijst.map((i) => frigoItemUitLijst(i, NU));
    const gekookt = wisselGedaan(p, frigo, 1, verwacht(p, 1));
    const terug = wisselGedaan(gekookt.plan, gekookt.frigo, 1, verwacht(gekookt.plan, 1));
    assert.equal(terug.frigo.filter((f) => f.code === 'tomaat').reduce((s, f) => s + (f.hoeveelheid ?? 0), 0), 350);
  });
});

describe('taalwissel: de koppeling gebeurt op code, niet op naam (WEEK-159)', () => {
  test('een frigo-product met een andere naam (taal) wordt toch verbruikt', () => {
    const p = plan(dagen);
    // Gekocht toen de app Frans stond: de naam is anders, de code blijft gelijk.
    const frigo: FrigoItem[] = [{ id: 'lijst:x', naam: 'tomate', hoeveelheid: 200, eenheid: 'g', afdeling: 'groenten-fruit', toegevoegdOp: NU.toISOString(), lijstId: 'x', bron: 'planner', code: 'tomaat' }];
    const na = wisselGedaan(p, frigo, 1, verwacht(p, 1));
    assert.equal(na.frigo.length, 0, 'de tomaat van Pasta is verbruikt, ondanks de andere naam');
  });
});

describe('gedeelde regels: wie heeft gekocht (WEEK-159)', () => {
  test('de voornaam wordt getoond, niet de volledige naam', () => {
    assert.equal(voornaam('Maarten De Ridder'), 'Maarten');
    assert.equal(voornaam('  Sofie  '), 'Sofie');
    assert.equal(voornaam(''), '');
  });

  test('een gekochte groep toont wie kocht (bij de samengevoegde regel)', () => {
    const lijst = voegPlanToe([], dagen, 'nl', undefined, 'p');
    const tomaatIds = lijst.filter((i) => i.code === 'tomaat').map((i) => i.id);
    const na = vinkAf(lijst, tomaatIds, true, 'Maarten');
    const regel = samenvoegen(na, { overCategorieen: true }).find((r) => r.naam === 'tomaat');
    assert.deepEqual(regel?.afgevinktDoor, ['Maarten']);
  });
});
