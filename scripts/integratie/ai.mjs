// Integratietest van de AI-planner (WEEK-31) tegen de uitgerolde server-functie plan-week.
// - zonder aanmelding: geweigerd
// - aangemeld (anoniem toestel, zoals de app): een geldig weekplan, of 500 als de API-sleutel nog niet ingesteld is
// Uitvoeren: GitHub Actions › "Integratietest" › Run workflow.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL ?? 'https://dxhhjqzxdpmlzgjkhaoj.supabase.co';
const SLEUTEL =
  process.env.SUPABASE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4aGhqcXp4ZHBtbHpnamtoYW9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2MjQxMzAsImV4cCI6MjEwNzIwMDEzMH0.6oDAo82vTrqZGAAK5vzKgFnCUr5h6X_EJbHJaCEvOQA';
const FUNCTIE = `${URL}/functions/v1/plan-week`;

const fout = (e) => {
  console.log(`::error::AI-planner: ${e?.message ?? e}`);
  process.exit(1);
};
process.on('uncaughtException', fout);
process.on('unhandledRejection', fout);

const verzoek = {
  taal: 'nl',
  profiel: 'Gezin: 4 personen – 2 volwassenen, 2 kinderen (4 jaar, 7 jaar).',
  porties: 3.25,
  opdracht: 'snel en gezond, geen vis',
  kooktijden: ['snel'],
  stijlen: [],
  dagen: ['zondag', 'maandag'],
  frigo: ['spinazie (200 g, 5 days)'],
};
const roep = (headers, body = verzoek) =>
  fetch(FUNCTIE, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SLEUTEL, ...headers }, body: JSON.stringify(body) });

// Enkel de publieke sleutel (geen aangemeld toestel): geweigerd.
const zonder = await roep({ Authorization: `Bearer ${SLEUTEL}` });
assert.equal(zonder.status, 401, `zonder aanmelding verwacht 401, kreeg ${zonder.status}`);
console.log('✓ zonder aanmelding geweigerd (401)');

const sb = createClient(URL, SLEUTEL, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await sb.auth.signInAnonymously();
assert.ifError(error);
const auth = { Authorization: `Bearer ${data.session.access_token}` };

const ongeldig = await roep(auth, { taal: 'xx' });
assert.equal(ongeldig.status, 400);
console.log('✓ ongeldig verzoek geweigerd (400)');

const antwoord = await roep(auth);
const inhoud = await antwoord.json();
if (antwoord.status === 500 && /ANTHROPIC_API_KEY/.test(inhoud.fout ?? '')) {
  console.log('::warning::De functie werkt, maar ANTHROPIC_API_KEY is nog niet ingesteld in Supabase.');
  process.exit(0);
}
assert.equal(antwoord.status, 200, `verwacht 200, kreeg ${antwoord.status}: ${JSON.stringify(inhoud)}`);
assert.ok(Array.isArray(inhoud.dagen) && inhoud.dagen.length === 2, 'twee dagen');
for (const d of inhoud.dagen) {
  assert.ok(['zondag', 'maandag'].includes(d.dag));
  assert.ok(d.recept.naam && d.recept.ingredienten.length > 0);
  assert.notEqual(d.recept.soort, 'vis', 'geen vis');
}
console.log(`::notice::AI-PLANNER WERKT: ${inhoud.dagen.map((d) => `${d.dag}: ${d.recept.naam} (${d.recept.minuten} min)`).join(' | ')}`);
process.exit(0);
