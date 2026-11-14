import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { andereWeergave, toonGroepering, weergaveVoorSheet, ZOEKEN_STANDAARD_OPEN } from '@/lib/lijstKop';
import { secties } from '@/lib/lijst';
import { vertaal, TALEN } from '@/i18n';

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
