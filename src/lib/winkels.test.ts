import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { bouwQuery, bouwStraalQuery, foutReden, leesWinkels, rangschik, schoonGemeente, MAX_STRAAL_METERS, MAX_WINKELS, OVERPASS_SERVER_TIMEOUT_S, OVERPASS_TIMEOUT_MS, Winkel } from '@/lib/winkels';

describe('winkels in de buurt: query (WEEK-53)', () => {
  test('geldige Belgische postcode geeft een query op postcode en op gemeente', () => {
    const q = bouwQuery('1760', 'Roosdaal');
    assert.ok(q);
    assert.match(q!, /"addr:postcode"="1760"/);
    assert.match(q!, /"addr:city"="Roosdaal"/);
    assert.match(q!, /ISO3166-1"="BE"/);
  });

  test('zonder gemeente alleen op postcode', () => {
    const q = bouwQuery('1760', '');
    assert.ok(q);
    assert.match(q!, /"addr:postcode"="1760"/);
    assert.doesNotMatch(q!, /addr:city/);
  });

  test('ongeldige postcode geeft geen query', () => {
    assert.equal(bouwQuery('', 'Roosdaal'), null);
    assert.equal(bouwQuery('17', 'Roosdaal'), null);
    assert.equal(bouwQuery('1760a', 'Roosdaal'), null);
    assert.equal(bouwQuery('"1760"', 'Roosdaal'), null);
  });

  test('gemeente met vreemde tekens wordt veilig gemaakt', () => {
    assert.equal(schoonGemeente('Sint-Pieters-Leeuw'), 'Sint-Pieters-Leeuw');
    assert.equal(schoonGemeente('Roos"daal\\"; drop'), 'Roosdaal drop');
    assert.equal(schoonGemeente('  Sint  Genesius-Rode '), 'Sint Genesius-Rode');
    const q = bouwQuery('1760', 'Roos"daal')!;
    assert.match(q, /"addr:city"="Roosdaal"/);
  });
});

describe('winkels in de buurt: antwoord lezen (WEEK-53)', () => {
  const antwoord = {
    elements: [
      { type: 'node', id: 1, lat: 50.9, lon: 4.1, tags: { name: 'Delhaize Roosdaal', shop: 'supermarket', 'addr:postcode': '1760', 'addr:city': 'Roosdaal' } },
      { type: 'way', id: 2, center: { lat: 50.91, lon: 4.12 }, tags: { name: 'Slagerij Janssens', shop: 'butcher', 'addr:postcode': '1761', 'addr:city': 'Borchtlombeek' } },
      { type: 'node', id: 3, tags: { name: 'Bakkerij Peeters', shop: 'bakery', 'addr:postcode': '1760', 'addr:city': 'Roosdaal' } },
      { type: 'node', id: 4, tags: { shop: 'supermarket', 'addr:postcode': '1760' } },
      { type: 'node', id: 5, tags: { name: 'Kledingwinkel', shop: 'clothes', 'addr:postcode': '1760' } },
      { type: 'node', id: 6, tags: { name: 'Delhaize Roosdaal', shop: 'supermarket', 'addr:postcode': '1760' } },
    ],
  };

  test('leest naam, soort, postcode en coördinaten', () => {
    const w = leesWinkels(antwoord, '1760');
    const slager = w.find((x) => x.naam === 'Slagerij Janssens')!;
    assert.equal(slager.soort, 'slager');
    assert.equal(slager.lat, 50.91);
    assert.equal(slager.lon, 4.12);
  });

  test('slaat elementen zonder naam of met onbekende winkel over', () => {
    const w = leesWinkels(antwoord, '1760');
    assert.equal(w.some((x) => x.naam === 'Kledingwinkel'), false);
    assert.equal(w.length, 3);
  });

  test('ontdubbelt dezelfde winkel op dezelfde postcode', () => {
    const w = leesWinkels(antwoord, '1760');
    assert.equal(w.filter((x) => x.naam === 'Delhaize Roosdaal').length, 1);
  });

  test('lokaal eerst: zelfde postcode vóór andere gemeenten', () => {
    const w = leesWinkels(antwoord, '1760');
    assert.equal(w[0].nabij, 'postcode');
    assert.equal(w[w.length - 1].nabij, 'gemeente');
    assert.equal(w[w.length - 1].naam, 'Slagerij Janssens');
  });

  test('onbruikbare invoer geeft een lege lijst', () => {
    assert.deepEqual(leesWinkels(null, '1760'), []);
    assert.deepEqual(leesWinkels('tekst', '1760'), []);
    assert.deepEqual(leesWinkels({ elements: 'geen lijst' }, '1760'), []);
  });

  test('beperkt het aantal winkels', () => {
    const veel = { elements: Array.from({ length: MAX_WINKELS + 5 }, (_, i) => ({ tags: { name: `Winkel ${i}`, shop: 'bakery', 'addr:postcode': '1760' } })) };
    assert.equal(leesWinkels(veel, '1760').length, MAX_WINKELS);
  });
});

describe('winkels in de buurt: rangschikken (WEEK-53)', () => {
  const maak = (naam: string, soort: Winkel['soort'], nabij: Winkel['nabij']): Winkel => ({ naam, soort, nabij, postcode: '', gemeente: '' });

  test('lokaal eerst, daarna op soort en naam', () => {
    const r = rangschik([maak('Z', 'bakker', 'gemeente'), maak('B', 'supermarkt', 'postcode'), maak('A', 'bakker', 'postcode')]);
    // Zelfde postcode eerst (op soort, dan naam); daarna de andere gemeenten.
    assert.deepEqual(r.map((x) => x.naam), ['A', 'B', 'Z']);
  });
});

describe('winkels binnen een straal (WEEK-115)', () => {
  test('zoekt rond het punt van de postcode, niet in heel België', () => {
    const q = bouwStraalQuery({ lat: 50.9, lon: 4.3 });
    assert.match(q, /around:10000,50\.9,4\.3/);
    assert.doesNotMatch(q, /ISO3166-1/);
    assert.match(q, /"shop"~"\^\(/);
  });

  test('de straal wordt begrensd op 10 km', () => {
    assert.equal(MAX_STRAAL_METERS, 10000);
    assert.match(bouwStraalQuery({ lat: 50.9, lon: 4.3 }, 50000), /around:10000,/);
  });

  test('een kleinere straal blijft behouden', () => {
    assert.match(bouwStraalQuery({ lat: 50.9, lon: 4.3 }, 2500), /around:2500,/);
  });

  test('regressie: de postcode-query blijft ongewijzigd voor het terugval-geval', () => {
    const q = bouwQuery('1760', 'Roosdaal');
    assert.match(q!, /"addr:postcode"="1760"/);
    assert.match(q!, /ISO3166-1"="BE"/);
  });
});

describe('reden van een mislukte winkelzoekopdracht (WEEK-115)', () => {
  test('een overbelaste server (429 of 5xx) geeft druk', () => {
    assert.equal(foutReden(new Error('Overpass 429')), 'druk');
    assert.equal(foutReden(new Error('Overpass 504')), 'druk');
    // WEEK-120: een afgebroken aanvraag (wachttijd bereikt) is een verbindingsprobleem, geen eindeloos laden.
    const afgebroken = new Error('This operation was aborted');
    afgebroken.name = 'AbortError';
    assert.equal(foutReden(afgebroken), 'verbinding');
  });

  test('een netwerkfout geeft verbinding', () => {
    assert.equal(foutReden(new TypeError('Network request failed')), 'verbinding');
    assert.equal(foutReden(new Error('fetch failed')), 'verbinding');
  });

  test('een onbekende fout geeft onbekend', () => {
    assert.equal(foutReden(new Error('iets anders')), 'onbekend');
    assert.equal(foutReden(undefined), 'onbekend');
  });
});

describe('wachttijd van de winkelzoeker (WEEK-127)', () => {
  test('de app wacht langer dan de zoekopdracht van de server mag duren', () => {
    assert.ok(OVERPASS_TIMEOUT_MS > OVERPASS_SERVER_TIMEOUT_S * 1000);
  });
  test('regressie: de zoekopdracht vraagt nog steeds de server-timeout die bij de wachttijd hoort', () => {
    assert.ok(bouwStraalQuery({ lat: 50.9, lon: 4.2 }).includes(`[timeout:${OVERPASS_SERVER_TIMEOUT_S}]`));
  });
});
