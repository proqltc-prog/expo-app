import { test } from 'node:test';
import assert from 'node:assert/strict';
import { googleVragen, teWissenBijAfmelden } from '@/lib/afmelden';
import { SLEUTEL } from '../opslag/sleutels';

test('WEEK-314: afmelden wist het gezin, het profiel, de naam en de gegevens van het gezin', () => {
  const wissen = teWissenBijAfmelden(SLEUTEL);
  for (const s of [SLEUTEL.gezin, SLEUTEL.sync, SLEUTEL.profiel, SLEUTEL.voornaam, SLEUTEL.plan, SLEUTEL.lijst, SLEUTEL.frigo, SLEUTEL.favorieten, SLEUTEL.eigenRecepten, SLEUTEL.keuzes, SLEUTEL.scanHistoriek, SLEUTEL.losVoorstellen]) {
    assert.ok(wissen.includes(s), `${s} wordt gewist`);
  }
});

test('WEEK-314: na afmelden komt het startscherm terug (welkom wordt gewist)', () => {
  assert.ok(teWissenBijAfmelden(SLEUTEL).includes(SLEUTEL.welkom));
});

test('WEEK-314: taal, scanteller, kopieën van de databank en de afmeldvlag blijven', () => {
  const wissen = teWissenBijAfmelden(SLEUTEL);
  for (const s of [SLEUTEL.taal, SLEUTEL.taalVersie, SLEUTEL.scans, SLEUTEL.ingredientenDb, SLEUTEL.receptenDb, SLEUTEL.winkelCache, SLEUTEL.afgemeld]) {
    assert.ok(!wissen.includes(s), `${s} blijft`);
  }
});

test('WEEK-314: een nieuwe, onbekende sleutel wordt standaard gewist', () => {
  assert.deepEqual(teWissenBijAfmelden({ nieuw: 'nieuw:v1', taal: 'taal:v1' }), ['nieuw:v1']);
});

test('WEEK-314: Google vraagt het account enkel na afmelden', () => {
  assert.deepEqual(googleVragen(true), { queryParams: { prompt: 'select_account' } });
  assert.deepEqual(googleVragen(false), {});
});
