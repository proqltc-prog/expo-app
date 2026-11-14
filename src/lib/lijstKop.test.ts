import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { andereWeergave, teKopen, toonGroepering, weergaveVoorSheet, ZOEKEN_STANDAARD_OPEN } from '@/lib/lijstKop';
import { secties, type LijstItem } from '@/lib/lijst';
import { vertaal, TALEN } from '@/i18n';

describe('WEEK-292: teller Te kopen = som van beide tabbladen, zonder afgevinkte producten', () => {
  const recept = (naam: string, afgevinkt = false): LijstItem => ({ id: `r-${naam}`, naam, categorie: 'avondeten', afgevinkt, eenheid: 'g', afdeling: 'groenten-fruit', recept: { dag: 'maandag', naam: 'Pasta' } });
  const los = (naam: string, afgevinkt = false): LijstItem => ({ id: `l-${naam}`, naam, categorie: 'extra', afgevinkt, afdeling: 'diepvries' });

  test('de situatie uit de schermafdruk: 6 open in het weekmenu, 1 afgevinkt ander product', () => {
    const items = ['ui', 'look', 'paprika', 'tomaat', 'courgette', 'pasta'].map((n) => recept(n)).concat(los('Glaces', true));
    assert.deepEqual(teKopen(items, 'recept'), { planner: 6, los: 0, totaal: 6 });
  });

  test('afgevinkt telt nergens mee', () => {
    const items = [recept('ui', true), recept('look'), los('chips'), los('wc-papier', true)];
    assert.deepEqual(teKopen(items, 'categorie'), { planner: 1, los: 1, totaal: 2 });
  });

  test('alles afgevinkt of leeg geeft 0', () => {
    assert.deepEqual(teKopen([], 'recept'), { planner: 0, los: 0, totaal: 0 });
    assert.deepEqual(teKopen([recept('ui', true), los('chips', true)], 'recept').totaal, 0);
  });
});

describe('WEEK-286: compacte kop van boodschappenlijst en In huis', () => {
  test('groeperen per gerecht enkel bij het weekmenu', () => {
    assert.equal(toonGroepering('planner'), true);
    assert.equal(toonGroepering('los'), false);
  });
  test('andere producten altijd per categorie, ook als per gerecht gekozen is', () => {
    assert.equal(weergaveVoorSheet('los', 'recept'), 'categorie');
    assert.equal(weergaveVoorSheet('los', 'categorie'), 'categorie');
  });
  test('regressie: bij het weekmenu blijft de keuze van de gebruiker', () => {
    assert.equal(weergaveVoorSheet('planner', 'recept'), 'recept');
    assert.equal(weergaveVoorSheet('planner', 'categorie'), 'categorie');
  });
  test('één knop wisselt de groepering', () => {
    assert.equal(andereWeergave('recept'), 'categorie');
    assert.equal(andereWeergave('categorie'), 'recept');
  });
  test('zoeken staat standaard ingeklapt', () => {
    assert.equal(ZOEKEN_STANDAARD_OPEN, false);
  });
  test('andere producten per categorie geven categoriegroepen, geen receptgroepen', () => {
    const nu = new Date('2026-11-14T10:00:00Z').toISOString();
    const items = [{ id: 'a', naam: 'Afwasmiddel', afgevinkt: false, toegevoegdOp: nu, afgevinktDoor: [] }] as never[];
    const g = secties(items, weergaveVoorSheet('los', 'recept'));
    assert.ok(g.every((x: { soort: string }) => x.soort !== 'recept'));
  });
  test('teksten voor de knoppen in alle talen', () => {
    for (const taal of TALEN) {
      for (const k of ['lijst.zoekOpen', 'lijst.zoekSluit', 'lijst.groepWissel', 'frigo.sheetPlanner'] as const) {
        assert.ok(vertaal(taal, k).trim(), `${taal}: ${k}`);
      }
    }
  });
});
