// WEEK-324: de app draait enkel rechtop (orientation "portrait"). Android leidt daaruit de hardwarefunctie
// android.hardware.screen.portrait af als *vereist*, waardoor Google Play de app verbergt voor sommige tablets,
// Chromebooks en XR-toestellen. Deze plugin verklaart die functie uitdrukkelijk als optioneel.
// De map android/ wordt bij elke `expo prebuild` opnieuw gemaakt; daarom zet deze plugin het telkens terug.
const { withAndroidManifest } = require('expo/config-plugins');

const FUNCTIE = 'android.hardware.screen.portrait';

/** Zet <uses-feature android:name="android.hardware.screen.portrait" android:required="false"/> in het manifest. */
function maakPortraitOptioneel(manifest) {
  const root = manifest.manifest;
  const lijst = (root['uses-feature'] = root['uses-feature'] ?? []);
  const bestaand = lijst.find((f) => f.$?.['android:name'] === FUNCTIE);
  if (bestaand) bestaand.$['android:required'] = 'false';
  else lijst.push({ $: { 'android:name': FUNCTIE, 'android:required': 'false' } });
  return manifest;
}

const withOptionalPortrait = (config) =>
  withAndroidManifest(config, (cfg) => {
    cfg.modResults = maakPortraitOptioneel(cfg.modResults);
    return cfg;
  });

module.exports = withOptionalPortrait;
module.exports.maakPortraitOptioneel = maakPortraitOptioneel;
module.exports.FUNCTIE = FUNCTIE;
