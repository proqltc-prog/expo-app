import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { alineas, vetteDelen } from '@/lib/opmaak';

describe('opmaak van uitlegteksten (WEEK-209)', () => {
  test('alineas splitst op een lege regel en laat lege alinea’s weg', () => {
    assert.deepEqual(alineas('Een.\n\nTwee.\n\n\n\nDrie.\n'), ['Een.', 'Twee.', 'Drie.']);
    assert.deepEqual(alineas(''), []);
  });
  test('vetteDelen haalt de vette delen eruit, in volgorde', () => {
    assert.deepEqual(vetteDelen('**Ontdek**\nDe recepten van de app.'), [
      { tekst: 'Ontdek', vet: true },
      { tekst: '\nDe recepten van de app.', vet: false },
    ]);
    assert.deepEqual(vetteDelen('Tik op **een** en **twee**.'), [
      { tekst: 'Tik op ', vet: false }, { tekst: 'een', vet: true }, { tekst: ' en ', vet: false }, { tekst: 'twee', vet: true }, { tekst: '.', vet: false },
    ]);
  });
  test('zonder sterretjes blijft alles gewone tekst; een los paar sterretjes ook', () => {
    assert.deepEqual(vetteDelen('Gewoon.'), [{ tekst: 'Gewoon.', vet: false }]);
    assert.deepEqual(vetteDelen('Los ** hier'), [{ tekst: 'Los ** hier', vet: false }]);
  });
});
