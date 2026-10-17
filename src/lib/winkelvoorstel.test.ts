import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { afdelingNaarSoort, afstandKm, kiesWinkels, nodigeSoorten } from '@/lib/winkelvoorstel';
import type { Winkel, WinkelSoort } from '@/lib/winkels';

const w = (naam: string, soort: WinkelSoort, lat?: number, lon?: number): Winkel => ({
  naam, soort, postcode: '1760', gemeente: 'Roosdaal', nabij: 'postcode', lat, lon,
});
const hier = { lat: 50.9, lon: 4.1 };

describe('winkelvoorstel: afdelingen en soorten (WEEK-57)', () => {
  test('afdeling wordt het juiste winkeltype, onbekend wordt supermarkt', () => {
    assert.equal(afdelingNaarSoort('vlees-vis'), 'slager');
    assert.equal(afdelingNaarSoort('brood'), 'bakker');
    assert.equal(afdelingNaarSoort('groenten-fruit'), 'groenteboer');
    assert.equal(afdelingNaarSoort('zuivel-eieren'), 'supermarkt');
    assert.equal(afdelingNaarSoort(undefined), 'supermarkt');
  });

  test('nodige soorten zijn uniek en in vaste volgorde', () => {
    assert.deepEqual(nodigeSoorten(['vlees-vis', 'brood', 'vlees-vis', 'zuivel-eieren']), ['supermarkt', 'slager', 'bakker']);
    assert.deepEqual(nodigeSoorten([]), []);
  });
});

describe('winkelvoorstel: afstand (WEEK-57)', () => {
  test('haversine geeft een realistische afstand (Brussel - Antwerpen ~ 41 km)', () => {
    const d = afstandKm({ lat: 50.8503, lon: 4.3517 }, { lat: 51.2194, lon: 4.4025 });
    assert.ok(d > 40 && d < 43, `afstand ${d}`);
  });
  test('afstand naar hetzelfde punt is nul', () => {
    assert.equal(afstandKm(hier, hier), 0);
  });
});

describe('winkelvoorstel: kiezen met zo weinig mogelijk stops (WEEK-57)', () => {
  test('één supermarkt dekt alle soorten: één stop', () => {
    const v = kiesWinkels(['supermarkt', 'slager', 'bakker'], [w('Delhaize', 'supermarkt')]);
    assert.equal(v.stops.length, 1);
    assert.equal(v.stops[0].winkel.naam, 'Delhaize');
    assert.deepEqual(v.nietGedekt, []);
  });

  test('zonder supermarkt: een stop per nodig winkeltype', () => {
    const v = kiesWinkels(['slager', 'bakker'], [w('Slager', 'slager'), w('Bakker', 'bakker')]);
    assert.equal(v.stops.length, 2);
  });

  test('bij gelijk aantal stops wint de dichtstbijzijnde winkel', () => {
    const v = kiesWinkels(
      ['slager'],
      [w('Ver', 'slager', 50.95, 4.1), w('Dichtbij', 'slager', 50.901, 4.1), w('Supermarkt', 'supermarkt', 50.95, 4.1)],
      hier,
    );
    assert.equal(v.stops.length, 1);
    assert.equal(v.stops[0].winkel.naam, 'Dichtbij');
  });

  test('een winkel buiten de maximale afstand telt niet mee', () => {
    const v = kiesWinkels(['slager'], [w('Ver weg', 'slager', 51.5, 4.1)], hier, 5);
    assert.deepEqual(v.stops, []);
    assert.deepEqual(v.nietGedekt, ['slager']);
  });

  test('een soort zonder winkel komt in nietGedekt', () => {
    const v = kiesWinkels(['groenteboer', 'slager'], [w('Slager', 'slager')]);
    assert.deepEqual(v.nietGedekt, ['groenteboer']);
    assert.deepEqual(v.stops.map((s) => s.soort), ['slager']);
  });

  test('lege lijst: geen stops', () => {
    assert.deepEqual(kiesWinkels([], [w('Delhaize', 'supermarkt')]), { stops: [], nietGedekt: [] });
  });

  test('zonder positie: lokaal eerst (eerste winkel per soort)', () => {
    const v = kiesWinkels(['bakker'], [w('Eerste', 'bakker'), w('Tweede', 'bakker')]);
    assert.equal(v.stops[0].winkel.naam, 'Eerste');
  });
});
