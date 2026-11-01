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

describe('catalogus-ingrediënten zonder databankequivalent (WEEK-160 regressie)', () => {
  test('dbCodeVan geeft geen code voor "pasta" of "kaas", wel voor een gekoppelde code', () => {
    assert.equal(dbCodeVan('pasta'), undefined);
    assert.equal(dbCodeVan('kaas'), undefined);
    assert.equal(dbCodeVan('tomaten'), 'tomaat');
  });

  test('frigo "pasta" matcht het recept-ingrediënt "pasta" met databankcode pasta_penne, op naam', () => {
    assert.ok(pastBij(f('p', 'pasta', 500, 'g'), { naam: 'pasta', code: 'pasta_penne', hoeveelheid: 300, eenheid: 'g' }));
  });

  test('frigo "kaas" (andere taal of zelfde naam) matcht een recept met kaas_geraspt op naam', () => {
    const naam = ingredientNaam('kaas', 'nl');
    assert.ok(pastBij(f('k', naam, 200, 'g'), { naam, code: 'kaas_geraspt', hoeveelheid: 50, eenheid: 'g' }));
  });

  test('de verbruik-regressie: pasta wordt verbruikt via de naam ook als het recept een databankcode heeft', () => {
    const { frigo, verbruikt } = verbruik([f('p', 'pasta', 500, 'g')], [{ naam: 'pasta', code: 'pasta_penne', hoeveelheid: 300, eenheid: 'g' }]);
    assert.equal(verbruikt.length, 1);
    assert.equal(frigo[0].hoeveelheid, 200);
  });

  test('zonder code in de frigo telt de naam; de eigen code van het recept-ingrediënt blijft gelijk', () => {
    assert.equal(pastBij(f('x', 'kip', 200, 'g'), { naam: 'kip', code: 'kip_heel', hoeveelheid: 200, eenheid: 'g' }), true);
    assert.equal(dbCodeVanNaam('onbekend ingrediënt xyz'), undefined);
  });
});
