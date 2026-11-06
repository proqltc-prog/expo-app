import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { padMet, terugPad } from '@/lib/terug';

describe('terugkeren naar het vorige scherm (WEEK-218)', () => {
  test('padMet bouwt een pad met enkel de ingevulde parameters', () => {
    assert.equal(padMet('/kies', { moment: 'avond', index: 2, gemaaktOp: undefined, naam: '' }), '/kies?moment=avond&index=2');
    assert.equal(padMet('/kies', {}), '/kies');
    assert.equal(padMet('/kies', { naam: 'Spaghetti & co' }), '/kies?naam=Spaghetti%20%26%20co');
  });

  test('terugPad gebruikt het meegegeven pad, anders de standaard', () => {
    assert.equal(terugPad('/kies?moment=avond', '/mijn-recepten'), '/kies?moment=avond');
    assert.equal(terugPad(undefined, '/mijn-recepten'), '/mijn-recepten');
    assert.equal(terugPad('', '/mijn-recepten'), '/mijn-recepten');
    assert.equal(terugPad('https://kwaad.be', '/mijn-recepten'), '/mijn-recepten');
    assert.equal(terugPad('//kwaad.be', '/mijn-recepten'), '/mijn-recepten');
  });
});
