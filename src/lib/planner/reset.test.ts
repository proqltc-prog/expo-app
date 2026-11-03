import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { kiesVervanging, resetDagLokaal } from '@/lib/planner/reset';
import { planLokaal } from '@/lib/planner/lokaal';
import type { PlanVerzoek, Weekplan } from '@/lib/planner/types';
import { Profiel, standaardProfiel } from '@/lib/profiel';
import { RECEPTENBANK } from '@/data/receptenbank';

const gezin: Profiel = { ...standaardProfiel(), kinderen: 2 };
const plan = (extra: Partial<PlanVerzoek> = {}): Weekplan =>
  planLokaal({ aantalDagen: 7, kooktijden: [], stijlen: [], profiel: gezin, taal: 'nl', seed: 5, ...extra });

const ids = (p: Weekplan) => p.dagen.map((d) => d.recept.id);

describe('resetDagLokaal', () => {
  test('vervangt enkel de gekozen dag; de rest blijft identiek', () => {
    const voor = plan();
    for (let index = 0; index < voor.dagen.length; index++) {
      const na = resetDagLokaal(voor, index, 99 + index);
      na.dagen.forEach((d, i) => {
        if (i === index) assert.notEqual(d.recept.id, voor.dagen[i].recept.id, `dag ${index} niet vervangen`);
        else assert.deepEqual(d, voor.dagen[i]);
      });
      assert.equal(na.dagen[index].dag, voor.dagen[index].dag);
    }
  });

  test('het nieuwe recept staat nog nergens anders in de week', () => {
    for (let seed = 0; seed < 40; seed++) {
      const na = resetDagLokaal(plan(), seed % 7, seed);
      assert.equal(new Set(ids(na)).size, 7, `seed ${seed}`);
    }
  });

  test('houdt meestal de soort van de dag (balans), maar variatie gaat voor', () => {
    let zelfde = 0;
    let totaal = 0;
    for (let seed = 0; seed < 30; seed++) {
      const voor = plan({ seed });
      for (let i = 0; i < 7; i++) {
        totaal++;
        if (resetDagLokaal(voor, i, seed + i).dagen[i].recept.soort === voor.dagen[i].recept.soort) zelfde++;
      }
    }
    assert.ok(zelfde / totaal >= 0.8, `slechts ${zelfde} van ${totaal} met dezelfde soort`);
  });

  test('niet dezelfde basis als de dag ervoor of erna', () => {
    for (let seed = 0; seed < 40; seed++) {
      const voor = plan({ seed });
      const index = 1 + (seed % 5);
      const na = resetDagLokaal(voor, index, seed);
      const basis = na.dagen[index].recept.basis;
      assert.notEqual(basis, na.dagen[index - 1].recept.basis, `seed ${seed}`);
      assert.notEqual(basis, na.dagen[index + 1].recept.basis, `seed ${seed}`);
    }
  });

  test('respecteert de gekozen kooktijd', () => {
    const voor = plan({ kooktijden: ['snel'] });
    for (let seed = 0; seed < 20; seed++) {
      assert.ok(resetDagLokaal(voor, seed % 4, seed).dagen[seed % 4].recept.minuten <= 20);
    }
  });

  test('recept in de taal van het plan en voor hetzelfde aantal porties', () => {
    const voor = plan({ taal: 'en' });
    const na = resetDagLokaal(voor, 1, 8);
    const bank = RECEPTENBANK.find((r) => r.id === na.dagen[1].recept.id)!;
    assert.equal(na.dagen[1].recept.naam, bank.namen[3]);
    assert.equal(na.porties, voor.porties);
  });

  test('ongeldige index laat het plan ongewijzigd', () => {
    const voor = plan();
    assert.deepEqual(resetDagLokaal(voor, 12), voor);
    assert.equal(kiesVervanging(voor, -1, 1), undefined);
  });

  test('vermijdt ook recepten met dezelfde naam (bv. van de AI)', () => {
    const voor = plan();
    const bolo = RECEPTENBANK.find((r) => r.id === 'bolognaise')!;
    const metAi: Weekplan = {
      ...voor,
      dagen: [{ ...voor.dagen[0], recept: { ...voor.dagen[0].recept, id: 'ai-x', naam: bolo.namen[0] } }, voor.dagen[1]],
    };
    for (let seed = 0; seed < 30; seed++) {
      assert.notEqual(kiesVervanging(metAi, 1, seed)?.id, 'bolognaise');
    }
  });
});


describe('afgewezen recepten bij reset (WEEK-184)', () => {
  test('een eerder vervangen recept komt de rest van de week op geen enkele dag meer terug', () => {
    let huidig = plan();
    const afgewezen = new Set<string>();
    for (let stap = 0; stap < 12; stap++) {
      const index = stap % 7;
      const oud = huidig.dagen[index].recept.id;
      afgewezen.add(oud);
      huidig = { ...huidig, afgewezen: [...afgezenLijst(huidig), oud] };
      const na = resetDagLokaal(huidig, index, 1000 + stap);
      if (na === huidig) break;
      huidig = na;
      for (const id of afgewezen) {
        assert.ok(!ids(huidig).includes(id), `stap ${stap}: ${id} kwam terug`);
      }
    }
  });

  test('een recept dat al in de afgewezen lijst staat, wordt nooit gekozen', () => {
    for (let seed = 0; seed < 30; seed++) {
      const basis = plan();
      const verboden = RECEPTENBANK.slice(0, 10).map((r) => r.id);
      const na = kiesVervanging({ ...basis, afgewezen: verboden }, seed % 7, seed);
      if (na) assert.ok(!verboden.includes(na.id), `seed ${seed}`);
    }
  });
});

const afgezenLijst = (p: Weekplan): string[] => p.afgewezen ?? [];
