import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AANBIEDERS, AANMELDEN_MET_MAIL, aanmeldWijze, isGeldigEmail, leesTokensUitUrl, terugkeerAdres, terugkeerMetFout } from '@/lib/aanmelden';

describe('aanmelden (WEEK-166, WEEK-185, WEEK-225)', () => {
  test('het aanmeldscherm biedt enkel Google aan (Apple: WEEK-227, Facebook bewust niet)', () => {
    assert.deepEqual(AANBIEDERS, ['google']);
  });

  test('aanmelden met e-mail staat uit tot WEEK-226', () => {
    assert.equal(AANMELDEN_MET_MAIL, false);
  });

  test('een anoniem toestel koppelt zijn gegevens aan het account', () => {
    assert.equal(aanmeldWijze(true), 'koppelen');
  });

  test('een toestel zonder anonieme sessie logt in op een bestaand account', () => {
    assert.equal(aanmeldWijze(false), 'inloggen');
  });

  test('een geldig e-mailadres wordt herkend', () => {
    assert.equal(isGeldigEmail('naam@voorbeeld.be'), true);
    assert.equal(isGeldigEmail('  naam@voorbeeld.be  '), true);
  });

  test('een ongeldig e-mailadres wordt geweigerd', () => {
    assert.equal(isGeldigEmail(''), false);
    assert.equal(isGeldigEmail('naam'), false);
    assert.equal(isGeldigEmail('naam@voorbeeld'), false);
    assert.equal(isGeldigEmail('na am@voorbeeld.be'), false);
  });

  test('op het web keert de aanbieder terug naar de tussenpagina aangemeld onder het basispad (WEEK-230, WEEK-231)', () => {
    assert.equal(terugkeerAdres('web', 'https://proqltc-prog.github.io', '/expo-app'), 'https://proqltc-prog.github.io/expo-app/aangemeld');
    assert.equal(terugkeerAdres('web', 'https://proqltc-prog.github.io', '/expo-app/'), 'https://proqltc-prog.github.io/expo-app/aangemeld');
    assert.equal(terugkeerAdres('web', 'https://proqltc-prog.github.io', 'expo-app'), 'https://proqltc-prog.github.io/expo-app/aangemeld');
  });

  test('regressie: zonder basispad (lokaal testen) onder de wortel van de site, nooit de pagina /welkom', () => {
    assert.equal(terugkeerAdres('web', 'http://localhost:8081'), 'http://localhost:8081/aangemeld');
    assert.equal(terugkeerAdres('web', 'http://localhost:8081', ''), 'http://localhost:8081/aangemeld');
    assert.ok(!terugkeerAdres('web', 'https://proqltc-prog.github.io', '/expo-app').includes('welkom'));
  });

  test('in de app keert de aanbieder terug naar de tussenpagina via het app-schema famenu (valt onder famenu://** in Supabase)', () => {
    assert.equal(terugkeerAdres('native'), 'famenu://aangemeld');
  });

  test('een foutmelding in het terugkeeradres wordt herkend', () => {
    assert.equal(terugkeerMetFout('https://x/expo-app/aangemeld#error=access_denied&error_description=x'), true);
    assert.equal(terugkeerMetFout('https://x/expo-app/aangemeld?error_code=identity_already_exists'), true);
    assert.equal(terugkeerMetFout('https://x/expo-app/aangemeld#access_token=a&refresh_token=r'), false);
    assert.equal(terugkeerMetFout('famenu://aangemeld'), false);
  });

  test('access- en refreshtoken uit het fragment', () => {
    assert.deepEqual(leesTokensUitUrl('famenu://#access_token=a&refresh_token=r'), { accessToken: 'a', refreshToken: 'r' });
  });

  test('zonder fragment, of zonder beide tokens, geen tokens', () => {
    assert.equal(leesTokensUitUrl('famenu://'), null);
    assert.equal(leesTokensUitUrl('famenu://#access_token=a'), null);
  });
});
