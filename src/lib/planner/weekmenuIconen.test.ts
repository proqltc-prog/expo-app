import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { icoonTitelSleutel, icoonUitlegSleutel, WEEKMENU_ICONEN } from '@/lib/planner/weekmenuIconen';
import { TALEN, VERTALINGEN } from '@/i18n';

describe('uitleg bij de icoontjes van het weekmenu (WEEK-264)', () => {
  test('de vier actie-iconen, het receptboekje en Gekookt, in de volgorde van de kaart', () => {
    assert.deepEqual(
      WEEKMENU_ICONEN.map((i) => i.icoon),
      ['checkmark-circle-outline', 'refresh-outline', 'create-outline', 'trash-outline', 'book-outline', 'ellipse-outline']
    );
    assert.deepEqual(WEEKMENU_ICONEN.map((i) => i.vorm), ['rond', 'rond', 'rond', 'rond', 'vak', 'knop']);
  });
  test('elk icoon heeft een titel en een uitleg in alle vier talen', () => {
    for (const taal of TALEN) {
      const v = VERTALINGEN[taal] as Record<string, string>;
      for (const i of WEEKMENU_ICONEN) {
        assert.ok(v[icoonTitelSleutel(i)]?.trim(), `${taal}: ${icoonTitelSleutel(i)}`);
        assert.ok(v[icoonUitlegSleutel(i)]?.trim(), `${taal}: ${icoonUitlegSleutel(i)}`);
      }
      assert.ok(v['planning.iconen.titel']?.trim(), `${taal}: planning.iconen.titel`);
      assert.ok(v['planning.iconen.knop']?.trim(), `${taal}: planning.iconen.knop`);
    }
  });
});
