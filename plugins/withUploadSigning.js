// WEEK-324: de release-build (APK en AAB voor Google Play) ondertekenen met de eigen uploadsleutel.
// De map android/ wordt bij elke `expo prebuild` opnieuw gemaakt; daarom zet deze plugin de ondertekening telkens terug.
// De sleutel en het wachtwoord staan NIET in het project: enkel in een bestand op de pc van de eigenaar
// (standaard C:/Dev/Sleutels/Famenu/upload.properties; ander pad via de Gradle-eigenschap famenuUploadProperties).
// Ontbreekt dat bestand (bv. op GitHub), dan blijft de release-build met de debug-sleutel ondertekend, zoals vroeger.
const { withAppBuildGradle } = require('expo/config-plugins');

const MERK = '// famenu-upload-signing (WEEK-324)';
const STANDAARD_PAD = 'C:/Dev/Sleutels/Famenu/upload.properties';

const RELEASE_SIGNING = `
        ${MERK}
        release {
            def famenuBestand = file(project.findProperty('famenuUploadProperties') ?: '${STANDAARD_PAD}')
            if (famenuBestand.exists()) {
                def famenu = new Properties()
                famenuBestand.withInputStream { famenu.load(it) }
                storeFile file(famenu['storeFile'])
                storePassword famenu['storePassword']
                keyAlias famenu['keyAlias']
                keyPassword famenu['keyPassword']
            }
        }`;

/** Voegt de upload-ondertekening toe aan app/build.gradle. Doet niets als ze er al staat. */
function voegUploadSigningToe(gradle) {
  if (gradle.includes(MERK)) return gradle;
  const debugBlok = /(signingConfigs\s*\{\s*debug\s*\{[^}]*\})/;
  if (!debugBlok.test(gradle)) throw new Error('withUploadSigning: signingConfigs.debug niet gevonden in app/build.gradle');
  let uit = gradle.replace(debugBlok, `$1${RELEASE_SIGNING}`);
  // In buildTypes.release: de uploadsleutel als ze er is, anders de debug-sleutel.
  const releaseType = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!releaseType.test(uit)) throw new Error('withUploadSigning: buildTypes.release niet gevonden in app/build.gradle');
  uit = uit.replace(releaseType, '$1signingConfig (signingConfigs.release.storeFile != null ? signingConfigs.release : signingConfigs.debug)');
  return uit;
}

const withUploadSigning = (config) =>
  withAppBuildGradle(config, (c) => {
    c.modResults.contents = voegUploadSigningToe(c.modResults.contents);
    return c;
  });

module.exports = withUploadSigning;
module.exports.voegUploadSigningToe = voegUploadSigningToe;
module.exports.MERK = MERK;
