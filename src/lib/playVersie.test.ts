import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { versionCodeVan } from './playVersie';

const ROOT = join(__dirname, '..', '..');
const lees = (bestand: string) => JSON.parse(readFileSync(join(ROOT, bestand), 'utf8'));

describe('WEEK-324: versionCode voor Google Play', () => {
  test('volgt uit de versie en stijgt met elke nieuwe versie', () => {
    assert.equal(versionCodeVan('0.161.0'), 161000);
    assert.equal(versionCodeVan('1.2.3'), 1002003);
    assert.ok(versionCodeVan('0.161.1')! > versionCodeVan('0.161.0')!);
    assert.ok(versionCodeVan('0.162.0')! > versionCodeVan('0.161.9')!);
    assert.ok(versionCodeVan('1.0.0')! > versionCodeVan('0.999.999')!);
  });
  test('ongeldige versie geeft geen versionCode', () => {
    assert.equal(versionCodeVan('0.161'), undefined);
    assert.equal(versionCodeVan('x'), undefined);
    assert.equal(versionCodeVan('0.1000.0'), undefined);
  });
  test('regressie: app.json heeft de versionCode die bij de versie hoort (verhoog ze samen)', () => {
    const app = lees('app.json').expo;
    assert.equal(app.version, lees('package.json').version);
    assert.equal(app.android.versionCode, versionCodeVan(app.version));
  });
  test('regressie: de upload-ondertekening staat als plugin in app.json', () => {
    assert.ok(lees('app.json').expo.plugins.includes('./plugins/withUploadSigning'));
  });
});
