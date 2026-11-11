import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  categorieNaam,
  dagSleutel,
  datumKort,
  eenheidNaam,
  hoeveelheidTekst,
  getal,
  isTaal,
  kiesTaal,
  TALEN,
  vertaal,
  vertaalAantal,
  VERTALINGEN,
  vulIn,
} from '@/i18n';
import { nl } from '@/i18n/vertalingen/nl';

const plaatshouders = (tekst: string) => [...tekst.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('vertalingen', () => {
  test('ondersteunt precies NL, FR, DE, EN, ES en PT', () => {
    assert.deepEqual([...TALEN].sort(), ['de', 'en', 'fr', 'nl']);
  });

  for (const taal of TALEN) {
    describe(taal, () => {
      const tabel = VERTALINGEN[taal] as Record<string, string>;

      test('heeft exact dezelfde sleutels als Nederlands', () => {
        assert.deepEqual(Object.keys(tabel).sort(), Object.keys(nl).sort());
      });

      test('geen lege vertalingen', () => {
        for (const [sleutel, tekst] of Object.entries(tabel)) {
          assert.ok(tekst.trim().length > 0, `${taal}: ${sleutel} is leeg`);
        }
      });

      test('dezelfde {plaatshouders} als Nederlands', () => {
        for (const [sleutel, bron] of Object.entries(nl)) {
          assert.deepEqual(plaatshouders(tabel[sleutel]), plaatshouders(bron), `${taal}: ${sleutel}`);
        }
      });

      test('meervoudsleutels komen altijd in paren (_1 en _n)', () => {
        for (const sleutel of Object.keys(tabel)) {
          if (sleutel.endsWith('_1')) assert.ok(`${sleutel.slice(0, -2)}_n` in tabel, sleutel);
          if (sleutel.endsWith('_n')) assert.ok(`${sleutel.slice(0, -2)}_1` in tabel, sleutel);
        }
      });
    });
  }

  test('niet-Nederlandse talen zijn echt vertaald (geen kopie van NL)', () => {
    for (const taal of TALEN.filter((t) => t !== 'nl')) {
      const tabel = VERTALINGEN[taal] as Record<string, string>;
      const gelijk = Object.keys(nl).filter((k) => tabel[k] === (nl as Record<string, string>)[k]);
      // Enkele woorden zijn in meerdere talen identiek (Menu, Budget, Nutri-Score…), maar nooit de meerderheid.
      assert.ok(gelijk.length < Object.keys(nl).length * 0.15, `${taal}: ${gelijk.length} identiek: ${gelijk.join(', ')}`);
    }
  });
});

describe('vulIn', () => {
  test('vult plaatshouders in en laat onbekende staan', () => {
    assert.equal(vulIn('{open} van {totaal}', { open: 3, totaal: 10 }), '3 van 10');
    assert.equal(vulIn('Hallo {naam}', {}), 'Hallo {naam}');
  });
});

describe('vertaal', () => {
  test('geeft de tekst in de gekozen taal', () => {
    assert.equal(vertaal('fr', 'tab.lijst.titel'), 'Liste de courses');
    assert.equal(vertaal('de', 'lijst.teller', { open: 2, totaal: 5 }), 'Noch 2 von 5 zu kaufen');
  });
});

describe('vertaalAantal', () => {
  test('enkelvoud en meervoud', () => {
    assert.equal(vertaalAantal('nl', 'algemeen.personen', 1), '1 persoon');
    assert.equal(vertaalAantal('nl', 'algemeen.personen', 4), '4 personen');
    assert.equal(vertaalAantal('en', 'algemeen.personen', 4), '4 people');
  });
});

describe('kiesTaal', () => {
  test('een keuze in het profiel wint altijd', () => {
    assert.equal(kiesTaal(['fr-BE'], 'de'), 'de');
  });
  test('neemt de eerste ondersteunde toesteltaal', () => {
    assert.equal(kiesTaal(['fr-BE', 'nl-BE']), 'fr');
    assert.equal(kiesTaal(['it-IT', 'pt_BR', 'en-US']), 'en');
    assert.equal(kiesTaal(['NL']), 'nl');
  });
  test('valt terug op Engels als geen enkele toesteltaal ondersteund is', () => {
    assert.equal(kiesTaal(['it-IT', 'ja-JP']), 'en');
    assert.equal(kiesTaal([]), 'en');
  });
  test('negeert een ongeldige voorkeur', () => {
    assert.equal(kiesTaal(['es-ES'], 'xx' as never), 'en');
    assert.equal(kiesTaal(['fr-BE'], 'es' as never), 'fr');
  });
});

describe('isTaal', () => {
  test('herkent enkel ondersteunde codes', () => {
    assert.ok(isTaal('nl'));
    assert.ok(!isTaal('it'));
    assert.ok(!isTaal(5));
  });
});

describe('getal', () => {
  test('decimaalteken volgens taal', () => {
    assert.equal(getal('nl', 1.5), '1,5');
    assert.equal(getal('en', 1.5), '1.5');
    assert.equal(getal('de', 22.54), '22,5');
  });
});

describe('categorieNaam', () => {
  test('vertaalt categoriecodes', () => {
    assert.equal(categorieNaam('en', 'brood-beleg'), 'Bread & toppings');
    assert.equal(categorieNaam('fr', 'fruit'), 'Fruits');
  });
  test('vertaalt ook oude, Nederlandse categorienamen uit bestaande lijsten', () => {
    assert.equal(categorieNaam('de', 'Huishouden'), 'Haushalt');
    assert.equal(categorieNaam('nl', 'Avondeten'), 'Avondeten');
  });
  test('toont onbekende categorieën ongewijzigd', () => {
    assert.equal(categorieNaam('de', 'Mijn winkel'), 'Mijn winkel');
  });
});

describe('dagSleutel', () => {
  test('elke dag uit het weekmenu heeft een vertaling', async () => {
    const { WEEKDAGEN } = await import('@/lib/planner/types');
    for (const dag of WEEKDAGEN) {
      assert.ok(dagSleutel(dag) in nl, dag);
      assert.equal(vertaal('en', dagSleutel('Maandag')), 'Monday');
    }
  });
});

describe('hoeveelheidTekst', () => {
  test('gewicht en volume met decimaalteken volgens taal', () => {
    assert.equal(hoeveelheidTekst('nl', 330, 'g'), '330 g');
    assert.equal(hoeveelheidTekst('nl', 1.5, 'stuk'), '1,5 ×');
    assert.equal(hoeveelheidTekst('en', 1.5, 'stuk'), '1.5 ×');
  });
  test('teentjes in enkelvoud en meervoud', () => {
    assert.equal(hoeveelheidTekst('nl', 1, 'teentje'), '1 teentje');
    assert.equal(hoeveelheidTekst('fr', 3, 'teentje'), '3 gousses');
  });
  test('geen of nul hoeveelheid geeft lege tekst; vrije eenheid blijft staan', () => {
    assert.equal(hoeveelheidTekst('nl', undefined, 'g'), '');
    assert.equal(hoeveelheidTekst('nl', 0, 'g'), '');
    assert.equal(hoeveelheidTekst('de', 2, 'EL'), '2 EL');
  });
});

describe('Frans: beleefdheidsvorm en vaste woordenlijst (WEEK-238)', () => {
  const fr = VERTALINGEN.fr as Record<string, string>;
  const zoek = (re: RegExp) => Object.entries(fr).filter(([, v]) => re.test(v)).map(([k, v]) => `${k}: ${v}`);

  test('overal vous, nergens tu/ton/ta/tes/toi/te', () => {
    assert.deepEqual(zoek(/(^|[^\p{L}])(tu|ton|ta|tes|toi|te|t’)(?=$|[^\p{L}])/iu), []);
  });
  test('geen gebiedende wijs in de tu-vorm', () => {
    assert.deepEqual(zoek(/(^|[^\p{L}])(réessaie|vérifie|choisis|ajoute|utilise des|crée|trouve|mange|scanne|planifie|connecte-toi|saisis|ouvre-le|cherche un)(?=$|[^\p{L}])/iu), []);
  });
  test('één woord per begrip: application, menu de la semaine, gestionnaire, famille', () => {
    assert.deepEqual(zoek(/(^|[^\p{L}])app(?=$|[^\p{L}])/iu), [], 'app → application');
    assert.deepEqual(zoek(/planning/iu), [], 'planning → menu de la semaine');
    assert.deepEqual(zoek(/administrateur/iu), [], 'administrateur → gestionnaire');
    assert.deepEqual(zoek(/foyer/iu), [], 'foyer → famille');
  });
  test('typografische apostrof (’), geen rechte', () => {
    assert.deepEqual(zoek(/'/), []);
  });
});

describe('namen In huis, Boodschappen, Voor het menu / Andere producten (WEEK-239)', () => {
  const verwacht = {
    nl: { lijst: 'Boodschappen', huis: 'In huis', boven: 'Te kopen', menu: 'Voor de weekplanner', ander: 'Andere producten' },
    fr: { lijst: 'Courses', huis: 'À la maison', boven: 'À acheter', menu: 'Pour le planificateur', ander: 'Autres produits' },
    de: { lijst: 'Einkauf', huis: 'Zuhause', boven: 'Zu kaufen', menu: 'Für den Wochenplaner', ander: 'Andere Produkte' },
    en: { lijst: 'Shopping', huis: 'At home', boven: 'To buy', menu: 'For the meal planner', ander: 'Other products' },
  } as const;
  for (const [taal, w] of Object.entries(verwacht) as [keyof typeof verwacht, (typeof verwacht)['nl']][]) {
    test(`${taal}: de tabs dragen de nieuwe namen`, () => {
      assert.equal(vertaal(taal, 'tab.lijst'), w.lijst);
      assert.equal(vertaal(taal, 'tab.frigo'), w.huis);
      assert.equal(vertaal(taal, 'lijst.tabBoodschappen'), w.boven);
      assert.equal(vertaal(taal, 'frigo.sheetPlanner'), w.menu);
      assert.equal(vertaal(taal, 'frigo.sheetLos'), w.ander);
    });
    test(`${taal}: de knop bovenaan heet anders dan de tab onderaan`, () => {
      assert.notEqual(vertaal(taal, 'lijst.tabBoodschappen'), vertaal(taal, 'tab.lijst'));
    });
  }
  test('nergens nog de oude namen (losse producten, virtuele frigo), behalve de echte koelkast in de profieluitleg', () => {
    const oud = /losse producten|produits libres|loose products|lose produkte|einzelne produkte|virtuele frigo|frigo virtuel|virtual fridge|virtueller kühlschrank/iu;
    const naam = /(^|[^\p{L}])(frigo|fridge|kühlschrank)(?=$|[^\p{L}])/iu;
    const fouten: string[] = [];
    for (const taal of ['nl', 'fr', 'de', 'en'] as const) {
      for (const [k, v] of Object.entries(VERTALINGEN[taal] as Record<string, string>)) {
        if (oud.test(v) || (naam.test(v) && k !== 'profiel.waarom.tekst')) fouten.push(`${taal} ${k}: ${v}`);
      }
    }
    assert.deepEqual(fouten, []);
  });
  test('de startuitleg belooft niets wat de app niet kan (geen taken verdelen, geen afvinken in In huis)', () => {
    for (const taal of ['nl', 'fr', 'de', 'en'] as const) {
      assert.doesNotMatch(vertaal(taal, 'uitleg.huishouden.tekst'), /taken|tâches|Aufgaben|chores/iu, taal);
    }
    assert.doesNotMatch(vertaal('nl', 'howto.frigo'), /vink af wat je al in huis hebt/iu);
  });
});

describe('uitleg Andere producten en invoervelden (WEEK-240)', () => {
  test('de uitleg noemt meer dan één soort product, niet enkel wc-papier', () => {
    for (const taal of ['nl', 'fr', 'de', 'en'] as const) {
      for (const k of ['leeg.lijstAnder', 'leeg.huisAnder', 'pagina.lijstInfo', 'pagina.frigoInfo'] as const) {
        const v = vertaal(taal, k);
        assert.doesNotMatch(v, /wc-papier|papier toilette|Toilettenpapier|toilet paper/iu, `${taal} ${k}`);
        assert.ok(v.split(',').length >= 3, `${taal} ${k}: meerdere voorbeelden`);
      }
    }
  });
  test('korte invoervelden: Typ hier en Typ om te zoeken', () => {
    assert.equal(vertaal('nl', 'frigo.toevoegen'), 'Typ hier…');
    assert.equal(vertaal('nl', 'frigo.zoekIngredient'), 'Typ om te zoeken…');
    assert.equal(vertaal('fr', 'frigo.toevoegen'), 'Tapez ici…');
    assert.equal(vertaal('fr', 'frigo.zoekIngredient'), 'Tapez pour chercher…');
  });
});

describe('ingrediënt wijzigen (WEEK-241)', () => {
  test('eigen titel voor een ingrediënt, anders dan voor een product', () => {
    assert.equal(vertaal('nl', 'frigo.bewerkIngredientKop'), 'Ingrediënt wijzigen');
    for (const taal of ['nl', 'fr', 'de', 'en'] as const) {
      assert.notEqual(vertaal(taal, 'frigo.bewerkIngredientKop'), vertaal(taal, 'frigo.bewerkKop'), taal);
    }
  });
  test('teentje staat als enkelvoud en meervoud: teentje(s), gousse(s), Zehe(n), clove(s)', () => {
    assert.equal(vertaal('nl', 'recept.eenheid.teentje'), 'teentje(s)');
    assert.equal(vertaal('fr', 'recept.eenheid.teentje'), 'gousse(s)');
    assert.equal(vertaal('de', 'recept.eenheid.teentje'), 'Zehe(n)');
    assert.equal(vertaal('en', 'recept.eenheid.teentje'), 'clove(s)');
  });
  test('de info van In huis belooft niet meer dat je de eenheid kunt wijzigen', () => {
    assert.doesNotMatch(vertaal('nl', 'pagina.frigoInfo'), /hoeveelheid en de eenheid aan/);
  });
});

describe('invoerveld losse producten (WEEK-235)', () => {
  test('de lijst heeft een eigen tekst, niet die van de frigo ("al in huis")', () => {
    for (const taal of TALEN) {
      assert.notEqual(vertaal(taal, 'lijst.toevoegen'), vertaal(taal, 'frigo.toevoegen'), taal);
    }
  });
});

describe('eenheidNaam (WEEK-237)', () => {
  test('stuk en teentje volgen de taal van de app, nooit de Nederlandse code', () => {
    for (const taal of TALEN) {
      assert.equal(eenheidNaam(taal, 'stuk'), vertaal(taal, 'frigo.stuks'));
      assert.equal(eenheidNaam(taal, 'teentje'), vertaal(taal, 'recept.eenheid.teentje'));
    }
    assert.notEqual(eenheidNaam('fr', 'stuk'), 'stuk');
    assert.notEqual(eenheidNaam('en', 'teentje'), 'teentje');
  });
  test('meeteenheden en onbekende eenheden blijven ongewijzigd', () => {
    assert.equal(eenheidNaam('fr', 'g'), 'g');
    assert.equal(eenheidNaam('de', 'ml'), 'ml');
    assert.equal(eenheidNaam('en', 'EL'), 'EL');
  });
});

describe('keuzes voor kooktijd en stijl', () => {
  test('elke kooktijd en stijl heeft een vertaling', async () => {
    const { KOOKTIJDEN } = await import('@/lib/planner/types');
    const { STIJLEN } = await import('@/data/recept');
    for (const k of KOOKTIJDEN) assert.ok(`kooktijd.${k}` in nl, k);
    for (const s of STIJLEN) assert.ok(`stijl.${s}` in nl, s);
  });
});

describe('afdelingen', () => {
  test('elke winkelafdeling (en "overig") heeft een vertaling', async () => {
    const { AFDELINGEN } = await import('@/data/ingredienten');
    for (const a of [...AFDELINGEN, 'overig']) assert.ok(`afdeling.${a}` in nl, a);
  });
});

describe('datumKort', () => {
  test('dag en verkorte maand volgens de taal', () => {
    assert.match(datumKort('nl', '2026-10-10T12:00:00Z'), /^10 okt/);
    assert.match(datumKort('en', '2026-10-10T12:00:00Z'), /^10 Oct/);
    assert.match(datumKort('fr', '2026-10-10T12:00:00Z'), /^10 oct/);
  });
  test('ongeldige datum geeft lege tekst', () => {
    assert.equal(datumKort('nl', 'gisteren'), '');
  });
});
