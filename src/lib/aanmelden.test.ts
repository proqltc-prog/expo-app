import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AANBIEDERS, AANMELDEN_MET_MAIL, aanmeldWijze, isGeldigEmail, leesTokensUitUrl, terugkeerAdres } from '@/lib/aanmelden';

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

  test('op het web keert de aanbieder terug naar de start van de app, met of zonder schuine strepen (WEEK-230)', () => {
    assert.equal(terugkeerAdres('web', 'https://proqltc-prog.github.io', '/expo-app'), 'https://proqltc-prog.github.io/expo-app/');
    assert.equal(terugkeerAdres('web', 'https://proqltc-prog.github.io', '/expo-app/'), 'https://proqltc-prog.github.io/expo-app/');
    assert.equal(terugkeerAdres('web', 'https://proqltc-prog.github.io', 'expo-app'), 'https://proqltc-prog.github.io/expo-app/');
  });

  test('regressie: zonder basispad (lokaal testen) de wortel van de site, nooit de pagina /welkom', () => {
    assert.equal(terugkeerAdres('web', 'http://localhost:8081'), 'http://localhost:8081/');
    assert.equal(terugkeerAdres('web', 'http://localhost:8081', ''), 'http://localhost:8081/');
    assert.ok(!terugkeerAdres('web', 'https://proqltc-prog.github.io', '/expo-app').includes('welkom'));
  });

  test('in de app keert de aanbieder terug naar het app-schema famenu', () => {
    assert.equal(terugkeerAdres('native'), 'famenu://');
  });

  test('access- en refreshtoken uit het fragment', () => {
    assert.deepEqual(leesTokensUitUrl('famenu://#access_token=a&refresh_token=r'), { accessToken: 'a', refreshToken: 'r' });
  });

  test('zonder fragment, of zonder beide tokens, geen tokens', () => {
    assert.equal(leesTokensUitUrl('famenu://'), null);
    assert.equal(leesTokensUitUrl('famenu://#access_token=a'), null);
  });
});
