import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  categorieNaam,
  dagSleutel,
  datumKort,
  hoeveelheidTekst,
  losHoeveelheidTekst,
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
    assert.deepEqual([...TALEN].sort(), ['de', 'en', 'es', 'fr', 'nl', 'pt']);
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
    assert.equal(vertaalAantal('pt', 'algemeen.personen', 0), '0 pessoas');
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
    assert.equal(kiesTaal(['fr-BE'], 'es'), 'fr');
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

describe('losHoeveelheidTekst (WEEK-180)', () => {
  test('stuks voluit in de taal, in enkelvoud en meervoud', () => {
    assert.equal(losHoeveelheidTekst('nl', 2, 'stuk'), '2 stuks');
    assert.equal(losHoeveelheidTekst('nl', 1, 'stuk'), '1 stuk');
    assert.equal(losHoeveelheidTekst('fr', 3, 'stuk'), '3 pièces');
    assert.equal(losHoeveelheidTekst('en', 1.5, undefined), '1.5 pieces');
  });
  test('gram en ml zoals overal; geen hoeveelheid geeft lege tekst', () => {
    assert.equal(losHoeveelheidTekst('nl', 250, 'g'), '250 g');
    assert.equal(losHoeveelheidTekst('nl', 1500, 'ml'), '1.500 ml');
    assert.equal(losHoeveelheidTekst('nl', undefined, 'g'), '');
  });
});

describe('keuzes voor kooktijd en stijl', () => {
  test('elke kooktijd en stijl heeft een vertaling', async () => {
    const { KOOKTIJDEN } = await import('@/lib/planner/types');
    const { STIJLEN } = await import('@/data/receptenbank');
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
