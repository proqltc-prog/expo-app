import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { dbCodeVanNaam, ingredientNaam } from '@/data/ingredienten';
import { FrigoItem, herstel, omrekenFactor, pastBij, verbruik, verdeelFrigo } from '@/lib/frigo';

// WEEK-160: eenheden omrekenen binnen dezelfde familie, en koppelen op code (ook over talen heen).
const OUD = '2026-10-01T10:00:00.000Z';
const f = (id: string, naam: string, hoeveelheid?: number, eenheid?: string, code?: string): FrigoItem => ({
  id,
  naam,
  afdeling: 'groenten-fruit',
  toegevoegdOp: OUD,
  bron: 'planner',
  ...(hoeveelheid !== undefined ? { hoeveelheid } : {}),
  ...(eenheid ? { eenheid } : {}),
  ...(code ? { code } : {}),
});

describe('omrekenFactor (WEEK-160)', () => {
  test('binnen dezelfde familie wordt omgerekend; gelijke of ontbrekende eenheid geeft 1', () => {
    assert.equal(omrekenFactor('kg', 'g'), 1000);
    assert.equal(omrekenFactor('g', 'kg'), 0.001);
    assert.equal(omrekenFactor('l', 'ml'), 1000);
    assert.equal(omrekenFactor('g', 'g'), 1);
    assert.equal(omrekenFactor(undefined, 'g'), 1);
    assert.equal(omrekenFactor('g', undefined), 1);
  });

  test('tussen families of zonder gewicht per stuk: niet te herleiden', () => {
    assert.equal(omrekenFactor('g', 'ml'), undefined);
    assert.equal(omrekenFactor('stuk', 'g'), undefined);
    assert.equal(omrekenFactor('teentje', 'stuk'), undefined);
  });
});

describe('verbruik met omrekening (WEEK-160)', () => {
  test('1 kg in de frigo, recept vraagt 200 g: 800 g blijft over', () => {
    const { frigo, verbruikt } = verbruik([f('t', 'tomaat', 1, 'kg')], [{ naam: 'tomaat', hoeveelheid: 200, eenheid: 'g' }]);
    assert.equal(frigo.length, 1);
    assert.equal(frigo[0].hoeveelheid, 0.8);
    assert.equal(verbruikt[0].hoeveelheid, 0.2);
  });

  test('herstel zet de omgerekende hoeveelheid precies terug', () => {
    const start = [f('t', 'tomaat', 1, 'kg')];
    const { frigo, verbruikt } = verbruik(start, [{ naam: 'tomaat', hoeveelheid: 200, eenheid: 'g' }]);
    assert.equal(herstel(frigo, verbruikt)[0].hoeveelheid, 1);
  });

  test('stuk tegen gram past niet: er wordt niets verbruikt', () => {
    const { frigo, verbruikt } = verbruik([f('u', 'ui', 2, 'stuk')], [{ naam: 'ui', hoeveelheid: 200, eenheid: 'g' }]);
    assert.equal(verbruikt.length, 0);
    assert.equal(frigo[0].hoeveelheid, 2);
  });

  test('verdeelFrigo rekent mee: 1 kg dekt een behoefte van 500 g', () => {
    assert.deepEqual(verdeelFrigo([{ naam: 'tomaat', hoeveelheid: 500, eenheid: 'g' }], [f('t', 'tomaat', 1, 'kg')]), [{ gedekt: 'geheel' }]);
  });
});

describe('koppelen op code en naam over talen heen (WEEK-160)', () => {
  test('een frigo-product in een andere taal koppelt aan het recept-ingrediënt via de code', () => {
    const frans = ingredientNaam('tomaten', 'fr');
    assert.ok(pastBij(f('x', frans, 200, 'g'), { naam: 'tomaat', code: 'tomaat', hoeveelheid: 200, eenheid: 'g' }));
  });

  test('de naam in een andere taal van dezelfde catalogus-code wordt herkend, zonder eigen code', () => {
    assert.equal(dbCodeVanNaam(ingredientNaam('tomaten', 'nl')), 'tomaat');
    assert.equal(dbCodeVanNaam(ingredientNaam('tomaten', 'en')), 'tomaat');
  });

  test('catalogus-codes die verschillen van de databank worden omgezet (tomaten → tomaat)', () => {
    assert.equal(dbCodeVanNaam(ingredientNaam('tomaten', 'de')), 'tomaat');
    assert.ok(pastBij(f('x', ingredientNaam('tomaten', 'de'), 200, 'g'), { naam: 'Tomate', code: 'tomaat', hoeveelheid: 200, eenheid: 'g' }));
  });

  test('twee verschillende codes passen niet, ook als de naam gelijk is', () => {
    assert.equal(pastBij(f('x', 'kip', 200, 'g', 'kipfilet'), { naam: 'kip', code: 'kip_heel', hoeveelheid: 200, eenheid: 'g' }), false);
  });

  test('onbekende naam heeft geen databankcode', () => {
    assert.equal(dbCodeVanNaam('xyz ingrediënt zonder bestaan'), undefined);
    assert.equal(dbCodeVanNaam('   '), undefined);
  });
});
