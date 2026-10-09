import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_OPDRACHTEN, normaliseerOpdrachten, voegOpdrachtToe } from '@/lib/opdrachten';

describe('voegOpdrachtToe', () => {
  test('de nieuwste opdracht staat vooraan', () => {
    assert.deepEqual(voegOpdrachtToe(['a', 'b'], 'c'), ['c', 'a', 'b']);
  });

  test('bewaart er maximaal 3', () => {
    assert.equal(MAX_OPDRACHTEN, 3);
    assert.deepEqual(voegOpdrachtToe(['a', 'b', 'c'], 'd'), ['d', 'a', 'b']);
  });

  test('dezelfde opdracht staat er maar één keer in en schuift naar voren', () => {
    assert.deepEqual(voegOpdrachtToe(['5 dagen geen vlees', 'snel'], '  5 Dagen  geen vlees '), ['5 Dagen geen vlees', 'snel']);
  });

  test('lege opdrachten worden niet bewaard', () => {
    assert.deepEqual(voegOpdrachtToe(['a'], '   '), ['a']);
  });

  test('regels in een opdracht blijven behouden', () => {
    assert.deepEqual(voegOpdrachtToe([], 'regel 1\nregel 2'), ['regel 1\nregel 2']);
  });
});

describe('normaliseerOpdrachten', () => {
  test('leest bewaarde geschiedenis veilig in', () => {
    assert.deepEqual(normaliseerOpdrachten(['a', 3, '', 'b', 'A', 'c', 'd']), ['a', 'b', 'c']);
    assert.deepEqual(normaliseerOpdrachten('rommel'), []);
    assert.deepEqual(normaliseerOpdrachten(null), []);
  });
});
