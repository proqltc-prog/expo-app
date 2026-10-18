import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { kiesVervanging, resetDag, resetDagLokaal } from '@/lib/planner/reset';
import { planLokaal } from '@/lib/planner/lokaal';
import type { PlanVerzoek, Weekplan } from '@/lib/planner/types';
import { Profiel, standaardProfiel } from '@/lib/profiel';
import { RECEPTENBANK } from '@/data/receptenbank';

const gezin: Profiel = { ...standaardProfiel(), kinderen: 2 };
const plan = (opdracht = '7 dagen', extra: Partial<PlanVerzoek> = {}): Weekplan =>
  planLokaal({ opdracht, kooktijden: [], stijlen: [], profiel: gezin, taal: 'nl', seed: 5, ...extra });

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
      const voor = plan('7 dagen', { seed });
      for (let i = 0; i < 7; i++) {
        totaal++;
        if (resetDagLokaal(voor, i, seed + i).dagen[i].recept.soort === voor.dagen[i].recept.soort) zelfde++;
      }
    }
    assert.ok(zelfde / totaal >= 0.8, `slechts ${zelfde} van ${totaal} met dezelfde soort`);
  });

  test('niet dezelfde basis als de dag ervoor of erna', () => {
    for (let seed = 0; seed < 40; seed++) {
      const voor = plan('7 dagen', { seed });
      const index = 1 + (seed % 5);
      const na = resetDagLokaal(voor, index, seed);
      const basis = na.dagen[index].recept.basis;
      assert.notEqual(basis, na.dagen[index - 1].recept.basis, `seed ${seed}`);
      assert.notEqual(basis, na.dagen[index + 1].recept.basis, `seed ${seed}`);
    }
  });

  test('respecteert de oorspronkelijke wensen: geen vlees blijft geen vlees', () => {
    const voor = plan('7 dagen geen vlees');
    for (let seed = 0; seed < 20; seed++) {
      assert.notEqual(resetDagLokaal(voor, seed % 7, seed).dagen[seed % 7].recept.soort, 'vlees');
    }
  });

  test('respecteert de gekozen kooktijd', () => {
    const voor = plan('4 dagen', { kooktijden: ['snel'] });
    for (let seed = 0; seed < 20; seed++) {
      assert.ok(resetDagLokaal(voor, seed % 4, seed).dagen[seed % 4].recept.minuten <= 20);
    }
  });

  test('recept in de taal van het plan en voor hetzelfde aantal porties', () => {
    const voor = plan('3 dagen', { taal: 'es' });
    const na = resetDagLokaal(voor, 1, 8);
    const bank = RECEPTENBANK.find((r) => r.id === na.dagen[1].recept.id)!;
    assert.equal(na.dagen[1].recept.naam, bank.namen[4]);
    assert.equal(na.porties, voor.porties);
  });

  test('ongeldige index laat het plan ongewijzigd', () => {
    const voor = plan();
    assert.deepEqual(resetDagLokaal(voor, 12), voor);
    assert.equal(kiesVervanging(voor, -1, 1), undefined);
  });

  test('vermijdt ook recepten met dezelfde naam (bv. van de AI)', () => {
    const voor = plan('2 dagen');
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

describe('resetDag met AI', () => {
  const aiRecept = (naam: string) => ({
    naam, soort: 'vis', minuten: 20, stijlen: ['klassiek'],
    ingredienten: [{ naam: 'zalm', hoeveelheid: 400, eenheid: 'g', afdeling: 'vlees-vis' }],
  });
  const nep = (body: unknown, status = 200) => {
    const oproepen: string[] = [];
    const f = (async (_: string, init: RequestInit) => {
      oproepen.push(init.body as string);
      return { ok: status < 400, status, json: async () => body } as Response;
    }) as unknown as typeof fetch;
    return { f, oproepen };
  };

  test('vraagt enkel die ene dag en stuurt de andere recepten mee als "vermijden"', async () => {
    const voor = plan('3 dagen');
    const { f, oproepen } = nep({ dagen: [{ dag: voor.dagen[1].dag, recept: aiRecept('Zalm met venkel') }] });
    const na = await resetDag(voor, 1, gezin, { url: 'https://x.test', fetch: f });
    assert.equal(na.dagen[1].recept.naam, 'Zalm met venkel');
    assert.deepEqual(na.dagen[0], voor.dagen[0]);
    assert.deepEqual(na.dagen[2], voor.dagen[2]);
    const verzonden = JSON.parse(oproepen[0]);
    assert.deepEqual(verzonden.dagen, [voor.dagen[1].dag]);
    assert.deepEqual(verzonden.vermijd, voor.dagen.map((d) => d.recept.naam));
    assert.equal(na.terugval, undefined);
  });

  test('AI geeft een recept dat al in de week staat: lokale terugval', async () => {
    const voor = plan('3 dagen');
    const { f } = nep({ dagen: [{ dag: voor.dagen[1].dag, recept: aiRecept(voor.dagen[0].recept.naam) }] });
    const na = await resetDag(voor, 1, gezin, { url: 'https://x.test', fetch: f });
    assert.equal(na.terugval, true);
    assert.notEqual(na.dagen[1].recept.naam, voor.dagen[0].recept.naam);
  });

  test('AI faalt: lokale terugval met melding', async () => {
    const voor = plan('3 dagen');
    const { f } = nep({}, 503);
    const na = await resetDag(voor, 2, gezin, { url: 'https://x.test', fetch: f });
    assert.equal(na.terugval, true);
    assert.notEqual(na.dagen[2].recept.id, voor.dagen[2].recept.id);
    assert.equal(na.aiLimiet, undefined);
  });

  test('daglimiet bereikt (429): lokale terugval met limietmelding', async () => {
    const voor = plan('3 dagen');
    const { f } = nep({ fout: 'Limiet' }, 429);
    const na = await resetDag(voor, 1, gezin, { url: 'https://x.test', fetch: f });
    assert.equal(na.terugval, true);
    assert.equal(na.aiLimiet, true);
  });

  test('zonder AI: meteen lokaal', async () => {
    const voor = plan('3 dagen');
    const na = await resetDag(voor, 0, gezin, {}, 4);
    assert.notEqual(na.dagen[0].recept.id, voor.dagen[0].recept.id);
    assert.equal(na.terugval, undefined);
  });
});
