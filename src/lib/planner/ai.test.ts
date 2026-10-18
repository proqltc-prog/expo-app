import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AiFout, bouwAiVerzoek, leesAiAntwoord, planWeek } from '@/lib/planner/ai';
import { gebruikersBericht, STANDAARD_MODEL, systeemPrompt, TAALNAAM, WEEKPLAN_SCHEMA } from '@/lib/planner/aiPrompt';
import type { DagCode, PlanVerzoek } from '@/lib/planner/types';
import { Profiel, standaardProfiel } from '@/lib/profiel';
import { TALEN } from '@/i18n';
import { STIJLEN } from '@/data/receptenbank';
import { AFDELINGEN } from '@/data/ingredienten';

const gezin: Profiel = {
  ...standaardProfiel(),
  kinderen: 2,
  adres: { postcode: '1000', gemeente: 'Brussel', land: 'België' },
};
const verzoek = (extra: Partial<PlanVerzoek> = {}): PlanVerzoek => ({
  opdracht: '', kooktijden: [], stijlen: [], profiel: gezin, taal: 'fr', seed: 1, ...extra,
});

const recept = (naam: string, soort = 'vegetarisch', minuten = 20) => ({
  naam, soort, minuten, stijlen: ['klassiek'],
  ingredienten: [{ naam: 'poireau', hoeveelheid: 2, eenheid: 'stuk', afdeling: 'groenten-fruit' }],
});
const antwoordVoor = (dagen: DagCode[], soort = 'vegetarisch', minuten = 20) => ({
  dagen: dagen.map((dag, i) => ({ dag, recept: recept(`Plat ${i}`, soort, minuten) })),
});

/** Nep-fetch die een vast antwoord teruggeeft en het verzoek onthoudt. */
function nepFetch(body: unknown, status = 200) {
  const oproepen: { url: string; init: RequestInit }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    oproepen.push({ url, init });
    return { ok: status < 400, status, json: async () => body } as Response;
  }) as unknown as typeof fetch;
  return { f, oproepen };
}

describe('gedeelde AI-afspraken', () => {
  test('standaard het goedkoopste Claude-model (WEEK-32)', () => {
    assert.equal(STANDAARD_MODEL, 'claude-haiku-5-5');
  });

  test('elke app-taal heeft een taalnaam voor de AI', () => {
    for (const taal of TALEN) assert.ok(TAALNAAM[taal]);
  });
  test('het schema gebruikt dezelfde stijlen en afdelingen als de app', () => {
    const recept = WEEKPLAN_SCHEMA.properties.dagen.items.properties.recept.properties;
    assert.deepEqual([...recept.stijlen.items.enum], STIJLEN);
    assert.deepEqual([...recept.ingredienten.items.properties.afdeling.enum], AFDELINGEN);
  });
  test('de systeemprompt eist de gevraagde taal en harde regels', () => {
    const p = systeemPrompt();
    assert.match(p, /requested language/);
    assert.match(p, /hard rules/);
  });
});

describe('bouwAiVerzoek', () => {
  test('stuurt taal, profiel (zonder straat of postcode), porties en dagen mee', () => {
    const v = bouwAiVerzoek(verzoek({ opdracht: '4 jours', kooktijden: ['snel'], stijlen: ['italiaans'] }));
    assert.equal(v.taal, 'fr');
    assert.equal(v.porties, 3);
    assert.deepEqual(v.dagen, ['zondag', 'maandag', 'dinsdag', 'woensdag']);
    assert.deepEqual(v.kooktijden, ['snel']);
    assert.match(v.profiel, /4 personen/);
    assert.doesNotMatch(v.profiel, /Dorpstraat|1000/);
  });
  test('gebruikersbericht noemt de taal voluit', () => {
    const bericht = gebruikersBericht(bouwAiVerzoek(verzoek({ taal: 'pt' })));
    assert.match(bericht, /Language: Portuguese/);
    assert.match(bericht, /Cooking time: any/);
  });
  test('te vermijden recepten gaan mee', () => {
    const v = bouwAiVerzoek(verzoek(), ['dinsdag'], ['Lasagne']);
    assert.deepEqual(v.vermijd, ['Lasagne']);
    assert.match(gebruikersBericht(v), /Avoid these recipes: Lasagne/);
  });
});

describe('leesAiAntwoord', () => {
  const dagen: DagCode[] = ['zondag', 'maandag'];

  test('neemt een geldig antwoord over, in de volgorde van de gevraagde dagen', () => {
    const ruw = { dagen: [...antwoordVoor(dagen).dagen].reverse() };
    const resultaat = leesAiAntwoord(ruw, verzoek(), dagen);
    assert.deepEqual(resultaat.map((d) => d.dag), dagen);
    assert.equal(resultaat[0].recept.ingredienten[0].naam, 'poireau');
    assert.match(resultaat[0].recept.id, /^ai-zondag-/);
  });

  test('weigert een antwoord zonder dagen', () => {
    assert.throws(() => leesAiAntwoord({}, verzoek(), dagen), AiFout);
    assert.throws(() => leesAiAntwoord(null, verzoek(), dagen), AiFout);
  });

  test('weigert een onvolledig antwoord', () => {
    assert.throws(() => leesAiAntwoord(antwoordVoor(['zondag']), verzoek(), dagen), AiFout);
  });

  test('dwingt "geen vlees" af, ook als de AI zich vergist', () => {
    assert.throws(() => leesAiAntwoord(antwoordVoor(dagen, 'vlees'), verzoek({ opdracht: 'sans viande' }), dagen), AiFout);
  });

  test('dwingt de gekozen kooktijd af', () => {
    assert.throws(() => leesAiAntwoord(antwoordVoor(dagen, 'vis', 45), verzoek({ kooktijden: ['snel'] }), dagen), AiFout);
  });

  test('negeert dagen die niet gevraagd zijn en dubbele dagen', () => {
    const ruw = { dagen: [...antwoordVoor(['zondag', 'zondag', 'maandag', 'woensdag']).dagen] };
    const resultaat = leesAiAntwoord(ruw, verzoek(), dagen);
    assert.equal(resultaat.length, 2);
  });
});

describe('planWeek', () => {
  test('zonder AI-adres: lokale planner, geen netwerk', async () => {
    const plan = await planWeek(verzoek());
    assert.equal(plan.bron, 'lokaal');
    assert.equal(plan.terugval, undefined);
  });

  test('met AI: stuurt een POST en gebruikt het antwoord', async () => {
    const dagen: DagCode[] = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag'];
    const { f, oproepen } = nepFetch(antwoordVoor(dagen));
    const plan = await planWeek(verzoek(), { url: 'https://voorbeeld.test/plan', sleutel: 'abc', fetch: f });
    assert.equal(plan.bron, 'ai');
    assert.equal(plan.dagen.length, 6);
    assert.equal(plan.taal, 'fr');
    assert.equal(oproepen.length, 1);
    assert.equal(oproepen[0].init.method, 'POST');
    assert.equal((oproepen[0].init.headers as Record<string, string>).Authorization, 'Bearer abc');
    assert.equal(JSON.parse(oproepen[0].init.body as string).taal, 'fr');
  });

  test('server-fout: terugval op de lokale planner, met melding', async () => {
    const { f } = nepFetch({ fout: 'kapot' }, 500);
    const plan = await planWeek(verzoek(), { url: 'https://voorbeeld.test/plan', fetch: f });
    assert.equal(plan.bron, 'lokaal');
    assert.equal(plan.terugval, true);
    assert.equal(plan.dagen.length, 6);
  });

  test('netwerkfout: terugval op de lokale planner', async () => {
    const f = (async () => { throw new TypeError('Network request failed'); }) as unknown as typeof fetch;
    const plan = await planWeek(verzoek(), { url: 'https://voorbeeld.test/plan', fetch: f });
    assert.equal(plan.terugval, true);
  });

  test('time-out: terugval op de lokale planner', async () => {
    const f = ((_: string, init: RequestInit) =>
      new Promise((_, weiger) => init.signal?.addEventListener('abort', () => weiger(new Error('aborted'))))) as unknown as typeof fetch;
    const plan = await planWeek(verzoek(), { url: 'https://voorbeeld.test/plan', fetch: f, timeoutMs: 20 });
    assert.equal(plan.terugval, true);
  });
});

describe('aanmelding bij de AI-planner (WEEK-31)', () => {
  const antwoord = antwoordVoor(['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag']);

  test('het toegangstoken van het toestel gaat mee als Authorization, de publieke sleutel als apikey', async () => {
    const { f, oproepen } = nepFetch(antwoord);
    const plan = await planWeek(verzoek(), { url: 'https://x/plan-week', apikey: 'anon', sleutel: 'oud', token: async () => 'tok-123', fetch: f });
    assert.equal(plan.bron, 'ai');
    const headers = oproepen[0].init.headers as Record<string, string>;
    assert.equal(headers.Authorization, 'Bearer tok-123');
    assert.equal(headers.apikey, 'anon');
  });

  test('zonder token valt het terug op de sleutel; zonder beide geen Authorization', async () => {
    const een = nepFetch(antwoord);
    await planWeek(verzoek(), { url: 'https://x', sleutel: 'oud', token: async () => undefined, fetch: een.f });
    assert.equal((een.oproepen[0].init.headers as Record<string, string>).Authorization, 'Bearer oud');
    const twee = nepFetch(antwoord);
    await planWeek(verzoek(), { url: 'https://x', fetch: twee.f });
    assert.ok(!('Authorization' in (twee.oproepen[0].init.headers as Record<string, string>)));
  });

  test('aanmelden mislukt of limiet bereikt (429): terugval op de lokale planner', async () => {
    const zonderNet = await planWeek(verzoek(), { url: 'https://x', token: async () => { throw new Error('offline'); }, fetch: nepFetch(antwoord).f });
    assert.equal(zonderNet.bron, 'lokaal');
    assert.equal(zonderNet.terugval, true);
    const limiet = await planWeek(verzoek(), { url: 'https://x', token: async () => 't', fetch: nepFetch({ fout: 'Limiet' }, 429).f });
    assert.equal(limiet.terugval, true);
    assert.equal(limiet.aiLimiet, true);
    assert.equal(zonderNet.aiLimiet, undefined);
  });

  test('andere serverfout (500) is geen limiet', async () => {
    const plan = await planWeek(verzoek(), { url: 'https://x', fetch: nepFetch({ fout: 'x' }, 500).f });
    assert.equal(plan.terugval, true);
    assert.equal(plan.aiLimiet, undefined);
  });
});
