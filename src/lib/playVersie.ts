// WEEK-324: het versienummer voor Google Play (versionCode). Elke upload moet een hoger nummer hebben.
// Het volgt uit de versie (SemVer): 0.161.0 → 161000, 1.2.3 → 1002003. Zo stijgt het vanzelf bij elke nieuwe versie.

/** De versionCode bij een versie "major.minor.patch"; undefined bij een ongeldige versie. */
export function versionCodeVan(versie: string): number | undefined {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(versie.trim());
  if (!m) return undefined;
  const [major, minor, patch] = m.slice(1).map(Number);
  if (minor > 999 || patch > 999) return undefined;
  return major * 1_000_000 + minor * 1_000 + patch;
}
