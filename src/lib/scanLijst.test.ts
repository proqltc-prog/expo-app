import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { LijstItem } from '@/lib/lijst';
import { zoekOpLijst } from '@/lib/scanLijst';

const item = (id: string, naam: string, afgevinkt = false): LijstItem => ({ id, naam, categorie: 'avondeten', afgevinkt });

describe('zoekOpLijst', () => {
  const lijst = [item('1', 'melk'), item('2', 'ui'), item('3', 'Halfvolle yoghurt'), item('4', 'eieren', true)];

  test('vindt een item waarvan het woord in de productnaam staat', () => {
    assert.deepEqual(zoekOpLijst(lijst, 'Halfvolle melk 1 l').map((i) => i.id), ['1']);
  });

  test('een kort woord matcht niet binnen een ander woord (regressie: ui in quinoa)', () => {
    assert.deepEqual(zoekOpLijst(lijst, 'Quinoa wit 500 g'), []);
  });

  test('alle woorden van het item moeten voorkomen', () => {
    assert.deepEqual(zoekOpLijst(lijst, 'Yoghurt natuur'), []);
    assert.deepEqual(zoekOpLijst(lijst, 'Halfvolle yoghurt natuur').map((i) => i.id), ['3']);
  });

  test('afgevinkte items worden niet opnieuw gekozen (regressie)', () => {
    assert.deepEqual(zoekOpLijst(lijst, 'Scharreleieren 6 stuks'), []);
  });

  test('hoofdletters en accenten doen er niet toe', () => {
    assert.deepEqual(zoekOpLijst([item('5', 'Crème fraîche')], 'CREME FRAICHE 200 g').map((i) => i.id), ['5']);
  });

  test('lege productnaam geeft niets', () => {
    assert.deepEqual(zoekOpLijst(lijst, '   '), []);
  });
});
