import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

// De plugin staat in <project>/plugins (CommonJS, voor `expo prebuild`).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { voegUploadSigningToe, MERK } = require(join(__dirname, '..', '..', 'plugins', 'withUploadSigning.js')) as {
  voegUploadSigningToe: (g: string) => string;
  MERK: string;
};

const GRADLE = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            minifyEnabled false
        }
    }
}`;

describe('WEEK-324: release-build met de uploadsleutel', () => {
  test('voegt een release-ondertekening toe die de sleutel buiten het project leest', () => {
    const uit = voegUploadSigningToe(GRADLE);
    assert.ok(uit.includes(MERK));
    assert.match(uit, /release \{\s*def famenuBestand = file\(project\.findProperty\('famenuUploadProperties'\)/);
    assert.ok(uit.includes('C:/Dev/Sleutels/Famenu/upload.properties'));
    assert.ok(!/storePassword '(?!android)/.test(uit), 'geen wachtwoord in het project');
  });
  test('buildTypes.release gebruikt de uploadsleutel als ze er is, anders de debug-sleutel', () => {
    const uit = voegUploadSigningToe(GRADLE);
    assert.ok(uit.includes('signingConfig (signingConfigs.release.storeFile != null ? signingConfigs.release : signingConfigs.debug)'));
    assert.match(uit, /debug \{\s*signingConfig signingConfigs\.debug\s*\}/, 'de debug-build blijft ongewijzigd');
  });
  test('twee keer toepassen verandert niets meer', () => {
    const een = voegUploadSigningToe(GRADLE);
    assert.equal(voegUploadSigningToe(een), een);
  });
});
