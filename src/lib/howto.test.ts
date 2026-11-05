// WEEK-193: de uitleg achter het info-icoon op de gezinspagina.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { HOWTO_ONDERDELEN, howtoTekst } from '@/lib/howto';

const vertaal = (sleutel: string) => `[${sleutel}]`;

describe('howtoTekst (WEEK-193)', () => {
  test('begint met de kop en heeft daarna een alinea per onderdeel', () => {
    const alinea = howtoTekst(vertaal).split('\n\n');
    assert.equal(alinea.length, HOWTO_ONDERDELEN.length + 1);
    assert.equal(alinea[0], '[howto.kop]');
  });

  test('de onderdelen blijven in de vaste volgorde en krijgen een bolletje', () => {
    const alinea = howtoTekst(vertaal).split('\n\n');
    assert.deepEqual(
      alinea.slice(1),
      ['menu', 'lijst', 'frigo', 'scan', 'gezin'].map((k) => `[howto.${k}]`),
    );
  });

  test('de vertaling wordt per sleutel opgevraagd, zonder extra sleutels', () => {
    const gevraagd: string[] = [];
    howtoTekst((s) => {
      gevraagd.push(s);
      return s;
    });
    assert.deepEqual(gevraagd, ['howto.kop', ...HOWTO_ONDERDELEN.map((k) => `howto.${k}`)]);
  });
});
