import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Winkel } from '@/lib/winkels';
import { adresRegel, googleMapsUrl, googleZoekUrl, openingsurenRegels, SOORT_EMOJI } from '@/lib/winkelweergave';
import { leesWinkels } from '@/lib/winkels';

const w = (wijziging: Partial<Winkel> = {}): Winkel => ({
  naam: 'Delhaize',
  soort: 'supermarkt',
  postcode: '1760',
  gemeente: 'Roosdaal',
  nabij: 'postcode',
  ...wijziging,
});

describe('adresRegel (WEEK-70)', () => {
  test('straat, huisnummer, postcode en gemeente', () => {
    assert.equal(adresRegel(w({ straat: 'Dorpsstraat', huisnummer: '12' })), 'Dorpsstraat 12, 1760 Roosdaal');
  });
  test('zonder straat alleen postcode en gemeente', () => {
    assert.equal(adresRegel(w()), '1760 Roosdaal');
  });
  test('lege delen worden weggelaten', () => {
    assert.equal(adresRegel(w({ postcode: '', gemeente: '', straat: 'Dorpsstraat' })), 'Dorpsstraat');
    assert.equal(adresRegel(w({ postcode: '', gemeente: '' })), '');
  });
});

describe('googleMapsUrl (WEEK-70)', () => {
  test('zoekt op naam, adres en België in Google Maps, zonder sleutel', () => {
    const url = googleMapsUrl(w({ straat: 'Dorpsstraat', huisnummer: '12' }));
    assert.match(url, /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    assert.equal(decodeURIComponent(url.split('query=')[1]), 'Delhaize, Dorpsstraat 12, 1760 Roosdaal, België');
  });
  test('speciale tekens in de naam worden veilig gecodeerd', () => {
    const url = googleMapsUrl(w({ naam: 'Super & Co' }));
    assert.doesNotMatch(url, /query=.*&Co/);
    assert.equal(decodeURIComponent(url.split('query=')[1]), 'Super & Co, 1760 Roosdaal, België');
  });
  test('zonder adres blijft de naam en het land', () => {
    assert.equal(decodeURIComponent(googleMapsUrl(w({ postcode: '', gemeente: '' })).split('query=')[1]), 'Delhaize, België');
  });
});

describe('openingsurenRegels (WEEK-70)', () => {
  test('splitst de OpenStreetMap-tekst in regels', () => {
    assert.deepEqual(openingsurenRegels('Mo-Sa 08:00-20:00; Su 09:00-12:00'), ['Mo-Sa 08:00-20:00', 'Su 09:00-12:00']);
  });
  test('leeg of onbekend geeft geen regels', () => {
    assert.deepEqual(openingsurenRegels(undefined), []);
    assert.deepEqual(openingsurenRegels('  '), []);
  });
  test('lege stukken tussen de puntkomma\'s worden overgeslagen', () => {
    assert.deepEqual(openingsurenRegels('Mo-Fr 09:00-17:00;;'), ['Mo-Fr 09:00-17:00']);
  });
});

describe('SOORT_EMOJI (WEEK-70)', () => {
  test('elke winkelsoort heeft een emoji', () => {
    assert.deepEqual(Object.keys(SOORT_EMOJI).sort(), ['bakker', 'groenteboer', 'slager', 'supermarkt']);
  });
});

describe('leesWinkels: adres en uren uit OpenStreetMap (WEEK-70)', () => {
  test('leest straat, huisnummer en openingsuren, en laat ze leeg als ze ontbreken', () => {
    const antwoord = {
      elements: [
        { type: 'node', lat: 50.9, lon: 4.1, tags: { name: 'Delhaize', shop: 'supermarket', 'addr:postcode': '1760', 'addr:city': 'Roosdaal', 'addr:street': 'Dorpsstraat', 'addr:housenumber': '12', opening_hours: 'Mo-Sa 08:00-20:00' } },
        { type: 'node', lat: 50.8, lon: 4.0, tags: { name: 'Slager Jan', shop: 'butcher', 'addr:postcode': '1760' } },
      ],
    };
    const winkels = leesWinkels(antwoord, '1760');
    const eerste = winkels.find((x) => x.naam === 'Delhaize')!;
    const tweede = winkels.find((x) => x.naam === 'Slager Jan')!;
    assert.equal(eerste.straat, 'Dorpsstraat');
    assert.equal(eerste.huisnummer, '12');
    assert.equal(eerste.openingsuren, 'Mo-Sa 08:00-20:00');
    assert.equal(tweede.straat, undefined);
    assert.equal(tweede.openingsuren, undefined);
  });
});

describe('googleZoekUrl (WEEK-175)', () => {
  test('zoekt het winkeltype bij de postcode en gemeente, in België', () => {
    const url = googleZoekUrl('slager', '1760', 'Roosdaal');
    assert.equal(url, 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('slager 1760 Roosdaal België'));
  });
  test('zonder gemeente blijft de postcode over', () => {
    assert.match(googleZoekUrl('bakker', '2000', ''), /bakker%202000%20Belgi/);
  });
});

describe('googleZoekUrl supermarkt (WEEK-234)', () => {
  test('de zoekterm is enkel supermarkt: met extra woorden toonde Google ook kleding- en elektrozaken', () => {
    const url = googleZoekUrl('supermarkt', '1760', 'Roosdaal');
    assert.match(url, /query=supermarkt%201760%20Roosdaal%20Belgi/);
    assert.doesNotMatch(url, /levensmiddelen/);
  });
  test('regressie: de andere winkeltypes houden hun eigen woord', () => {
    assert.match(googleZoekUrl('slager', '1760', 'Roosdaal'), /query=slager%201760%20Roosdaal/);
    assert.match(googleZoekUrl('bakker', '1760', 'Roosdaal'), /query=bakker%201760%20Roosdaal/);
  });
});
