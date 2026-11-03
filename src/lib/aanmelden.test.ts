import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AANBIEDERS, aanmeldWijze, isGeldigEmail, leesTokensUitUrl, terugkeerAdres } from '@/lib/aanmelden';

describe('aanmelden (WEEK-166, WEEK-185)', () => {
  test('het aanmeldscherm biedt Google, Apple en Facebook aan', () => {
    assert.deepEqual(AANBIEDERS, ['google', 'apple', 'facebook']);
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

  test('op het web keert de aanbieder terug naar de huidige pagina', () => {
    assert.equal(terugkeerAdres('web', 'https://proqltc-prog.github.io', '/expo-app/'), 'https://proqltc-prog.github.io/expo-app/');
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
