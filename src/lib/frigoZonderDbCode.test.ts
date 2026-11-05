import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { dbCodeVan, dbCodeVanNaam, ingredientNaam } from '@/data/ingredienten';
import { FrigoItem, pastBij, verbruik } from '@/lib/frigo';

// WEEK-160 regressie: catalogus-ingrediënten zonder databankequivalent koppelen op naam, niet op een code die
// nergens in de databank voorkomt. Vroeger matchte frigo "pasta" met het recept-ingrediënt "pasta" (code pasta_penne).
const OUD = '2026-10-01T10:00:00.000Z';
const f = (id: string, naam: string, hoeveelheid?: number, eenheid?: string): FrigoItem => ({
  id,
  naam,
  afdeling: 'droge-voeding',
  toegevoegdOp: OUD,
  bron: 'planner',
  ...(hoeveelheid !== undefined ? { hoeveelheid } : {}),
  ...(eenheid ? { eenheid } : {}),
});

describe('één ingrediëntenlijst uit de databank (WEEK-205; vervangt de WEEK-160-regressie)', () => {
  test('dbCodeVan geeft de databankcode, ook voor een oude catalogus-code; een onbekende code geeft niets', () => {
    assert.equal(dbCodeVan('pasta'), 'pasta');
    assert.equal(dbCodeVan('kaas'), 'kaas_geraspt');
    assert.equal(dbCodeVan('tomaten'), 'tomaat');
    assert.equal(dbCodeVan('bestaat-niet'), undefined);
  });

  test('algemene "pasta" en "penne" (pasta_penne) zijn twee producten: ze koppelen niet op elkaar', () => {
    assert.equal(pastBij(f('p', 'pasta', 500, 'g'), { naam: 'penne', code: 'pasta_penne', hoeveelheid: 300, eenheid: 'g' }), false);
  });

  test('een frigo-product zonder code koppelt via zijn naam aan de databankcode, in elke taal', () => {
    const naam = ingredientNaam('kaas_geraspt', 'fr');
    assert.ok(pastBij(f('k', naam, 200, 'g'), { naam: 'geraspte oude kaas', code: 'kaas_geraspt', hoeveelheid: 50, eenheid: 'g' }));
  });

  test('verbruik: pasta wordt verbruikt door een recept dat pasta met dezelfde code vraagt', () => {
    const { frigo, verbruikt } = verbruik([f('p', 'pasta', 500, 'g')], [{ naam: 'pasta', code: 'pasta', hoeveelheid: 300, eenheid: 'g' }]);
    assert.equal(verbruikt.length, 1);
    assert.equal(frigo[0].hoeveelheid, 200);
  });
});
