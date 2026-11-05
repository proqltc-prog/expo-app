// WEEK-190: 'enkel vegetarisch' werkt in de receptenlijst, de databank-planner en het opslaan van de keuze.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { DbRecept } from '@/lib/planner/db';
import { maakDbPool, planUitDatabase } from '@/lib/planner/dbplan';
import { kiesbarePoolRecepten } from '@/lib/planner/kies';
import { testPool } from '@/lib/planner/testrecepten';
import { normaliseerKeuzes } from '@/lib/planner/normaliseer';
import { standaardProfiel } from '@/lib/profiel';
import type { PlanVerzoek } from '@/lib/planner/types';

const verzoek = (extra: Partial<PlanVerzoek> = {}): PlanVerzoek => ({
  kooktijden: [],
  stijlen: [],
  profiel: standaardProfiel(),
  taal: 'nl',
  seed: 7,
  ...extra,
});

const dbRecept = (id: number, soort: DbRecept['soort']): DbRecept => ({
  id,
  porties: 1,
  kooktijdMin: 15,
  moment: 'avond',
  stijl: 'klassiek',
  soort,
  basis: 'pasta',
  titels: { nl: `Recept ${id}` },
  ingredienten: [{ code: 'ui', categorie: 'groente', namen: { nl: 'ui' }, hoeveelheid: 100, eenheid: 'g' }],
  bereidingen: { nl: ['Bak de ui.'] },
  timers: [],
} as unknown as DbRecept);

describe('receptenlijst (kies)', () => {
  const basis = { moment: 'avond' as const, kooktijden: [], stijlen: [], vermijd: [], zoek: '', taal: 'nl' as const };

  const pool = testPool();

  test('zonder de keuze blijven ook vlees- en visrecepten in de lijst', () => {
    const alles = kiesbarePoolRecepten(pool, basis);
    assert.ok(alles.some((k) => k.soort !== 'vegetarisch'));
  });

  test('met enkel vegetarisch blijven alleen vegetarische recepten over', () => {
    const veg = kiesbarePoolRecepten(pool, { ...basis, enkelVegetarisch: true });
    assert.ok(veg.length > 0);
    assert.ok(veg.every((k) => k.soort === 'vegetarisch'));
  });
});

describe('databank-planner', () => {
  test('met enkel vegetarisch komt er enkel een vegetarisch recept in het plan', () => {
    const pool = maakDbPool([dbRecept(1, 'vlees'), dbRecept(2, 'vegetarisch'), dbRecept(3, 'vis'), dbRecept(4, 'vegetarisch')], 'nl', standaardProfiel());
    const plan = planUitDatabase(verzoek({ enkelVegetarisch: true }), pool);
    if (!plan) throw new Error('er is een plan');
    assert.equal(plan.enkelVegetarisch, true);
    assert.ok(plan.dagen.length > 0);
    assert.ok(plan.dagen.every((d) => d.recept.soort === 'vegetarisch'));
  });

  test('zonder de keuze blijft het gedrag ongewijzigd en staat de vlag niet in het plan', () => {
    const pool = maakDbPool([dbRecept(1, 'vlees'), dbRecept(2, 'vegetarisch')], 'nl', standaardProfiel());
    const plan = planUitDatabase(verzoek(), pool);
    if (!plan) throw new Error('er is een plan');
    assert.equal(plan.enkelVegetarisch, undefined);
  });

  test('zonder één vegetarisch recept is er geen plan met enkel vegetarisch', () => {
    const pool = maakDbPool([dbRecept(1, 'vlees'), dbRecept(2, 'vis')], 'nl', standaardProfiel());
    assert.equal(planUitDatabase(verzoek({ enkelVegetarisch: true }), pool), undefined);
  });
});

describe('databank-planner met de testrecepten (WEEK-208)', () => {
  test('met enkel vegetarisch bestaat het weekmenu enkel uit vegetarische recepten, ook als die herhaald moeten worden', () => {
    const plan = planUitDatabase(verzoek({ enkelVegetarisch: true, aantalDagen: 6 }), testPool());
    if (!plan) throw new Error('er is een plan');
    assert.equal(plan.dagen.length, 6);
    assert.ok(plan.dagen.every((d) => d.recept.soort === 'vegetarisch'));
    assert.equal(plan.enkelVegetarisch, true);
  });

  test('zonder de keuze komen ook vlees en vis op het weekmenu', () => {
    const plan = planUitDatabase(verzoek({ aantalDagen: 7 }), testPool());
    if (!plan) throw new Error('er is een plan');
    assert.equal(plan.enkelVegetarisch, undefined);
    assert.ok(plan.dagen.some((d) => d.recept.soort !== 'vegetarisch'));
  });
});

describe('opslag van de keuze', () => {
  test('standaard staat de keuze uit', () => {
    assert.equal(normaliseerKeuzes(null).enkelVegetarisch, false);
    assert.equal(normaliseerKeuzes({}).enkelVegetarisch, false);
  });

  test('een bewaarde keuze blijft bewaard', () => {
    assert.equal(normaliseerKeuzes({ enkelVegetarisch: true }).enkelVegetarisch, true);
  });

  test('een ongeldige waarde telt als uit', () => {
    assert.equal(normaliseerKeuzes({ enkelVegetarisch: 'ja' }).enkelVegetarisch, false);
  });
});
