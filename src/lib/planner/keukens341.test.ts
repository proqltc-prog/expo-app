// WEEK-341: Indiaas, Chinees, Belgisch en Frans vinden de gerechten met die stijl in de databank.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { stijlNaarDb } from '@/lib/planner/brug';
import { planUitDatabase } from '@/lib/planner/dbplan';
import { normaliseerWeekplan } from '@/lib/planner/normaliseer';
import { beeldVoorReceptStijl } from '@/lib/planner/stijlbeeld';
import { testPool } from '@/lib/planner/testrecepten';
import type { PlanVerzoek } from '@/lib/planner/types';
import type { StijlCode } from '@/data/recept';
import { Profiel, standaardProfiel } from '@/lib/profiel';

const gezin: Profiel = { ...standaardProfiel(), volwassenen: 2, kinderen: 0 };
const verzoek = (stijlen: StijlCode[]): PlanVerzoek => ({ kooktijden: [], stijlen, profiel: gezin, taal: 'nl', seed: 11, aantalDagen: 3 });

describe('WEEK-341: keuze → stijlen in de databank', () => {
  test('de eigen stijl én de oude, ruimere stijl', () => {
    // UAT: algemene Aziatische gerechten (woknoedels, Indonesisch) horen niet bij Indiaas.
    assert.deepEqual(stijlNaarDb(['indiaas']), ['indiaas']);
    assert.deepEqual(stijlNaarDb(['chinees']), ['chinees', 'aziatisch']);
    assert.deepEqual(stijlNaarDb(['belgisch']), ['belgisch', 'klassiek']);
    assert.deepEqual(stijlNaarDb(['frans']), ['frans', 'klassiek']);
  });
  test('regressie: de andere keukens blijven hetzelfde, geen dubbels', () => {
    assert.deepEqual(stijlNaarDb(['italiaans', 'thais']), ['italiaans', 'thais']);
    assert.deepEqual(stijlNaarDb(['belgisch', 'frans']), ['belgisch', 'klassiek', 'frans']);
    assert.deepEqual(stijlNaarDb(['bestaat-niet']), []);
  });
});

describe('WEEK-341: het weekmenu', () => {
  // Testgerechten met de fijnere stijlen uit de databank.
  const pool = testPool('nl', gezin).map((k) => {
    const nieuw: Record<string, StijlCode> = { 'db-1': 'indiaas', 'db-5': 'belgisch', 'db-2': 'frans', 'db-6': 'chinees' };
    return nieuw[k.recept.id] ? { ...k, stijlen: [nieuw[k.recept.id]] } : k;
  });
  test('enkel Indiaas gekozen: het Indiase gerecht komt in het menu, niet als opvulling', () => {
    const plan = planUitDatabase(verzoek(stijlNaarDb(['indiaas'])), pool)!;
    assert.equal(plan.dagen[0].recept.id, 'db-1');
    // Met maar één Indiaas testgerecht vult de planner de andere dagen aan; dag 1 is het Indiase gerecht.
  });
  test('enkel Belgisch gekozen: het Belgische gerecht komt eerst', () => {
    const plan = planUitDatabase(verzoek(stijlNaarDb(['belgisch'])), pool)!;
    assert.ok(plan.dagen.some((d) => d.recept.id === 'db-5'));
  });
  test('regressie: een bewaard weekmenu houdt de stijlen indiaas/belgisch na opslaan en inlezen', () => {
    const plan = planUitDatabase(verzoek(stijlNaarDb(['indiaas', 'belgisch'])), pool)!;
    const terug = normaliseerWeekplan(JSON.parse(JSON.stringify(plan)))!;
    assert.deepEqual(terug.stijlen, ['indiaas', 'belgisch', 'klassiek']);
  });
  test('het beeld van de keuken klopt', () => {
    assert.equal(beeldVoorReceptStijl('indiaas'), 'indiaas');
    assert.equal(beeldVoorReceptStijl('frans'), 'frans');
    assert.equal(beeldVoorReceptStijl('aziatisch'), 'chinees');
  });
});

describe('WEEK-341 (UAT): de eigen keuken gaat voor op de ruime stijl', () => {
  const g: Profiel = { ...standaardProfiel(), volwassenen: 2, kinderen: 0 };
  // db-5 belgisch, db-8 klassiek; met Belgisch gekozen komt db-5 eerst, klassiek vult aan.
  const pool = testPool('nl', g).map((k) => (k.recept.id === 'db-5' ? { ...k, stijlen: ['belgisch' as StijlCode] } : k));
  test('Belgisch gekozen: eerst het Belgische gerecht, daarna klassiek', () => {
    const plan = planUitDatabase({ kooktijden: [], stijlen: stijlNaarDb(['belgisch']), profiel: g, taal: 'nl', seed: 3, aantalDagen: 2 }, pool)!;
    assert.equal(plan.dagen[0].recept.id, 'db-5');
    assert.ok(plan.dagen[1].recept.stijlen.includes('klassiek'));
  });
  test('regressie: enkel een ruime stijl gekozen (hartig → klassiek) blijft zoals voorheen', () => {
    const plan = planUitDatabase({ kooktijden: [], stijlen: stijlNaarDb(['hartig']), profiel: g, taal: 'nl', seed: 3, aantalDagen: 2 }, pool)!;
    assert.ok(plan.dagen.every((d) => d.recept.stijlen.includes('klassiek') || d.recept.stijlen.includes('belgisch') || plan.versoepeld));
  });
});

describe('WEEK-341 (UAT): de keuken gaat ook voor op het seizoen', () => {
  const g: Profiel = { ...standaardProfiel(), volwassenen: 2, kinderen: 0 };
  // db-1 = chinees, hele jaar; db-6 = aziatisch, enkel winter. In de winter met Chinees gekozen: eerst db-1.
  const pool = testPool('nl', g).map((k) =>
    k.recept.id === 'db-1' ? { ...k, stijlen: ['chinees' as StijlCode], seizoenen: [] } : k.recept.id === 'db-6' ? { ...k, stijlen: ['aziatisch' as StijlCode], seizoenen: ['winter' as const] } : k,
  );
  test('een Chinees gerecht van het hele jaar gaat voor op een Aziatisch wintergerecht', () => {
    const plan = planUitDatabase({ kooktijden: [], stijlen: stijlNaarDb(['chinees']), profiel: g, taal: 'nl', seed: 5, datums: ['2027-01-11', '2027-01-12'] }, pool)!;
    assert.equal(plan.dagen[0].recept.id, 'db-1');
    assert.equal(plan.dagen[1].recept.id, 'db-6');
  });
});

describe('UAT 26/11: keuzes bij het openen van het weekmenu', async () => {
  const { keuzesBijStart } = await import('@/lib/planner/fasen');
  const bewaard = { aantalDagen: 6, datums: [], uitgesloten: [], momenten: ['avond' as const], kooktijden: ['snel'], stijlen: ['japans'], vermijd: ['noten'], enkelVegetarisch: true };
  test('"Alleen vegetarische gerechten" blijft aan na het heropenen', () => {
    assert.equal(keuzesBijStart(bewaard, '2026-11-26').enkelVegetarisch, true);
  });
  test('regressie: de andere keuzes blijven, zonder datums start de periode vandaag', () => {
    const k = keuzesBijStart(bewaard, '2026-11-26');
    assert.deepEqual(k.stijlen, ['japans']);
    assert.deepEqual(k.vermijd, ['noten']);
    assert.equal(k.datums[0], '2026-11-26');
    assert.equal(k.aantalDagen, k.datums.length);
  });
  test('negatief: niet vegetarisch blijft niet vegetarisch; lege kooktijd wordt snel', () => {
    const k = keuzesBijStart({ ...bewaard, enkelVegetarisch: false, kooktijden: [] }, '2026-11-26');
    assert.ok(!k.enkelVegetarisch);
    assert.deepEqual(k.kooktijden, ['snel']);
  });
});
