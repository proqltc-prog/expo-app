import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { heeftVermijdNaam, normaliseerVermijd, NIET_VEGETARISCH, vermijdOpties, vermijdtRecept, vermijdVoorNaam, zetEnkelVegetarisch } from '@/lib/planner/vermijden';
import { zonderVermeden } from '@/lib/planner/dbplan';
import { VERMIJDBAAR } from '@/data/vermijden';
import { testPool } from '@/lib/planner/testrecepten';

describe('vermijden: keuzes lezen (WEEK-41)', () => {
  test('houdt enkel bekende keuzes over', () => {
    assert.deepEqual(normaliseerVermijd(['zuivel', 'onzin', 'vis']), ['zuivel', 'vis']);
  });

  test('geen of ongeldige invoer geeft een lege lijst', () => {
    assert.deepEqual(normaliseerVermijd(undefined), []);
    assert.deepEqual(normaliseerVermijd('zuivel'), []);
  });
});

describe('vermijden: ingrediëntnamen herkennen (WEEK-41)', () => {
  test('herkent zuivel in de zes talen', () => {
    assert.equal(vermijdVoorNaam('Melk', ['zuivel']), 'zuivel');
    assert.equal(vermijdVoorNaam('Geraspte kaas', ['zuivel']), 'zuivel');
    assert.equal(vermijdVoorNaam('crème fraîche', ['zuivel']), 'zuivel');
    assert.equal(vermijdVoorNaam('Sahne', ['zuivel']), 'zuivel');
    assert.equal(vermijdVoorNaam('queso feta', ['zuivel']), 'zuivel');
  });

  test('herkent varkensvlees en schaaldieren', () => {
    assert.equal(vermijdVoorNaam('Gerookt spek', ['varkensvlees']), 'varkensvlees');
    assert.equal(vermijdVoorNaam('Scampi', ['schaaldieren']), 'schaaldieren');
    assert.equal(vermijdVoorNaam('Garnalen', ['schaaldieren']), 'schaaldieren');
  });

  test('ei is enkel het hele woord; ham niet in hamburger', () => {
    assert.equal(vermijdVoorNaam('ei', ['eieren']), 'eieren');
    assert.equal(vermijdVoorNaam('Andijvie', ['eieren']), undefined);
    assert.equal(vermijdVoorNaam('Hamburger', ['varkensvlees']), undefined);
    assert.equal(vermijdVoorNaam('ham', ['varkensvlees']), 'varkensvlees');
  });

  test('pindakaas valt niet onder zuivel, kokosmelk niet onder zuivel', () => {
    assert.equal(vermijdVoorNaam('Pindakaas', ['zuivel']), undefined);
    assert.equal(vermijdVoorNaam('Kokosmelk', ['zuivel']), undefined);
  });

  test('zonder keuzes wordt niets geweigerd', () => {
    assert.equal(vermijdVoorNaam('Melk', []), undefined);
    assert.equal(heeftVermijdNaam([{ naam: 'Melk' }], []), false);
  });

  test('heeftVermijdNaam ziet één verboden ingrediënt in het recept', () => {
    const ingredienten = [{ naam: 'Pasta' }, { naam: 'Room' }];
    assert.equal(heeftVermijdNaam(ingredienten, ['zuivel']), true);
    assert.equal(heeftVermijdNaam(ingredienten, ['vis']), false);
  });
});

describe('vermijden: databankrecepten (WEEK-41, WEEK-208)', () => {
  const pool = testPool();
  const vermijdt = (k: (typeof pool)[number], vermijd: Parameters<typeof heeftVermijdNaam>[1]) => heeftVermijdNaam(k.recept.ingredienten, vermijd);

  test('zonder keuzes blijft elk databankrecept toegestaan', () => {
    assert.ok(pool.every((k) => !vermijdt(k, [])));
  });

  test('een recept met room valt weg bij zuivel, maar niet bij noten', () => {
    const metRoom = pool.find((k) => k.recept.ingredienten.some((i) => i.code === 'room'));
    assert.ok(metRoom, 'de testrecepten bevatten een recept met room');
    assert.equal(vermijdt(metRoom, ['zuivel']), true);
    assert.equal(vermijdt(metRoom, ['noten']), false);
  });

  test('een recept wordt herkend op de ingrediëntnaam in elke taal', () => {
    const fr = testPool('fr').find((k) => k.recept.ingredienten.some((i) => i.code === 'scampi'))!;
    assert.equal(vermijdt(fr, ['schaaldieren']), true);
    assert.equal(vermijdt(fr, ['vis']), false);
  });

  test('er blijven genoeg recepten over als enkel varkensvlees of noten gevraagd wordt', () => {
    const over = pool.filter((k) => !vermijdt(k, ['varkensvlees', 'noten']));
    assert.ok(over.length >= pool.length - 2);
  });
});

describe('alleen vegetarische gerechten (WEEK-221)', () => {
  test('zonder de schakelaar: alle zes ingrediënten', () => {
    assert.deepEqual(vermijdOpties(VERMIJDBAAR, false), ['varkensvlees', 'schaaldieren', 'zuivel', 'vis', 'eieren', 'noten']);
    assert.deepEqual(vermijdOpties(VERMIJDBAAR, undefined), [...VERMIJDBAAR]);
  });

  test('met de schakelaar: varkensvlees, schaaldieren en vis verdwijnen; zuivel, eieren en noten blijven', () => {
    assert.deepEqual(vermijdOpties(VERMIJDBAAR, true), ['zuivel', 'eieren', 'noten']);
    assert.deepEqual([...NIET_VEGETARISCH], ['varkensvlees', 'schaaldieren', 'vis']);
  });

  test('aanzetten haalt aangevinkte vlees- en viskeuzes weg, de rest blijft', () => {
    const k = zetEnkelVegetarisch({ vermijd: ['vis', 'zuivel', 'varkensvlees', 'noten'], enkelVegetarisch: false, stijlen: ['italiaans'] }, true);
    assert.deepEqual(k, { vermijd: ['zuivel', 'noten'], enkelVegetarisch: true, stijlen: ['italiaans'] });
  });

  test('aan en weer uit: vis staat niet meer aangevinkt (geen verborgen keuze)', () => {
    const uit = zetEnkelVegetarisch(zetEnkelVegetarisch({ vermijd: ['vis'], enkelVegetarisch: false }, true), false);
    assert.deepEqual(uit, { vermijd: [], enkelVegetarisch: false });
  });

  test('regressie: uitzetten verandert de andere keuzes niet', () => {
    assert.deepEqual(zetEnkelVegetarisch({ vermijd: ['eieren'], enkelVegetarisch: true }, false), { vermijd: ['eieren'], enkelVegetarisch: false });
  });
});

describe('WEEK-256: vis vermijden vangt ook "witvis"', () => {
  const witvisRecept = testPool().find((k) => k.recept.ingredienten.some((i) => i.code === 'witvis'))!;

  test('de naamcontrole alleen mist "witvis" (oorzaak van de fout)', () => {
    assert.equal(heeftVermijdNaam(witvisRecept.recept.ingredienten, ['vis']), false);
  });

  test('een recept van de soort vis wordt vermeden, ook met enkel witvis', () => {
    assert.equal(vermijdtRecept({ ingredienten: witvisRecept.recept.ingredienten, soort: witvisRecept.soort }, ['vis']), true);
  });

  test('geen enkel visgerecht in een weekmenu met vis vermeden', () => {
    const pool = zonderVermeden(testPool(), ['vis']);
    assert.ok(pool.length > 0);
    assert.equal(pool.some((k) => k.soort === 'vis'), false);
  });

  test('regressie: zonder vis vermijden blijven visgerechten; andere keuzes werken zoals voorheen', () => {
    assert.ok(zonderVermeden(testPool(), ['noten']).some((k) => k.soort === 'vis'));
    assert.equal(vermijdtRecept({ ingredienten: [{ naam: 'zalmfilet' }], soort: 'vlees' }, ['vis']), true);
    assert.equal(vermijdtRecept({ ingredienten: [{ naam: 'kipfilet' }], soort: 'vlees' }, ['vis']), false);
    assert.equal(vermijdtRecept({ ingredienten: [{ naam: 'witvis' }], soort: 'vis' }, []), false);
  });
});
