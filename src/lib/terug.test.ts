import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { padMet, terugPad, terugVoor } from '@/lib/terug';

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

describe('WEEK-259: terugpijl van de verborgen schermen', () => {
  test('met een meegegeven pad: daar naartoe', () => {
    assert.equal(terugVoor('mijn-recepten', '/kies?index=2'), '/kies?index=2');
    assert.equal(terugVoor('eigen-recept', '/mijn-recepten?terug=%2Fkies'), '/mijn-recepten?terug=%2Fkies');
  });
  test('zonder (of met een vreemd) pad: de vaste ouder', () => {
    assert.equal(terugVoor('kies', undefined), '/');
    assert.equal(terugVoor('mijn-recepten', undefined), '/');
    assert.equal(terugVoor('eigen-recept', undefined), '/mijn-recepten');
    assert.equal(terugVoor('bereiding', 'https://elders.be'), '/');
    assert.equal(terugVoor('profiel', '//elders.be'), '/');
    assert.equal(terugVoor('eigen-recept', 42), '/mijn-recepten');
  });
});
