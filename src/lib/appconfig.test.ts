// Controle van de app-configuratie voor de Play Store (WEEK-37).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..');
const app = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;
const pakket = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const eas = JSON.parse(readFileSync(join(root, 'eas.json'), 'utf8'));

describe('app-configuratie (WEEK-37)', () => {
  test('naam Famenu en vaste interne naam be.famenu.app', () => {
    assert.equal(app.name, 'Famenu');
    assert.equal(app.android.package, 'be.famenu.app');
    assert.equal(app.ios.bundleIdentifier, 'be.famenu.app');
  });

  test('versie in app.json gelijk aan package.json', () => {
    assert.equal(app.version, pakket.version);
  });

  test('iconen bestaan', () => {
    for (const pad of [app.icon, app.android.adaptiveIcon.foregroundImage]) {
      assert.ok(existsSync(join(root, pad)), `${pad} ontbreekt`);
    }
  });

  test('enkel de camera, geen microfoon', () => {
    assert.ok(app.android.blockedPermissions.includes('android.permission.RECORD_AUDIO'));
    const camera = app.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-camera');
    assert.equal(camera[1].recordAudioAndroid, false);
  });

  test('EAS: APK om te testen, AAB voor de Play Store', () => {
    assert.equal(eas.build.preview.android.buildType, 'apk');
    assert.equal(eas.build.production.android.buildType, 'app-bundle');
  });
});
