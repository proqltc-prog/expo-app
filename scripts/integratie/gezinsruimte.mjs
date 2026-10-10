// Integratietest van de gezinsruimte (WEEK-8) tegen het echte Supabase-project.
// Simuleert twee toestellen van hetzelfde gezin en één buitenstaander, met dezelfde aanroepen als
// src/opslag/sync.ts: anonieme aanmelding, maak_gezin, word_lid, upsert per item, ophalen, live updates.
// Ruimt op het einde alles op (verlaat_gezin). Uitvoeren: GitHub Actions › "Integratietest" › Run workflow.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL ?? 'https://dxhhjqzxdpmlzgjkhaoj.supabase.co';
const SLEUTEL =
  process.env.SUPABASE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4aGhqcXp4ZHBtbHpnamtoYW9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2MjQxMzAsImV4cCI6MjEwNzIwMDEzMH0.6oDAo82vTrqZGAAK5vzKgFnCUr5h6X_EJbHJaCEvOQA';

const toestel = () => createClient(URL, SLEUTEL, { auth: { persistSession: false, autoRefreshToken: false } });
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
async function totDat(voorwaarde, beschrijving, ms = 15000) {
  const einde = Date.now() + ms;
  while (Date.now() < einde) {
    if (voorwaarde()) return;
    await wacht(200);
  }
  throw new Error(`Time-out: ${beschrijving}`);
}
// Elke stap en fout ook als GitHub-annotatie, zodat het resultaat zichtbaar is zonder het volledige logboek.
const stappen = [];
const stap = (t) => {
  stappen.push(t);
  console.log(`✓ ${t}`);
};
process.on('uncaughtException', (e) => {
  console.log(`::error::Na ${stappen.length} stappen (laatste: ${stappen.at(-1) ?? '-'}): ${e?.message ?? e}`);
  process.exit(1);
});
process.on('unhandledRejection', (e) => {
  console.log(`::error::Na ${stappen.length} stappen (laatste: ${stappen.at(-1) ?? '-'}): ${e?.message ?? e}`);
  process.exit(1);
});

const a = toestel();
const b = toestel();
const c = toestel();
let gezin;
const kanalen = [];

try {
  for (const [naam, sb] of [['A', a], ['B', b], ['C', c]]) {
    const { data, error } = await sb.auth.signInAnonymously();
    assert.ifError(error);
    assert.ok(data.user?.id, `${naam} aangemeld`);
    // zoals de app (WEEK-25): Realtime het toegangstoken geven vóór het inschrijven
    await sb.realtime.setAuth(data.session.access_token);
  }
  stap('drie toestellen anoniem aangemeld');

  {
    const { data, error } = await a.rpc('maak_gezin', { p_naam: 'Integratietest', p_lid_naam: 'Toestel A' });
    assert.ifError(error);
    gezin = Array.isArray(data) ? data[0] : data;
    assert.match(gezin.code, /^[A-HJ-NP-Z2-9]{6}$/);
  }
  stap(`A maakte een gezin (code ${gezin.code})`);

  {
    const { error } = await a.rpc('maak_gezin', { p_naam: 'Tweede', p_lid_naam: '' });
    assert.match(error?.message ?? '', /al_lid/);
  }
  stap('A kan geen tweede gezin maken');

  {
    const { data, error } = await c.rpc('word_lid', { p_code: 'ZZZZZZ', p_lid_naam: 'C' });
    assert.ifError(error);
    const r = Array.isArray(data) ? data[0] : data;
    assert.ok(!r || !r.id, 'onbekende code geeft geen gezin');
  }
  stap('een onbekende code geeft geen gezin');

  {
    const { data, error } = await b.rpc('word_lid', { p_code: ` ${gezin.code.toLowerCase()} `, p_lid_naam: 'Toestel B' });
    assert.ifError(error);
    const r = Array.isArray(data) ? data[0] : data;
    assert.equal(r.id, gezin.id);
  }
  stap('B werd lid met de code (kleine letters en spaties mogen)');

  // B luistert live mee, zoals de app.
  const ontvangen = [];
  let ingeschreven = false;
  const kanaal = b
    .channel(`test-${gezin.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'gezin_items', filter: `gezin_id=eq.${gezin.id}` }, (p) => ontvangen.push(p.new))
    .subscribe((s) => {
      if (s === 'SUBSCRIBED') ingeschreven = true;
    });
  kanalen.push([b, kanaal]);
  await totDat(() => ingeschreven, 'B ingeschreven op live updates');
  await wacht(1000);
  stap('B luistert live mee');

  const T1 = new Date(Date.now() - 60_000).toISOString();
  const T2 = new Date().toISOString();
  const pasta = { id: 'recept-zondag-pasta-g', naam: 'pasta', categorie: 'avondeten', afgevinkt: false, hoeveelheid: 300, eenheid: 'g' };

  {
    const { error } = await a
      .from('gezin_items')
      .upsert([{ gezin_id: gezin.id, soort: 'lijst', id: pasta.id, data: pasta, verwijderd: false, bijgewerkt_op: T2 }], { onConflict: 'gezin_id,soort,id' });
    assert.ifError(error);
  }
  try {
    await totDat(() => ontvangen.some((r) => r.id === pasta.id), 'B ontvangt het item van A live');
    stap('A zette pasta op de lijst; B kreeg het live binnen');
  } catch {
    // Koude start van Realtime (project een tijd niet gebruikt): de app haalt dan zelf bij (WEEK-26).
    console.log('::warning::Koude start: eerste live-update gemist; controle via bijhalen en een tweede live-update');
    const { data } = await b.from('gezin_items').select('id').eq('gezin_id', gezin.id).eq('id', pasta.id);
    assert.equal(data?.length, 1, 'B haalt het item van A op');
    stap('B haalde het gemiste item op (zoals de app bij een koude start)');
    const melk = { id: 'extra-melk', naam: 'melk', categorie: 'extra', afgevinkt: false };
    const { error } = await a
      .from('gezin_items')
      .upsert([{ gezin_id: gezin.id, soort: 'lijst', id: melk.id, data: melk, verwijderd: false, bijgewerkt_op: new Date().toISOString() }], { onConflict: 'gezin_id,soort,id' });
    assert.ifError(error);
    await totDat(() => ontvangen.some((r) => r.id === melk.id), 'B ontvangt een tweede item live (na de koude start)', 20000);
    stap('na de koude start komen live-updates wel binnen');
  }

  {
    // B stuurt een oudere versie: die mag niets overschrijven (laatste wijziging wint).
    const { error } = await b
      .from('gezin_items')
      .upsert([{ gezin_id: gezin.id, soort: 'lijst', id: pasta.id, data: { ...pasta, afgevinkt: true }, verwijderd: false, bijgewerkt_op: T1 }], { onConflict: 'gezin_id,soort,id' });
    assert.ifError(error);
    const { data } = await b.from('gezin_items').select('data').eq('gezin_id', gezin.id).eq('id', pasta.id).single();
    assert.equal(data.data.afgevinkt, false);
  }
  stap('een oudere versie overschrijft niets');

  {
    const T3 = new Date(Date.now() + 1000).toISOString();
    const { error } = await b
      .from('gezin_items')
      .upsert([{ gezin_id: gezin.id, soort: 'lijst', id: pasta.id, data: { ...pasta, afgevinkt: true }, verwijderd: false, bijgewerkt_op: T3 }], { onConflict: 'gezin_id,soort,id' });
    assert.ifError(error);
    const { data } = await a.from('gezin_items').select('data,bijgewerkt_op').eq('gezin_id', gezin.id).eq('id', pasta.id).single();
    assert.equal(data.data.afgevinkt, true);
    // het tijdstip komt in Postgres-formaat terug; de app moet het kunnen lezen
    assert.ok(!Number.isNaN(Date.parse(String(data.bijgewerkt_op).replace(/(\.\d{3})\d+/, '$1'))));
  }
  stap('B vinkte pasta af; A ziet het');

  {
    const { error } = await a
      .from('gezin_documenten')
      .upsert([{ gezin_id: gezin.id, sleutel: 'plan', data: { dagen: [], opdracht: 'test' }, bijgewerkt_op: T2 }], { onConflict: 'gezin_id,sleutel' });
    assert.ifError(error);
    const { data, error: e2 } = await b.from('gezin_documenten').select('sleutel,data,bijgewerkt_op').eq('gezin_id', gezin.id);
    assert.ifError(e2);
    assert.equal(data.length, 1);
    assert.equal(data[0].data.opdracht, 'test');
  }
  stap('het weekplan van A is zichtbaar voor B');

  {
    const { data, error } = await b.from('gezinsleden').select('gebruiker_id,naam').eq('gezin_id', gezin.id).order('toegetreden_op');
    assert.ifError(error);
    assert.deepEqual(data.map((l) => l.naam), ['Toestel A', 'Toestel B']);
    const { data: g } = await b.from('gezinnen').select('id,naam,code').eq('id', gezin.id).maybeSingle();
    assert.equal(g?.code, gezin.code);
  }
  stap('B ziet de leden en het gezin');

  {
    const { data } = await c.from('gezin_items').select('id').eq('gezin_id', gezin.id);
    assert.deepEqual(data, []);
    const { data: docs } = await c.from('gezin_documenten').select('sleutel').eq('gezin_id', gezin.id);
    assert.deepEqual(docs, []);
    const { error } = await c
      .from('gezin_items')
      .upsert([{ gezin_id: gezin.id, soort: 'lijst', id: 'hack', data: {}, verwijderd: false, bijgewerkt_op: T2 }], { onConflict: 'gezin_id,soort,id' });
    assert.ok(error, 'C mag niets schrijven');
    const { data: leden } = await c.from('gezinsleden').select('naam').eq('gezin_id', gezin.id);
    assert.deepEqual(leden, []);
  }
  stap('een buitenstaander ziet niets en kan niets schrijven');
} finally {
  for (const [sb, k] of kanalen) await sb.removeChannel(k);
  if (gezin) {
    await b.rpc('verlaat_gezin');
    await a.rpc('verlaat_gezin');
    const { data } = await a.from('gezinnen').select('id').eq('id', gezin.id);
    assert.deepEqual(data ?? [], []);
    stap('opgeruimd: beide leden vertrokken, gezin verwijderd');
  }
}
console.log(`::notice::ALLE INTEGRATIETESTS GESLAAGD (${stappen.length} stappen)`);
process.exit(0);
