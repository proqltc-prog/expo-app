import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// De plugin staat in <project>/plugins (CommonJS, voor `expo prebuild`).
type Manifest = { manifest: { $?: Record<string, string>; 'uses-feature'?: { $: Record<string, string> }[] } };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { maakPortraitOptioneel, FUNCTIE } = require(join(__dirname, '..', '..', 'plugins', 'withOptionalPortrait.js')) as {
  maakPortraitOptioneel: (m: Manifest) => Manifest;
  FUNCTIE: string;
};

const features = (m: Manifest) => (m.manifest['uses-feature'] ?? []).filter((f) => f.$['android:name'] === FUNCTIE);

describe('WEEK-324: scherm rechtop is geen vereiste hardwarefunctie', () => {
  test('voegt de functie toe als optioneel', () => {
    const uit = maakPortraitOptioneel({ manifest: {} });
    assert.deepEqual(features(uit).map((f) => f.$['android:required']), ['false']);
  });
  test('zet een bestaande vereiste functie op optioneel, zonder dubbel', () => {
    const uit = maakPortraitOptioneel({ manifest: { 'uses-feature': [{ $: { 'android:name': FUNCTIE, 'android:required': 'true' } }] } });
    assert.equal(features(uit).length, 1);
    assert.equal(features(uit)[0].$['android:required'], 'false');
  });
  test('laat andere functies ongemoeid en is herhaalbaar', () => {
    const camera = { $: { 'android:name': 'android.hardware.camera', 'android:required': 'false' } };
    const uit = maakPortraitOptioneel(maakPortraitOptioneel({ manifest: { 'uses-feature': [camera] } }));
    assert.equal(uit.manifest['uses-feature']!.length, 2);
    assert.equal(features(uit).length, 1);
  });
  test('regressie: app.json gebruikt de plugin en blijft rechtop', () => {
    const app = JSON.parse(readFileSync(join(__dirname, '..', '..', 'app.json'), 'utf8'));
    assert.equal(app.expo.orientation, 'portrait');
    assert.ok(app.expo.plugins.includes('./plugins/withOptionalPortrait'));
  });
});
