// WEEK-247: een recept inlezen via een link. De voorbeeldpagina's zijn zelfgemaakt en volgen de vormen die
// receptensites gebruiken (Yoast-@graph, los object, lijst, HowToSection); de tests halen nooit een echte site op.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  duurInMinuten,
  koppelIngredient,
  ldJsonBlokken,
  leesPersonen,
  leesStappen,
  omrekenen,
  ontleedRegel,
  rondAf,
  schoneTekst,
  soortVanIngredienten,
  splitsRegel,
  STANDAARD_PERSONEN,
  stam,
  verwerkRecept,
  vindRecept,
  voegSamen,
  zoekLink,
} from '@/lib/receptLink';

const pagina = (...blokken: unknown[]) =>
  `<!doctype html><html lang="nl-BE"><head><title>x</title>${blokken
    .map((b) => `<script type="application/ld+json">${typeof b === 'string' ? b : JSON.stringify(b)}</script>`)
    .join('\n')}</head><body><h1>Recept</h1></body></html>`;

/** Zoals een WordPress-site met Yoast: één @graph met website, artikel en recept. */
const YOAST = pagina({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', name: 'Kookblog' },
    { '@type': 'Article', headline: 'Pasta' },
    {
      '@type': 'Recipe',
      name: 'Pasta met tomatensaus &amp; basilicum',
      recipeYield: ['4', '4 personen'],
      prepTime: 'PT10M',
      cookTime: 'PT20M',
      recipeIngredient: ['400 g spaghetti', '2 teentjes look', '1 grote ui, gesnipperd', '6 rijpe tomaten', '2 el olijfolie', 'zout en peper', '1 bosje basilicum', '1 snufje drakenpoeder'],
      recipeInstructions: [
        { '@type': 'HowToStep', text: 'Kook de spaghetti.' },
        { '@type': 'HowToStep', text: 'Fruit de <b>ui</b> en de look.' },
      ],
    },
  ],
});

/** Een los Recipe-object met een lijst als type en stappen in secties. */
const SECTIES = pagina(
  { '@type': 'BreadcrumbList', itemListElement: [] },
  {
    '@type': ['Recipe', 'NewsArticle'],
    name: 'Stoofvlees',
    recipeYield: 6,
    totalTime: 'PT2H30M',
    recipeIngredient: ['1,5 kg rundsvlees', '2 flesjes bruin bier'],
    recipeInstructions: [
      { '@type': 'HowToSection', name: 'Vlees', itemListElement: [{ '@type': 'HowToStep', text: 'Bak het vlees aan.' }] },
      { '@type': 'HowToSection', name: 'Saus', itemListElement: [{ '@type': 'HowToStep', text: 'Blus met bier.' }, { '@type': 'HowToStep', text: 'Laat sudderen.' }] },
    ],
  }
);

describe('WEEK-247: de link', () => {
  test('haalt de link uit een gedeelde tekst', () => {
    assert.equal(zoekLink('Bekijk dit recept: https://www.kookblog.be/pasta-tomaat/ lekker!'), 'https://www.kookblog.be/pasta-tomaat/');
    assert.equal(zoekLink('https://kookblog.be/recept?id=3).'), 'https://kookblog.be/recept?id=3');
  });

  test('weigert alles wat geen gewone website is', () => {
    for (const fout of ['geen link', 'ftp://kookblog.be/x', 'http://localhost/x', 'http://127.0.0.1/x', 'http://192.168.1.10/x', 'https://[::1]/x', 'https://kookblog.be:8080/x', 'https://user:pw@kookblog.be/x', 'https://intranet/x', 'https://printer.local/x']) {
      assert.equal(zoekLink(fout), undefined, fout);
    }
  });
});

describe('WEEK-247: het recept uit de pagina lezen', () => {
  test('vindt het recept in een Yoast-@graph, met naam, personen, tijd, ingrediënten en stappen', () => {
    const r = vindRecept(ldJsonBlokken(YOAST), 'nl-BE');
    assert.ok(r);
    assert.equal(r.naam, 'Pasta met tomatensaus & basilicum');
    assert.equal(r.personen, 4);
    assert.equal(r.minuten, 30);
    assert.equal(r.ingredienten.length, 8);
    assert.deepEqual(r.stappen, ['Kook de spaghetti.', 'Fruit de ui en de look.']);
    assert.equal(r.taal, 'nl');
  });

  test('vindt een los recept met een lijst als type en stappen in secties', () => {
    const r = vindRecept(ldJsonBlokken(SECTIES));
    assert.ok(r);
    assert.equal(r.personen, 6);
    assert.equal(r.minuten, 150);
    assert.deepEqual(r.stappen, ['Bak het vlees aan.', 'Blus met bier.', 'Laat sudderen.']);
  });

  test('een pagina zonder recept, met kapotte JSON of zonder ingrediënten geeft niets', () => {
    assert.equal(vindRecept(ldJsonBlokken('<html><body>Geen recept</body></html>')), undefined);
    assert.equal(vindRecept(['{kapot']), undefined);
    assert.equal(vindRecept([JSON.stringify({ '@type': 'Recipe', name: 'Leeg', recipeIngredient: [] })]), undefined);
  });

  test('ruwe regeleinden in de JSON breken het inlezen niet', () => {
    const r = vindRecept(['{"@type":"Recipe","name":"Soep","recipeIngredient":["1 l water"],"recipeInstructions":"Kook\nhet water."}']);
    assert.ok(r);
    assert.equal(r.naam, 'Soep');
  });

  test('stappen als één tekst met regeleinden of HTML worden losse stappen; nummers vallen weg', () => {
    assert.deepEqual(leesStappen('1. Snijd de ui.<br>2. Bak ze.'), ['Snijd de ui.', 'Bak ze.']);
    assert.deepEqual(leesStappen(['Stap een', '', 'Stap twee']), ['Stap een', 'Stap twee']);
  });

  test('personen en duur in de vormen die sites gebruiken', () => {
    assert.equal(leesPersonen('4 personen'), 4);
    assert.equal(leesPersonen('4-6'), 4);
    assert.equal(leesPersonen(['geen', '2 servings']), 2);
    assert.equal(leesPersonen('veel'), undefined);
    assert.equal(leesPersonen(0), undefined);
    assert.equal(duurInMinuten('PT1H15M'), 75);
    assert.equal(duurInMinuten('P0DT0H45M'), 45);
    assert.equal(duurInMinuten('PT0M'), undefined);
    assert.equal(duurInMinuten('45 minuten'), undefined);
  });

  test('HTML-entiteiten en tags worden gewone tekst', () => {
    assert.equal(schoneTekst('Cr&egrave;me &amp; <i>sel</i>&nbsp;&#233;&#x27;'), "Crème & sel é'");
  });
});

describe('WEEK-247: een ingrediëntregel ontleden', () => {
  const g = (r: string) => {
    const o = ontleedRegel(r);
    return { h: o.hoeveelheid, soort: o.bron?.soort, factor: o.bron?.factor, naam: o.naam };
  };
  test('getal, eenheid en naam in de vier talen', () => {
    assert.deepEqual(g('200 g bloem'), { h: 200, soort: 'g', factor: 1, naam: 'bloem' });
    assert.deepEqual(g('250g pasta'), { h: 250, soort: 'g', factor: 1, naam: 'pasta' });
    assert.deepEqual(g('1,5 kg rundsvlees'), { h: 1.5, soort: 'g', factor: 1000, naam: 'rundsvlees' });
    assert.deepEqual(g('2 el olijfolie'), { h: 2, soort: 'ml', factor: 15, naam: 'olijfolie' });
    assert.deepEqual(g('200 g de farine'), { h: 200, soort: 'g', factor: 1, naam: 'farine' });
    assert.deepEqual(g("2 c. à soupe d'huile d'olive"), { h: 2, soort: 'ml', factor: 15, naam: "huile d'olive" });
    assert.deepEqual(g('1 TL Salz'), { h: 1, soort: 'ml', factor: 5, naam: 'Salz' });
    assert.deepEqual(g('2 cups of flour'), { h: 2, soort: 'ml', factor: 240, naam: 'flour' });
  });
  test('breuken, bereiken, "x" en hoeveelheden tussen haakjes', () => {
    assert.equal(g('1½ dl melk').h, 1.5);
    assert.equal(g('½ citroen').h, 0.5);
    assert.equal(g('1/2 tl zout').h, 0.5);
    assert.equal(g('1 1/2 cups milk').h, 1.5);
    assert.equal(g('2-3 tomaten').h, 2);
    assert.deepEqual(g('2 x 400 g tomatenblokjes'), { h: 800, soort: 'g', factor: 1, naam: 'tomatenblokjes' });
    assert.deepEqual(g('1 blik (400 g) kikkererwten'), { h: 400, soort: 'g', factor: 1, naam: 'kikkererwten' });
  });
  test('zonder eenheid is het een aantal stuks; zonder getal maar met eenheid is het er één', () => {
    assert.deepEqual(g('3 rijpe tomaten'), { h: 3, soort: 'stuk', factor: 1, naam: 'rijpe tomaten' });
    assert.deepEqual(g('snufje zout'), { h: 1, soort: 'snuf', factor: 1, naam: 'zout' });
    assert.deepEqual(g('a pinch of salt'), { h: 1, soort: 'snuf', factor: 1, naam: 'salt' });
    assert.deepEqual(g('zout en peper'), { h: undefined, soort: undefined, factor: undefined, naam: 'zout en peper' });
    assert.equal(g('1 bosje peterselie').soort, 'onbekend');
  });
});

describe('WEEK-247: koppelen aan de ingrediëntenlijst, zonder dubbels', () => {
  const code = (naam: string, ...talen: ('nl' | 'fr' | 'de' | 'en')[]) => koppelIngredient(naam, talen.length ? talen : ['nl']);

  test('meervoud, bijwoorden, haakjes en wat na een komma komt maken geen nieuw ingrediënt', () => {
    for (const naam of ['tomaat', 'tomaten', 'rijpe tomaten', 'Tomaten (vers)', 'verse tomaten, in blokjes']) {
      assert.deepEqual(code(naam), { code: 'tomaat', zeker: true }, naam);
    }
    assert.deepEqual(code('uien'), { code: 'ui', zeker: true });
    assert.deepEqual(code('grote ui, gesnipperd'), { code: 'ui', zeker: true });
    assert.deepEqual(code('aardappelen'), { code: 'aardappel', zeker: true });
    assert.deepEqual(code('eieren'), { code: 'eieren', zeker: true });
    assert.deepEqual(code('ei'), { code: 'eieren', zeker: true });
  });

  test('dezelfde naam in een andere taal geeft hetzelfde ingrediënt', () => {
    assert.equal(code('tomates', 'fr')?.code, 'tomaat');
    assert.equal(code('Tomaten', 'de')?.code, 'tomaat');
    assert.equal(code('tomatoes', 'en')?.code, 'tomaat');
    assert.equal(code("huile d'olive", 'fr')?.code, 'olijfolie');
    assert.equal(code('olive oil', 'en')?.code, 'olijfolie');
    assert.equal(code('extra vierge olijfolie')?.code, 'olijfolie');
  });

  test('gekende synoniemen: look, peper, parmezaan', () => {
    assert.deepEqual(code('look'), { code: 'knoflook', zeker: true });
    assert.deepEqual(code('peper'), { code: 'zwarte_peper', zeker: true });
    assert.deepEqual(code('Parmezaan'), { code: 'kaas_parmezaan', zeker: true });
  });

  test('de taal van het recept wint bij gelijke namen (paprika is groente in het Nederlands, kruid in het Engels)', () => {
    assert.equal(code('paprika', 'nl')?.code, 'paprika');
    assert.equal(code('paprika', 'en')?.code, 'paprikapoeder');
  });

  test('een gedeeltelijke naam is een voorstel, geen zekerheid', () => {
    assert.deepEqual(code('grote rode ui'), { code: 'rode_ui', zeker: true });
    const tros = code('trostomaten');
    assert.equal(tros?.code, 'tomaat');
    assert.equal(tros?.zeker, false);
  });

  test('iets dat niet lijkt op een ingrediënt uit de lijst, wordt niet gekoppeld', () => {
    assert.equal(code('drakenpoeder'), undefined);
    assert.equal(code(''), undefined);
    assert.equal(code('vers, fijngehakt'), undefined);
  });

  test('eenheden en bereidingswoorden in de naam (Engelse sites) storen het koppelen niet', () => {
    const regel = (r: string) => koppelIngredient(ontleedRegel(r).naam, ['en']);
    assert.deepEqual(regel('2 garlic cloves finely chopped'), { code: 'knoflook', zeker: true });
    assert.deepEqual(regel('2 carrots trimmed and finely chopped'), { code: 'wortel', zeker: true });
    assert.deepEqual(regel('2 celery sticks, chopped'), { code: 'selderij', zeker: true });
    assert.deepEqual(regel('2 fresh bay leaves'), { code: 'laurier', zeker: true });
    assert.deepEqual(regel('500g beef mince'), { code: 'gehakt', zeker: true });
    assert.equal(regel('4 rashers smoked streaky bacon')?.code, 'spek');
  });

  test('stam: meervoud en dubbele klinkers', () => {
    assert.equal(stam('tomaat'), stam('tomaten'));
    assert.equal(stam('citroen'), stam('citroenen'));
    assert.equal(stam('ui'), stam('uien'));
    assert.equal(stam('banaan'), stam('bananen'));
  });
});

describe('WEEK-247: omrekenen naar de eenheid van de app en naar één volwassene', () => {
  test('gram en liter per persoon, afgerond zoals een mens het schrijft', () => {
    assert.equal(omrekenen(ontleedRegel('400 g spaghetti'), 'pasta_spaghetti', 4), 100);
    assert.equal(omrekenen(ontleedRegel('1 l melk'), 'melk', 4), 250);
    assert.equal(omrekenen(ontleedRegel('2 el olijfolie'), 'olijfolie', 4), 8);
    assert.equal(omrekenen(ontleedRegel('1,5 kg rundsvlees'), 'gehakt', 6), 250);
  });
  test('stuks per persoon op een kwart; teentjes blijven teentjes', () => {
    assert.equal(omrekenen(ontleedRegel('6 tomaten'), 'tomaat', 4), 1.5);
    assert.equal(omrekenen(ontleedRegel('1 ui'), 'ui', 4), 0.25);
    assert.equal(omrekenen(ontleedRegel('2 teentjes look'), 'knoflook', 4), 0.5);
  });
  test('stuks naar gram en gram naar stuks via het gemiddelde stukgewicht', () => {
    assert.equal(omrekenen(ontleedRegel('600 g tomaten'), 'tomaat', 4), 1.25); // 600 / 120 / 4
    assert.equal(omrekenen(ontleedRegel('2 kipfilets'), 'kipfilet', 2), undefined); // geen stukgewicht gekend
  });
  test('een snuifje blijft een snuifje; zout zonder hoeveelheid is een beetje; een bosje is niet te bepalen', () => {
    assert.equal(omrekenen(ontleedRegel('1 snufje zout'), 'zout', 4), 1);
    assert.equal(omrekenen(ontleedRegel('zout'), 'zout', 4), 1);
    assert.equal(omrekenen(ontleedRegel('1 bosje basilicum'), 'basilicum', 4), undefined);
    assert.equal(omrekenen(ontleedRegel('tomaten'), 'tomaat', 4), undefined);
  });
  test('afronden', () => {
    assert.equal(rondAf(112, 'g'), 110);
    assert.equal(rondAf(7.4, 'ml'), 7);
    assert.equal(rondAf(0.04, 'g'), 0.1);
    assert.equal(rondAf(0.1, 'stuk'), 0.25);
  });
});

describe('WEEK-247: het hele recept verwerken', () => {
  test('zekere ingrediënten met hoeveelheid komen in het recept, de rest om na te kijken', () => {
    const r = verwerkRecept(vindRecept(ldJsonBlokken(YOAST), 'nl')!, 'nl');
    assert.equal(r.naam, 'Pasta met tomatensaus & basilicum');
    assert.equal(r.minuten, 30);
    assert.equal(r.personen, 4);
    assert.equal(r.personenVanSite, true);
    const codes = Object.fromEntries(r.ingredienten.map((i) => [i.code, [i.hoeveelheid, i.eenheid]]));
    assert.deepEqual(codes.pasta_spaghetti, [100, 'g']);
    assert.deepEqual(codes.knoflook, [0.5, 'teentje']);
    assert.deepEqual(codes.ui, [0.25, 'stuk']);
    assert.deepEqual(codes.tomaat, [1.5, 'stuk']);
    assert.deepEqual(codes.olijfolie, [8, 'ml']);
    const naKijken = Object.fromEntries(r.nakijken.map((n) => [n.tekst, n.reden]));
    assert.equal(naKijken['1 bosje basilicum'], 'hoeveelheid');
    assert.equal(naKijken['1 snufje drakenpoeder'], 'onbekend');
    // "zout en peper" wordt twee gekende ingrediënten, een beetje van elk
    assert.deepEqual(codes.zout, [1, 'g']);
    assert.deepEqual(codes.zwarte_peper, [1, 'g']);
    assert.equal(naKijken['zout en peper'], undefined);
  });

  test('splitsRegel: enkel zonder hoeveelheid en enkel als elk deel gekend is', () => {
    assert.deepEqual(splitsRegel('sel et poivre', ['fr']), ['sel', 'poivre']);
    assert.deepEqual(splitsRegel('Salz und Pfeffer', ['de']), ['Salz', 'Pfeffer']);
    assert.deepEqual(splitsRegel('zout en drakenpoeder', ['nl']), ['zout en drakenpoeder']);
    assert.deepEqual(splitsRegel('2 el zout en peper', ['nl']), ['2 el zout en peper']);
  });

  test('een ingrediënt dat twee keer voorkomt, staat één keer in het recept met de som', () => {
    const r = verwerkRecept({ naam: 'Saus', personen: 2, ingredienten: ['2 tomaten', '200 g tomaten', '1 el olijfolie', '1 el olijfolie'], stappen: ['Kook.'] }, 'nl');
    assert.equal(r.ingredienten.filter((i) => i.code === 'tomaat').length, 1);
    assert.equal(r.ingredienten.find((i) => i.code === 'tomaat')?.hoeveelheid, 1.75); // 2/2 = 1 stuk + 200 g / 120 g / 2 ≈ 0,75 stuk
    assert.equal(r.ingredienten.find((i) => i.code === 'olijfolie')?.hoeveelheid, 15);
  });

  test('zonder personen op de site wordt van het standaardaantal uitgegaan, en dat wordt gemeld', () => {
    const r = verwerkRecept({ naam: 'X', ingredienten: ['400 g spaghetti'], stappen: [] }, 'nl');
    assert.equal(r.personen, STANDAARD_PERSONEN);
    assert.equal(r.personenVanSite, false);
  });

  test('de namen staan in de taal van de app, ook voor een Frans recept', () => {
    const r = verwerkRecept({ naam: 'Sauce', personen: 4, taal: 'fr', ingredienten: ['4 tomates', "2 c. à soupe d'huile d'olive"], stappen: [] }, 'nl');
    assert.deepEqual(r.ingredienten.map((i) => i.naam).sort(), ['olijfolie', 'tomaat']);
  });

  test('het soort gerecht volgt uit de ingrediënten (vlees wint van vis, anders vegetarisch)', () => {
    assert.equal(soortVanIngredienten(['gehakt', 'tomaat']), 'vlees');
    assert.equal(soortVanIngredienten(['zalm', 'citroen']), 'vis');
    assert.equal(soortVanIngredienten(['zalm', 'kipfilet']), 'vlees');
    assert.equal(soortVanIngredienten(['tomaat', 'pasta_spaghetti']), 'vegetarisch');
    assert.equal(verwerkRecept(vindRecept(ldJsonBlokken(SECTIES))!, 'nl').soort, 'vlees');
    assert.equal(verwerkRecept({ naam: 'Saus', ingredienten: ['4 tomaten'], stappen: [] }, 'nl').soort, 'vegetarisch');
  });

  test('voegSamen telt enkel samen bij dezelfde code', () => {
    const a = voegSamen([{ code: 'ui', naam: 'ui', hoeveelheid: 1, eenheid: 'stuk' }], { code: 'ui', naam: 'ui', hoeveelheid: 0.5, eenheid: 'stuk' });
    assert.deepEqual(a, [{ code: 'ui', naam: 'ui', hoeveelheid: 1.5, eenheid: 'stuk' }]);
    assert.equal(voegSamen(a, { code: 'tomaat', naam: 'tomaat', hoeveelheid: 1, eenheid: 'stuk' }).length, 2);
  });
});
