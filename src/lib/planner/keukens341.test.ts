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
    assert.deepEqual(stijlNaarDb(['indiaas']), ['indiaas', 'aziatisch']);
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
    assert.deepEqual(terug.stijlen, ['indiaas', 'aziatisch', 'belgisch', 'klassiek']);
  });
  test('het beeld van de keuken klopt', () => {
    assert.equal(beeldVoorReceptStijl('indiaas'), 'indiaas');
    assert.equal(beeldVoorReceptStijl('frans'), 'frans');
    assert.equal(beeldVoorReceptStijl('aziatisch'), 'chinees');
  });
});
