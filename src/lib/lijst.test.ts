import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { lijstUitMenu } from '@/lib/lijst';
import { maakWeekmenu, RECEPTEN, VASTE_ITEMS } from '@/data/recepten';

describe('lijstUitMenu', () => {
  test('zet de ingrediënten van elk recept op de lijst, niet afgevinkt', () => {
    const menu = maakWeekmenu(42);
    const lijst = lijstUitMenu(menu);
    for (const { recept } of menu) {
      for (const ingredient of recept.ingredienten) {
        assert.ok(
          lijst.some((i) => i.naam.toLowerCase() === ingredient.toLowerCase()),
          `${ingredient} ontbreekt`
        );
      }
    }
    assert.ok(lijst.every((i) => i.afgevinkt === false));
  });

  test('bevat geen dubbels (hoofdletterongevoelig)', () => {
    const lijst = lijstUitMenu(maakWeekmenu(7));
    const namen = lijst.map((i) => i.naam.toLowerCase());
    assert.equal(new Set(namen).size, namen.length);
  });

  test('ids zijn uniek', () => {
    const lijst = lijstUitMenu(maakWeekmenu(3));
    assert.equal(new Set(lijst.map((i) => i.id)).size, lijst.length);
  });

  test('voegt de vaste items toe in hun eigen categorie', () => {
    const lijst = lijstUitMenu([]);
    const verwacht = VASTE_ITEMS.flatMap((c) => c.items).length;
    assert.equal(lijst.length, verwacht);
    assert.ok(lijst.some((i) => i.categorie === 'fruit' && i.naam === 'appels'));
  });

  test('vaste items in de taal van de gebruiker', () => {
    const lijst = lijstUitMenu([], 'fr');
    assert.ok(lijst.some((i) => i.categorie === 'fruit' && i.naam === 'pommes'));
    assert.ok(lijst.some((i) => i.categorie === 'huishouden' && i.naam === 'papier toilette'));
  });

  test('elk vast item heeft een vertaling in elke taal', () => {
    for (const taal of ['nl', 'fr', 'de', 'en', 'es', 'pt'] as const) {
      for (const item of lijstUitMenu([], taal)) {
        assert.doesNotMatch(item.naam, /^item\./, `${taal}: ${item.naam}`);
      }
    }
  });

  test('een ingrediënt dat ook een vast item is, staat er maar één keer op', () => {
    const recept = RECEPTEN.find((r) => r.ingredienten.includes('brood'));
    assert.ok(recept, 'testdata: recept met brood');
    const lijst = lijstUitMenu([{ dag: 'Maandag', recept }]);
    assert.equal(lijst.filter((i) => i.naam === 'brood').length, 1);
  });
});
