import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { bereikDatums, dagenTussen, isGeldigeIso, isoVan, kortDatum, plandagenVoorDatums, weekdagVan, geldigeBegin } from '@/lib/planner/datums';

describe('datums', () => {
  test('isoVan geeft de lokale datum als YYYY-MM-DD', () => {
    assert.equal(isoVan(new Date(2026, 9, 19, 23, 30)), '2026-10-19');
  });

  test('geldige ISO-datums; ongeldige en onbestaande dagen worden geweigerd', () => {
    assert.equal(isGeldigeIso('2026-10-19'), true);
    assert.equal(isGeldigeIso('2026-02-30'), false);
    assert.equal(isGeldigeIso('19-10-2026'), false);
    assert.equal(isGeldigeIso(undefined), false);
  });

  test('een bereik van n dagen vanaf de startdatum, begrensd op 1 tot 7', () => {
    assert.deepEqual(bereikDatums('2026-10-30', 3), ['2026-10-30', '2026-10-31', '2026-11-01']);
    assert.equal(bereikDatums('2026-10-19', 12).length, 7);
    assert.equal(bereikDatums('2026-10-19', 0).length, 1);
  });

  test('dagenTussen telt kalenderdagen, ook over een maandgrens', () => {
    assert.equal(dagenTussen('2026-10-30', '2026-11-02'), 3);
  });

  test('weekdag van een datum: 19 oktober 2026 is een maandag', () => {
    assert.equal(weekdagVan('2026-10-19'), 'maandag');
    assert.equal(weekdagVan('2026-10-18'), 'zondag');
  });

  test('plandagen: gesorteerd, zonder dubbels, binnen 7 dagen', () => {
    assert.deepEqual(plandagenVoorDatums(['2026-10-21', '2026-10-19', '2026-10-19']), [
      { dag: 'maandag', datum: '2026-10-19' },
      { dag: 'woensdag', datum: '2026-10-21' },
    ]);
    // een datum buiten de 7-daagse periode van de eerste wordt niet meegenomen
    assert.equal(plandagenVoorDatums(['2026-10-19', '2026-10-30']).length, 1);
    assert.deepEqual(plandagenVoorDatums([]), []);
  });

  test('korte datum per taal: "zo 19 okt" in het Nederlands', () => {
    assert.equal(kortDatum('2026-10-18', 'nl'), 'zo 18 okt');
    assert.equal(kortDatum('2026-10-19', 'nl'), 'ma 19 okt');
    assert.equal(kortDatum('2026-10-19', 'en'), 'Mon 19 Oct');
    assert.equal(kortDatum('onzin', 'nl'), '');
  });

  test('geeft in alle zes talen een afgekorte weekdag en datum (WEEK-93)', () => {
    const talen = ['nl', 'fr', 'de', 'en', 'es', 'pt'] as const;
    for (const taal of talen) {
      const tekst = kortDatum('2026-10-19', taal);
      assert.match(tekst, /^\S+ 19 \S+$/, `${taal}: ${tekst}`);
    }
    assert.equal(kortDatum('2026-10-19', 'fr'), 'lun 19 oct.');
    assert.equal(kortDatum('2026-10-19', 'de'), 'Mo 19 Okt.');
  });

  test('bewaart de dag in lokale tijd, ook rond middernacht (WEEK-93 regressie)', () => {
    assert.equal(kortDatum('2026-10-25', 'nl'), 'zo 25 okt');
    assert.equal(kortDatum('2026-12-31', 'nl'), 'do 31 dec');
  });
});

import { maandCellen, maandKop, weekKoppen } from '@/lib/planner/datums';

describe('kalender', () => {
  test('oktober 2026 begint op een donderdag: drie lege plekken vooraan', () => {
    const cellen = maandCellen(2026, 9);
    assert.equal(cellen[0], null);
    assert.equal(cellen[2], null);
    assert.equal(cellen[3], '2026-10-01');
    assert.equal(cellen.filter((c) => c !== null).length, 31);
    assert.equal(cellen.length % 7, 0);
  });

  test('de weekkoppen beginnen op maandag', () => {
    assert.deepEqual(weekKoppen('nl'), ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']);
    assert.equal(maandKop(2026, 9, 'nl'), 'okt 2026');
  });
});

import { dagenVoorVerzoek, voegDatumsToe } from '@/lib/planner/datums';
import { normaliseerKeuzes } from '@/lib/planner/normaliseer';

describe('plan met gekozen datums', () => {
  test('zonder datums blijft de oude weekdagvolgorde (regressie)', () => {
    assert.deepEqual(dagenVoorVerzoek({ aantalDagen: 3 }, 6), ['zondag', 'maandag', 'dinsdag']);
  });

  test('met datums krijgen de dagen de weekdag van die datums', () => {
    assert.deepEqual(dagenVoorVerzoek({ datums: ['2026-10-19', '2026-10-21'], aantalDagen: 2 }, 6), ['maandag', 'woensdag']);
  });

  test('datums worden aan de plandagen gekoppeld', () => {
    const dagen = voegDatumsToe([{ dag: 'woensdag' as const }, { dag: 'maandag' as const }], ['2026-10-19', '2026-10-21']);
    assert.deepEqual(dagen, [{ dag: 'woensdag', datum: '2026-10-21' }, { dag: 'maandag', datum: '2026-10-19' }]);
    assert.deepEqual(voegDatumsToe([{ dag: 'maandag' as const }], undefined), [{ dag: 'maandag' }]);
  });

  test('bewaarde keuzes: datums en uitgeschakelde dagen zijn geldig, onzin valt weg', () => {
    const k = normaliseerKeuzes({ datums: ['2026-10-21', '2026-10-19', '2026-10-19', 'x'], uitgesloten: ['2026-10-21'] });
    assert.deepEqual(k.datums, ['2026-10-19', '2026-10-21']);
    assert.deepEqual(k.uitgesloten, ['2026-10-21']);
  });
});

describe('geldigeBegin (WEEK-150)', () => {
  test('een periode vanaf vandaag blijft zoals ze is', () => {
    assert.deepEqual(geldigeBegin({ van: '2026-10-20', tot: '2026-10-25' }, '2026-10-20'), { van: '2026-10-20', tot: '2026-10-25' });
  });

  test('een startdag in het verleden wordt weggelaten, met de bijbehorende laatste dag', () => {
    assert.deepEqual(geldigeBegin({ van: '2026-10-19', tot: '2026-10-25' }, '2026-10-20'), {});
  });

  test('een laatste dag vóór de startdag wordt weggelaten (regressie)', () => {
    assert.deepEqual(geldigeBegin({ van: '2026-10-21', tot: '2026-10-20' }, '2026-10-20'), { van: '2026-10-21' });
  });

  test('zonder bewaarde periode is er niets voorgeselecteerd', () => {
    assert.deepEqual(geldigeBegin(undefined, '2026-10-20'), {});
  });
});
