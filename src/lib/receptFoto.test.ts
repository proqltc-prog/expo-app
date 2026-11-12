// WEEK-251: een recept inlezen via een foto. Het antwoord van de AI (Gemini) wordt nagekeken en begrensd;
// de tests gebruiken zelfgemaakte antwoorden en roepen nooit de echte dienst aan.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { alsFotoFout, FOTO_MAX_ZIJDE, fotoTijdelijkOnbereikbaar, leesFotoRecept, MAX_INGREDIENTEN, MAX_STAPPEN, verkleinMaat } from './receptFoto';
import { verwerkRecept } from './receptLink';
import { teMelden } from './ingredientMelding';

const KAART = {
  gevonden: true,
  naam: 'Witloof met ham en kaas',
  personen: 4,
  minuten: 45,
  taal: 'nl',
  ingredienten: ['8 stronken witloof', '8 sneden ham', '200 g geraspte kaas', '50 g boter', '1 snufje nootmuskaat'],
  stappen: ['1. Kook het witloof 10 minuten.', 'Stap 2: Rol elk stronkje in een sneetje ham.', 'Bak 25 minuten in de oven.'],
};

describe('WEEK-251: leesFotoRecept', () => {
  test('een goed antwoord wordt een RuwRecept, stappen zonder nummering', () => {
    const r = leesFotoRecept(KAART)!;
    assert.equal(r.naam, 'Witloof met ham en kaas');
    assert.equal(r.personen, 4);
    assert.equal(r.minuten, 45);
    assert.equal(r.taal, 'nl');
    assert.equal(r.ingredienten.length, 5);
    assert.deepEqual(r.stappen, ['Kook het witloof 10 minuten.', 'Rol elk stronkje in een sneetje ham.', 'Bak 25 minuten in de oven.']);
  });

  test('geen recept: gevonden false, geen ingrediënten of geen object', () => {
    assert.equal(leesFotoRecept({ gevonden: false }), undefined);
    assert.equal(leesFotoRecept({ gevonden: true, naam: 'X', ingredienten: [] }), undefined);
    assert.equal(leesFotoRecept(null), undefined);
    assert.equal(leesFotoRecept('tekst'), undefined);
    assert.equal(leesFotoRecept([KAART]), undefined);
  });

  test('vreemde waarden worden genegeerd of begrensd', () => {
    const r = leesFotoRecept({
      gevonden: true,
      naam: 'N'.repeat(500),
      personen: 0,
      minuten: -5,
      taal: 'es',
      ingredienten: ['200 g bloem', 42, null, '   ', 'x'.repeat(500)],
      stappen: 'geen lijst',
    })!;
    assert.equal(r.naam.length, 120);
    assert.equal(r.personen, undefined);
    assert.equal(r.minuten, undefined);
    assert.equal(r.taal, undefined);
    assert.deepEqual(r.ingredienten.map((i) => i.length), [11, 200]);
    assert.deepEqual(r.stappen, []);
  });

  test('te veel regels worden afgekapt', () => {
    const r = leesFotoRecept({ ingredienten: Array.from({ length: 100 }, (_, i) => `${i} g suiker`), stappen: Array.from({ length: 100 }, () => 'Roer.') })!;
    assert.equal(r.ingredienten.length, MAX_INGREDIENTEN);
    assert.equal(r.stappen.length, MAX_STAPPEN);
  });

  test('personen en minuten worden afgerond; taal "fr-BE" wordt fr', () => {
    const r = leesFotoRecept({ ...KAART, personen: 3.6, minuten: 29.7, taal: 'fr-BE' })!;
    assert.equal(r.personen, 4);
    assert.equal(r.minuten, 30);
    assert.equal(r.taal, 'fr');
  });
});

describe('WEEK-251: verkleinMaat', () => {
  test('enkel de langste zijde wordt begrensd', () => {
    assert.deepEqual(verkleinMaat(4000, 3000), { width: FOTO_MAX_ZIJDE });
    assert.deepEqual(verkleinMaat(3000, 4000), { height: FOTO_MAX_ZIJDE });
  });
  test('een kleine of onbekende maat blijft zoals ze is', () => {
    assert.equal(verkleinMaat(1200, 900), undefined);
    assert.equal(verkleinMaat(1600, 1600), undefined);
    assert.equal(verkleinMaat(0, 0), undefined);
  });
});

describe('WEEK-251: alsFotoFout', () => {
  test('gekende foutcodes blijven, de rest wordt "niet bereikbaar"', () => {
    assert.equal(alsFotoFout('limiet'), 'limiet');
    assert.equal(alsFotoFout('niet_ingesteld'), 'niet_ingesteld');
    assert.equal(alsFotoFout('aanmelden'), 'niet_bereikbaar');
    assert.equal(alsFotoFout(undefined), 'niet_bereikbaar');
    assert.equal(alsFotoFout('geen_verbinding'), 'niet_bereikbaar');
  });
});

describe('WEEK-251: zelfde verwerking als een link (regressie WEEK-247/248)', () => {
  test('ingrediënten gekoppeld en omgerekend naar één volwassene, onbekende om na te kijken en te melden', () => {
    const r = verwerkRecept({ ...leesFotoRecept(KAART)!, ingredienten: ['200 g geraspte kaas', '50 g boter', '1 snufje drakenpoeder'] }, 'nl');
    assert.equal(r.personen, 4);
    assert.equal(r.ingredienten.find((i) => i.code === 'boter')?.hoeveelheid, 15); // 50 g / 4 ≈ 12,5 → 15
    const onbekend = r.nakijken.find((n) => n.tekst.includes('drakenpoeder'));
    assert.ok(onbekend);
    assert.deepEqual(teMelden(onbekend!), { naam: 'drakenpoeder', taal: 'nl' });
  });
});

describe('WEEK-258: foto lezen tijdelijk onbereikbaar', () => {
  test('druk, niet bereikbaar of niet ingesteld: alternatieven tonen', () => {
    for (const f of ['druk', 'niet_bereikbaar', 'niet_ingesteld'] as const) assert.equal(fotoTijdelijkOnbereikbaar(f), true);
  });
  test('andere fouten: hun eigen melding', () => {
    for (const f of ['geen_recept', 'limiet', 'te_groot', 'geen_foto', 'geenToestemming', undefined] as const) assert.equal(fotoTijdelijkOnbereikbaar(f), false);
  });
});
