// Tests voor de Supabase-functie `winkels` (WEEK-171) en de parser aan de app-kant.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  afstandMeter,
  bouwPostcodeQuery,
  bouwStraalQuery,
  cacheSleutel,
  dichtstbij,
  leesAanvraag,
  leesWinkels,
  MAX_WINKELS,
  STRAAL_METERS,
  Winkel,
} from '../../supabase/functions/winkels/logica';
import { leesServerWinkels, MAX_WINKELS_LIJST } from '@/lib/winkels';

const BRUSSEL = { lat: 50.8503, lon: 4.3517 };
const ANTWERPEN = { lat: 51.2194, lon: 4.4025 };

const winkel = (naam: string, lat?: number, lon?: number, extra: Partial<Winkel> = {}): Winkel => ({
  naam,
  soort: 'supermarkt',
  postcode: '1000',
  gemeente: 'Brussel',
  nabij: 'gemeente',
  lat,
  lon,
  ...extra,
});

describe('leesAanvraag (WEEK-171)', () => {
  it('accepteert een punt in België', () => {
    assert.deepEqual(leesAanvraag({ lat: 50.85, lon: 4.35 }), { punt: { lat: 50.85, lon: 4.35 } });
  });
  it('weigert een punt buiten België', () => {
    assert.equal(leesAanvraag({ lat: 48.85, lon: 2.35 }), undefined);
  });
  it('accepteert een Belgische postcode, ook met spaties', () => {
    assert.deepEqual(leesAanvraag({ postcode: ' 2000 ', gemeente: 'Antwerpen' }), { postcode: '2000', gemeente: 'Antwerpen' });
  });
  it('weigert een ongeldige postcode of lege invoer', () => {
    assert.equal(leesAanvraag({ postcode: '20000', gemeente: '' }), undefined);
    assert.equal(leesAanvraag({ postcode: 'abcd' }), undefined);
    assert.equal(leesAanvraag(null), undefined);
    assert.equal(leesAanvraag('tekst'), undefined);
  });
});

describe('zoekopdracht op de server (WEEK-171)', () => {
  it('de straal is vast op 10 km; de app kan die niet vergroten', () => {
    assert.equal(STRAAL_METERS, 10000);
    assert.match(bouwStraalQuery(BRUSSEL), /around:10000,/);
  });
  it('de postcode-query blijft binnen België en op de postcode', () => {
    const q = bouwPostcodeQuery('2000', 'Antwerpen');
    assert.match(q, /ISO3166-1"="BE"/);
    assert.match(q, /addr:postcode"="2000"/);
    assert.match(q, /addr:city"="Antwerpen"/);
  });
  it('een gemeentenaam met rare tekens wordt schoongemaakt, zodat de query veilig blijft', () => {
    const q = bouwPostcodeQuery('2000', 'Ant"]; out; (');
    assert.doesNotMatch(q, /"\]; out/);
  });
  it('dezelfde winkel in dezelfde postcode komt maar één keer voor', () => {
    const ruw = {
      elements: [
        { tags: { name: 'Delhaize', shop: 'supermarket', 'addr:postcode': '2000' }, lat: 51.2, lon: 4.4 },
        { tags: { name: 'Delhaize', shop: 'supermarket', 'addr:postcode': '2000' }, lat: 51.2, lon: 4.4 },
      ],
    };
    assert.equal(leesWinkels(ruw, '2000').length, 1);
  });
});

describe('de dichtstbijzijnde winkels (WEEK-171)', () => {
  it('afstand Brussel-Antwerpen ligt rond 40 km', () => {
    const km = afstandMeter(BRUSSEL, ANTWERPEN) / 1000;
    assert.ok(km > 38 && km < 42, `afstand ${km}`);
  });
  it('regressie: van veel winkels komen er hoogstens 10, de dichtstbijzijnde eerst', () => {
    const winkels = Array.from({ length: 25 }, (_, i) => winkel(`W${i}`, BRUSSEL.lat + i * 0.005, BRUSSEL.lon));
    const uit = dichtstbij(winkels, BRUSSEL);
    assert.equal(uit.length, MAX_WINKELS);
    assert.equal(MAX_WINKELS, 10);
    assert.equal(uit[0].naam, 'W0');
    for (let i = 1; i < uit.length; i++) assert.ok((uit[i - 1].afstandMeter ?? 0) <= (uit[i].afstandMeter ?? 0));
  });
  it('winkels zonder coördinaten vallen weg als er een punt is', () => {
    const uit = dichtstbij([winkel('zonder'), winkel('met', BRUSSEL.lat, BRUSSEL.lon)], BRUSSEL);
    assert.deepEqual(uit.map((w) => w.naam), ['met']);
  });
  it('zonder punt: lokaal eerst (zelfde postcode), daarna op naam', () => {
    const uit = dichtstbij([
      winkel('Zeta', undefined, undefined, { nabij: 'gemeente' }),
      winkel('Alfa', undefined, undefined, { nabij: 'gemeente' }),
      winkel('Lokaal', undefined, undefined, { nabij: 'postcode' }),
    ]);
    assert.deepEqual(uit.map((w) => w.naam), ['Lokaal', 'Alfa', 'Zeta']);
  });
  it('de cache-sleutel is gelijk voor twee punten binnen ±100 meter', () => {
    const a = cacheSleutel({ punt: { lat: 50.85031, lon: 4.35171 } });
    const b = cacheSleutel({ punt: { lat: 50.85039, lon: 4.35179 } });
    assert.equal(a, b);
    assert.notEqual(a, cacheSleutel({ punt: ANTWERPEN }));
  });
});

describe('antwoord van de functie aan de app-kant (WEEK-171)', () => {
  it('laat onbruikbare regels weg en begrenst op 10', () => {
    const ruw = { winkels: [null, { naam: 1 }, ...Array.from({ length: 15 }, (_, i) => winkel(`W${i}`))] };
    const uit = leesServerWinkels(ruw);
    assert.equal(uit.length, MAX_WINKELS_LIJST);
    assert.equal(uit[0].naam, 'W0');
  });
  it('een fout-antwoord of ander formaat geeft een lege lijst', () => {
    assert.deepEqual(leesServerWinkels({ fout: 'zoeken_mislukt' }), []);
    assert.deepEqual(leesServerWinkels(null), []);
  });
});
