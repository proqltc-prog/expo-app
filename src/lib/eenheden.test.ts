import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  keukenMaatUitBron,
  keuzeEenheden,
  naarBasis,
  normaliseerKeukenMaat,
  pastBij,
  schaalKeukenMaat,
  telKeukenMaatOp,
} from '@/lib/eenheden';
import { normaliseerEigen } from '@/lib/eigenrecepten';
import { eigenNaarPlanRecept } from '@/lib/planner/kies';
import { normaliseerIngredient } from '@/lib/planner/normaliseer';
import { verwerkRecept, voegSamen } from '@/lib/receptLink';
import { ingredientenVoor } from '@/lib/bereiding';
import { hoeveelheidTekst, eenheidNaam } from '@/i18n';
import type { Weekplan } from '@/lib/planner/types';

describe('keukeneenheden kiezen (WEEK-270)', () => {
  test('bij een ingrediënt in ml: ml, cl, dl, l, el, kl, scheutje', () => {
    assert.deepEqual([...keuzeEenheden('ml')], ['ml', 'cl', 'dl', 'l', 'el', 'kl', 'scheutje']);
  });
  test('bij een ingrediënt in gram: g, kg, el, kl, snuifje, zakje, blaadje, takje, bosje', () => {
    assert.deepEqual([...keuzeEenheden('g')], ['g', 'kg', 'el', 'kl', 'snuifje', 'zakje', 'blaadje', 'takje', 'bosje']);
  });
  test('met een gekend stukgewicht kan je bij gram ook "stuk" kiezen', () => {
    assert.ok(keuzeEenheden('g', 120).includes('stuk'));
    assert.ok(!keuzeEenheden('g').includes('stuk'));
  });
  test('stuk en teentje hebben geen andere keuze (de lijst blijft eenvoudig)', () => {
    assert.deepEqual([...keuzeEenheden('stuk')], ['stuk']);
    assert.deepEqual([...keuzeEenheden('teentje')], ['teentje']);
  });
  test('een maat past niet bij elke basis: dl niet bij gram, kg niet bij ml', () => {
    assert.equal(pastBij('dl', 'g'), false);
    assert.equal(pastBij('kg', 'ml'), false);
    assert.equal(pastBij('el', 'g'), true);
  });
});

describe('omrekenen naar de basiseenheid (WEEK-270)', () => {
  test('vaste maten', () => {
    assert.equal(naarBasis(2, 'el', 'ml'), 30);
    assert.equal(naarBasis(1, 'kl', 'ml'), 5);
    assert.equal(naarBasis(5, 'cl', 'ml'), 50);
    assert.equal(naarBasis(1.5, 'dl', 'ml'), 150);
    assert.equal(naarBasis(0.25, 'l', 'ml'), 250);
    assert.equal(naarBasis(0.5, 'kg', 'g'), 500);
  });
  test('richtwaarden: zakje, snuifje, blaadje, takje, bosje', () => {
    assert.equal(naarBasis(1, 'zakje', 'g'), 8);
    assert.equal(naarBasis(1, 'snuifje', 'g'), 0.5);
    assert.equal(naarBasis(2, 'blaadje', 'g'), 0.4);
    assert.equal(naarBasis(3, 'takje', 'g'), 3);
    assert.equal(naarBasis(1, 'bosje', 'g'), 20);
  });
  test('stuk bij gram rekent met het stukgewicht', () => {
    assert.equal(naarBasis(2, 'stuk', 'g', 120), 240);
  });
  test('de basis zelf of een maat die niet past: ongewijzigd (geen gok)', () => {
    assert.equal(naarBasis(200, 'g', 'g'), 200);
    assert.equal(naarBasis(2, 'dl', 'g'), 2);
  });
  test('geen zwevendekommafouten', () => {
    assert.equal(naarBasis(0.1, 'dl', 'ml'), 10);
    assert.equal(naarBasis(0.3, 'el', 'ml'), 4.5);
  });
});

describe('keukenmaat bewaren, schalen en samentellen (WEEK-270)', () => {
  test('een geldige maat blijft, een ongeldige valt weg', () => {
    assert.deepEqual(normaliseerKeukenMaat({ eenheid: 'el', hoeveelheid: 2 }, 'ml'), { eenheid: 'el', hoeveelheid: 2 });
    assert.equal(normaliseerKeukenMaat({ eenheid: 'dl', hoeveelheid: 2 }, 'g'), undefined);
    assert.equal(normaliseerKeukenMaat({ eenheid: 'ml', hoeveelheid: 2 }, 'ml'), undefined); // de basis zelf: geen keukenmaat nodig
    assert.equal(normaliseerKeukenMaat({ eenheid: 'el', hoeveelheid: 0 }, 'ml'), undefined);
    assert.equal(normaliseerKeukenMaat({ eenheid: 'emmer', hoeveelheid: 1 }, 'ml'), undefined);
    assert.equal(normaliseerKeukenMaat(null, 'ml'), undefined);
  });
  test('schalen met het gezin, afgerond op een halve eenheid', () => {
    assert.deepEqual(schaalKeukenMaat({ eenheid: 'el', hoeveelheid: 1 }, 2.5), { eenheid: 'el', hoeveelheid: 2.5 });
    assert.deepEqual(schaalKeukenMaat({ eenheid: 'kl', hoeveelheid: 0.3 }, 1), { eenheid: 'kl', hoeveelheid: 0.5 });
    assert.deepEqual(schaalKeukenMaat({ eenheid: 'el', hoeveelheid: 1 }, 0), { eenheid: 'el', hoeveelheid: 0 });
  });
  test('samentellen: zelfde eenheid telt op, verschillende eenheden laten de keukenmaat vallen', () => {
    assert.deepEqual(telKeukenMaatOp({ eenheid: 'el', hoeveelheid: 1 }, { eenheid: 'el', hoeveelheid: 0.5 }), { eenheid: 'el', hoeveelheid: 1.5 });
    assert.equal(telKeukenMaatOp({ eenheid: 'el', hoeveelheid: 1 }, { eenheid: 'kl', hoeveelheid: 1 }), undefined);
    assert.equal(telKeukenMaatOp({ eenheid: 'el', hoeveelheid: 1 }, undefined), undefined);
  });
  test('een maat van een receptensite, per volwassene', () => {
    assert.deepEqual(keukenMaatUitBron({ soort: 'ml', factor: 15 }, 2, 'ml', 4), { eenheid: 'el', hoeveelheid: 0.5 });
    assert.deepEqual(keukenMaatUitBron({ soort: 'ml', factor: 100 }, 2, 'ml', 2), { eenheid: 'dl', hoeveelheid: 1 });
    assert.deepEqual(keukenMaatUitBron({ soort: 'ml', factor: 15 }, 2, 'g', 2), { eenheid: 'el', hoeveelheid: 1 }); // 2 el bloem
    assert.equal(keukenMaatUitBron({ soort: 'ml', factor: 100 }, 2, 'g', 2), undefined); // dl bij gram: niet
    assert.equal(keukenMaatUitBron({ soort: 'g', factor: 1 }, 200, 'g', 2), undefined); // gewoon gram: geen keukenmaat
    assert.equal(keukenMaatUitBron(undefined, 2, 'ml', 2), undefined);
  });
});

describe('keukenmaat doorheen de app (WEEK-270), regressie: de basis blijft tellen', () => {
  const eigen = (keuken?: unknown) =>
    normaliseerEigen([
      {
        id: 'eigen:1',
        naam: 'Dressing',
        soort: 'vegetarisch',
        minuten: 10,
        stijlen: [],
        ingredienten: [{ code: 'olijfolie', naam: 'olijfolie', hoeveelheid: 30, eenheid: 'ml', ...(keuken ? { keuken } : {}) }],
        stappen: ['Meng.'],
        bijgewerkt: '2026-11-12',
      },
    ])[0];

  test('een bewaard eigen gerecht houdt de keukenmaat; een ongeldige valt weg, de basis blijft', () => {
    assert.deepEqual(eigen({ eenheid: 'el', hoeveelheid: 2 }).ingredienten[0].keuken, { eenheid: 'el', hoeveelheid: 2 });
    const fout = eigen({ eenheid: 'kg', hoeveelheid: 2 }).ingredienten[0];
    assert.equal(fout.keuken, undefined);
    assert.equal(fout.hoeveelheid, 30);
  });
  test('in het weekmenu schaalt de keukenmaat mee; de basishoeveelheid (voor de lijst) ook', () => {
    const pr = eigenNaarPlanRecept(eigen({ eenheid: 'el', hoeveelheid: 2 }), { volwassenen: 2, kinderen: 1 });
    assert.deepEqual(pr.ingredienten[0].keuken, { eenheid: 'el', hoeveelheid: 5 });
    assert.equal(pr.ingredienten[0].eenheid, 'ml');
    assert.ok(pr.ingredienten[0].hoeveelheid >= 70 && pr.ingredienten[0].hoeveelheid <= 80);
  });
  test('zonder keukenmaat verandert er niets aan het planrecept', () => {
    const pr = eigenNaarPlanRecept(eigen(), { volwassenen: 2, kinderen: 0 });
    assert.equal(pr.ingredienten[0].keuken, undefined);
  });
  test('het opgeslagen weekmenu houdt een geldige keukenmaat', () => {
    assert.deepEqual(normaliseerIngredient({ naam: 'olie', hoeveelheid: 75, eenheid: 'ml', keuken: { eenheid: 'el', hoeveelheid: 5 } })?.keuken, { eenheid: 'el', hoeveelheid: 5 });
    assert.equal(normaliseerIngredient({ naam: 'olie', hoeveelheid: 75, eenheid: 'ml', keuken: { eenheid: 'el' } })?.keuken, undefined);
  });
  test('de bereiding krijgt de keukenmaat mee', () => {
    const plan = {
      dagen: [{ dag: 'maandag', recept: { id: 'eigen:1', naam: 'Dressing', soort: 'vegetarisch', minuten: 10, stijlen: [], ingredienten: [{ naam: 'olijfolie', hoeveelheid: 75, eenheid: 'ml', keuken: { eenheid: 'el', hoeveelheid: 5 } }] } }],
      kooktijden: [],
      stijlen: [],
      taal: 'nl',
      porties: 2.5,
      bron: 'db',
      gemaaktOp: '2026-11-12T10:00:00.000Z',
    } as unknown as Weekplan;
    assert.deepEqual(ingredientenVoor(plan, 'eigen:1')[0], { naam: 'olijfolie', hoeveelheid: 75, eenheid: 'ml', keuken: { eenheid: 'el', hoeveelheid: 5 } });
  });
  test('een ingelezen recept met "2 el olijfolie" toont el; de basis blijft ml', () => {
    const r = verwerkRecept({ naam: 'Saus', personen: 2, ingredienten: ['2 el olijfolie'], stappen: ['Kook.'] }, 'nl');
    const olie = r.ingredienten.find((i) => i.code === 'olijfolie');
    assert.equal(olie?.hoeveelheid, 15);
    assert.deepEqual(olie?.keuken, { eenheid: 'el', hoeveelheid: 1 });
  });
  test('samenvoegen in een ingelezen recept: zelfde eenheid telt op, andere eenheid valt terug op de basis', () => {
    const a = { code: 'olijfolie', naam: 'olijfolie', hoeveelheid: 15, eenheid: 'ml' as const, keuken: { eenheid: 'el' as const, hoeveelheid: 1 } };
    assert.deepEqual(voegSamen([a], a)[0].keuken, { eenheid: 'el', hoeveelheid: 2 });
    const b = { ...a, hoeveelheid: 5, keuken: { eenheid: 'kl' as const, hoeveelheid: 1 } };
    const samen = voegSamen([a], b)[0];
    assert.equal(samen.keuken, undefined);
    assert.equal(samen.hoeveelheid, 20);
  });
});

describe('keukeneenheden in elke taal (WEEK-270)', () => {
  test('el en kl', () => {
    assert.equal(hoeveelheidTekst('nl', 2, 'el'), '2 el');
    assert.equal(hoeveelheidTekst('fr', 2, 'el'), '2 c. à s.');
    assert.equal(hoeveelheidTekst('de', 1, 'kl'), '1 TL');
    assert.equal(hoeveelheidTekst('en', 1.5, 'el'), '1.5 tbsp');
  });
  test('zakje, bosje, blaadje', () => {
    assert.equal(eenheidNaam('fr', 'zakje'), 'sachet');
    assert.equal(eenheidNaam('de', 'bosje'), 'Bund');
    assert.equal(eenheidNaam('en', 'blaadje'), 'leaf');
  });
  test('regressie: metrische eenheden, stuk en teentje blijven zoals vroeger', () => {
    assert.equal(hoeveelheidTekst('nl', 200, 'g'), '200 g');
    assert.equal(hoeveelheidTekst('nl', 2, 'dl'), '2 dl');
    assert.equal(hoeveelheidTekst('nl', 2, 'stuk'), '2 ×');
    assert.equal(eenheidNaam('nl', 'ml'), 'ml');
  });
});
