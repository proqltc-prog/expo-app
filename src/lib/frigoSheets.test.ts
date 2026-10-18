import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogus, inCatalogus, koppelBronnen, normaliseer, sheets, voegLosToe, voegPlannerToe, zoekCatalogus } from '@/lib/frigoSheets';
import { FrigoItem, voegZelfToe } from '@/lib/frigo';

const nu = new Date('2026-10-18T10:00:00.000Z');
const naam = (f: FrigoItem[]) => f.map((x) => x.naam);

describe('normaliseren en zoeken', () => {
  test('accenten en hoofdletters tellen niet mee', () => {
    assert.equal(normaliseer('  Pâtes  Fraîches '), 'pates fraiches');
  });
  test('zoeken in het Frans vindt "pâte" ook als "pates" geschreven wordt', () => {
    assert.ok(zoekCatalogus('pate', 'fr').some((i) => i.naam.toLowerCase().includes('pâtes')));
  });
  test('een leeg zoekveld geeft de hele catalogus, alfabetisch', () => {
    const alles = zoekCatalogus('', 'nl');
    assert.equal(alles.length, catalogus('nl').length);
    const namen = alles.map((i) => i.naam);
    assert.deepEqual(namen, [...namen].sort((a, b) => a.localeCompare(b, 'nl')));
  });
  test('zoeken zonder treffer geeft een lege lijst', () => {
    assert.deepEqual(zoekCatalogus('xyzzy', 'nl'), []);
  });
});

describe('planner-frigo', () => {
  const pasta = catalogus('nl').find((i) => i.naam === 'pasta')!;

  test('een catalogus-ingrediënt komt in de planner-sheet', () => {
    const f = voegPlannerToe([], pasta, nu);
    assert.equal(f.length, 1);
    assert.equal(sheets(f).planner.length, 1);
    assert.equal(sheets(f).los.length, 0);
    assert.equal(f[0].afdeling, pasta.afdeling);
  });

  test('hetzelfde ingrediënt twee keer toevoegen geeft geen dubbele regel', () => {
    const een = voegPlannerToe([], pasta, nu);
    assert.equal(voegPlannerToe(een, pasta, nu).length, 1);
  });

  test('een los product met dezelfde naam blokkeert de planner-regel niet', () => {
    const los = voegLosToe([], 'pasta', nu);
    const beide = voegPlannerToe(los, pasta, nu);
    assert.equal(sheets(beide).planner.length, 1);
    assert.equal(sheets(beide).los.length, 1);
  });
});

describe('losse producten', () => {
  test('een losse product komt in de los-sheet en telt niet mee voor de planner', () => {
    const f = voegLosToe([], 'Zelfgemaakte sambal', nu);
    assert.equal(sheets(f).los.length, 1);
    assert.equal(sheets(f).planner.length, 0);
  });
  test('een losse product krijgt bron los, ook als het een catalogus-naam heeft', () => {
    const f = voegLosToe([], 'pasta', nu);
    assert.equal(f[0].bron, 'los');
  });
});

describe('koppelen van bestaande items', () => {
  test('een item dat overeenkomt met de catalogus wordt planner-frigo', () => {
    const oud = voegZelfToe([], 'Pasta', nu, {});
    assert.equal(koppelBronnen(oud)[0].bron, 'planner');
  });
  test('een item in een andere taal van de catalogus koppelt ook', () => {
    assert.ok(inCatalogus('pâtes') !== undefined);
  });
  test('een item dat niet overeenkomt wordt een los product', () => {
    const oud = voegZelfToe([], 'Mijn zelfgemaakte jam', nu, {});
    assert.equal(koppelBronnen(oud)[0].bron, 'los');
  });
  test('koppelen is idempotent', () => {
    const oud = voegZelfToe(voegZelfToe([], 'pasta', nu, {}), 'jam van oma', nu, {});
    const een = koppelBronnen(oud);
    assert.deepEqual(koppelBronnen(een), een);
  });
  test('koppelen verwijdert niets', () => {
    const oud = voegZelfToe(voegZelfToe([], 'pasta', nu, {}), 'jam van oma', nu, {});
    assert.equal(koppelBronnen(oud).length, oud.length);
    assert.deepEqual(naam(koppelBronnen(oud)), naam(oud));
  });
});

describe('niets verdwijnt automatisch (regressie)', () => {
  test('de twee sheets bevatten samen precies de hele frigo', () => {
    let f: FrigoItem[] = [];
    f = voegPlannerToe(f, catalogus('nl')[0], nu);
    f = voegLosToe(f, 'los product', nu);
    f = voegLosToe(f, 'nog een los product', nu);
    const s = sheets(f);
    assert.equal(s.planner.length + s.los.length, f.length);
  });
});
