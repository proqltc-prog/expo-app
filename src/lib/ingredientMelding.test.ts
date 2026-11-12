// WEEK-248: welke overgeslagen ingrediënten gemeld worden en onder welke naam.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { meldbareNaam, meldingSleutel, teMelden } from './ingredientMelding';
import { kernNaam, verwerkRecept } from './receptLink';

describe('WEEK-248: kernNaam', () => {
  test('kleine letters, zonder bijwoorden, haakjes en wat na de komma komt, met accenten', () => {
    assert.equal(kernNaam('Verse Dragon'), 'dragon');
    assert.equal(kernNaam('fijngehakte citroengras (2 stengels)'), 'citroengras');
    assert.equal(kernNaam('Crème de cassis, naar smaak'), 'crème cassis');
    assert.equal(kernNaam('frische Bärlauch'), 'bärlauch');
  });
});

describe('WEEK-248: meldbareNaam', () => {
  test('een gewone naam blijft, in kleine letters', () => {
    assert.equal(meldbareNaam('Yuzu'), 'yuzu');
    assert.equal(meldbareNaam('  piment d’Espelette '), "piment d'espelette");
    assert.equal(meldbareNaam('za-atar'), 'za-atar');
  });
  test('dubbels door bijwoorden worden één naam', () => {
    assert.equal(meldbareNaam('verse yuzu'), meldbareNaam('Yuzu'));
  });
  test('cijfers, tekens, te kort, te lang of een zin worden niet gemeld', () => {
    assert.equal(meldbareNaam('E621'), undefined);
    assert.equal(meldbareNaam('x'), undefined);
    assert.equal(meldbareNaam('<script>'), undefined);
    assert.equal(meldbareNaam('www.voorbeeld.be'), undefined);
    assert.equal(meldbareNaam('a'.repeat(61)), undefined);
    assert.equal(meldbareNaam('een beetje van alles wat je nog in huis hebt'), undefined);
    assert.equal(meldbareNaam(''), undefined);
  });
});

describe('WEEK-248: teMelden', () => {
  test('enkel een onbekend ingrediënt, in de taal van het recept', () => {
    assert.deepEqual(teMelden({ reden: 'onbekend', naam: 'Verse yuzu', taal: 'fr' }), { naam: 'yuzu', taal: 'fr' });
  });
  test('een voorstel of ontbrekende hoeveelheid (gekend ingrediënt) nooit: geen dubbels in de meldingen', () => {
    assert.equal(teMelden({ reden: 'voorstel', naam: 'rijpe tomaten', taal: 'nl', code: 'tomaat' }), undefined);
    assert.equal(teMelden({ reden: 'hoeveelheid', naam: 'basilicum', taal: 'nl', code: 'basilicum' }), undefined);
  });
  test('een ongeldige naam wordt niet gemeld', () => {
    assert.equal(teMelden({ reden: 'onbekend', naam: '123', taal: 'nl' }), undefined);
  });
  test('meldingSleutel onderscheidt taal en naam', () => {
    assert.notEqual(meldingSleutel({ naam: 'yuzu', taal: 'nl' }), meldingSleutel({ naam: 'yuzu', taal: 'fr' }));
  });
});

describe('WEEK-248: taal van de regels om na te kijken', () => {
  test('de taal van de site, anders die van de app', () => {
    const vanSite = verwerkRecept({ naam: 'X', taal: 'fr', ingredienten: ['1 c. à soupe de drakenpoeder'], stappen: [] }, 'nl');
    assert.equal(vanSite.nakijken[0]?.taal, 'fr');
    const zonder = verwerkRecept({ naam: 'X', ingredienten: ['1 snufje drakenpoeder'], stappen: [] }, 'de');
    assert.equal(zonder.nakijken[0]?.taal, 'de');
    assert.deepEqual(teMelden(zonder.nakijken[0]!), { naam: 'drakenpoeder', taal: 'de' });
  });
});
