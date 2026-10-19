import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { bereidingVoor, toonBereidingsIcoon } from '@/lib/bereiding';
import { BEREIDINGEN } from '@/data/bereidingen';
import { RECEPTENBANK } from '@/data/receptenbank';
import type { EigenRecept } from '@/lib/eigenrecepten';

const eigen: EigenRecept = {
  id: 'eigen:abc',
  naam: 'Oma’s soep',
  soort: 'vegetarisch',
  minuten: 30,
  stijlen: ['klassiek'],
  ingredienten: [{ naam: 'wortel', hoeveelheid: 2, eenheid: 'stuk' }],
  stappen: ['Schil de wortel.', 'Kook alles 30 minuten.'],
  bijgewerkt: '2026-10-18T10:00:00.000Z',
};

const bank = RECEPTENBANK.find((r) => r.id === 'pasta-pesto')!;

describe('bereidingVoor (WEEK-81)', () => {
  test('een ingebouwd recept geeft de stappen in de taal van de gebruiker', () => {
    const stappen = bereidingVoor({ id: bank.id, naam: bank.namen[1] }, [], 'fr');
    assert.deepEqual(stappen, BEREIDINGEN['pasta-pesto'].fr);
  });

  test('een ingebouwd recept zoekt ook op naam, als het id ontbreekt', () => {
    const stappen = bereidingVoor({ id: 'onbekend', naam: bank.namen[4] }, [], 'es');
    assert.deepEqual(stappen, BEREIDINGEN['pasta-pesto'].es);
  });

  test('het Nederlands geeft de Nederlandse stappen, ook als de naam in een andere taal staat', () => {
    assert.deepEqual(bereidingVoor({ id: bank.id, naam: bank.namen[3] }, [], 'nl'), BEREIDINGEN['pasta-pesto'].nl);
  });

  test('een eigen recept geeft zijn eigen stappen, op id', () => {
    assert.deepEqual(bereidingVoor({ id: 'eigen:abc', naam: 'iets anders' }, [eigen], 'fr'), eigen.stappen);
  });

  test('een eigen recept wordt ook op naam gevonden', () => {
    assert.deepEqual(bereidingVoor({ id: 'eigen:ander', naam: 'Oma’s soep' }, [eigen], 'nl'), eigen.stappen);
  });

  test('een eigen recept gaat voor een ingebouwd recept met dezelfde naam', () => {
    const naamGelijk: EigenRecept = { ...eigen, naam: bank.namen[0], stappen: ['Eigen stap.'] };
    assert.deepEqual(bereidingVoor({ id: 'eigen:abc', naam: bank.namen[0] }, [naamGelijk], 'nl'), ['Eigen stap.']);
  });

  test('een AI-recept zonder bekende stappen geeft null', () => {
    assert.equal(bereidingVoor({ id: 'ai-123', naam: 'Iets van de AI' }, [], 'nl'), null);
  });

  test('de teruggegeven lijst is een kopie, zodat de bron niet verandert', () => {
    const stappen = bereidingVoor({ id: 'eigen:abc', naam: 'x' }, [eigen], 'nl');
    stappen?.push('extra');
    assert.equal(eigen.stappen.length, 2);
  });
});

describe('icoon bereidingsstappen (WEEK-113)', () => {
  test('een bevestigd gerecht toont altijd het icoon', () => {
    assert.equal(toonBereidingsIcoon(true), true);
  });

  test('een niet-bevestigd gerecht toont het icoon niet', () => {
    assert.equal(toonBereidingsIcoon(false), false);
  });

  test('een gerecht zonder bevestigd-vlag (undefined) toont het icoon niet', () => {
    assert.equal(toonBereidingsIcoon(undefined), false);
  });

  test('regressie: een gerecht zonder bekende stappen geeft null (de pagina Bereiding toont dan de melding)', () => {
    assert.equal(bereidingVoor({ id: 'onbekend-xyz', naam: 'Onbekend gerecht' }, [], 'nl'), null);
  });
});
