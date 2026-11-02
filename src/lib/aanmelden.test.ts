import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { aanbiedingen, leesTokensUitUrl, terugkeerAdres } from '@/lib/aanmelden';

describe('aanmelden met Google (WEEK-166)', () => {
  test('een anonieme account krijgt Google aangeboden', () => {
    assert.deepEqual(aanbiedingen(true), ['google']);
  });

  test('een al gekoppelde account krijgt geen aanmeldknop meer', () => {
    assert.deepEqual(aanbiedingen(false), []);
  });

  test('Apple wordt nu niet aangeboden (wacht op een Apple Developer-account)', () => {
    assert.equal(aanbiedingen(true).includes('apple' as never), false);
  });

  test('op het web keert de aanbieder terug naar de huidige pagina', () => {
    assert.equal(terugkeerAdres('web', 'https://proqltc-prog.github.io', '/expo-app/'), 'https://proqltc-prog.github.io/expo-app/');
  });

  test('in de app keert de aanbieder terug naar het app-schema famenu', () => {
    assert.equal(terugkeerAdres('native'), 'famenu://');
  });
});

describe('tokens uit het terugkeeradres', () => {
  test('access- en refreshtoken uit het fragment', () => {
    const url = 'https://x.example/#access_token=abc123&expires_in=3600&refresh_token=ref456&token_type=bearer';
    assert.deepEqual(leesTokensUitUrl(url), { accessToken: 'abc123', refreshToken: 'ref456' });
  });

  test('zonder fragment geen tokens', () => {
    assert.equal(leesTokensUitUrl('famenu://'), null);
  });

  test('een foutmelding van de aanbieder geeft geen tokens', () => {
    assert.equal(leesTokensUitUrl('famenu://#error=access_denied&error_description=geannuleerd'), null);
  });

  test('alleen een accesstoken is onvoldoende', () => {
    assert.equal(leesTokensUitUrl('famenu://#access_token=abc'), null);
  });
});
