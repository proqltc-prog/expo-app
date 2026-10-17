import type { AdCapabilities } from '../types/AdCapabilities';
/**
 * Returns the static capability snapshot for this binary.
 *
 * `backend` is `'ios'`, `'android-classic'`, or `'android-next-gen'`; the
 * Android backend is chosen at native build time.
 *
 * - Fullscreen preload: `experimental` on iOS and classic Android (iOS Beta /
 *   Android limited-alpha); `supported` on Android Next-Gen for App Open /
 *   Interstitial / Rewarded.
 * - Rewarded interstitial preload: `experimental` on iOS, `unavailable` on both
 *   Android backends.
 * - Display (banner/native) preload: `emulated` on every backend.
 * - `poolResponseInfoPeek`: `supported` on iOS and Android Next-Gen,
 *   `unavailable` on classic Android.
 * - `maxManagedPoolAds` stays null (server-delivered; documented default is 6).
 *
 * Prefer presets and create-time validation for normal control flow. Read this
 * snapshot for diagnostics or to hide an unavailable UI path; do not branch on
 * the entire matrix before every request. `experimental` describes upstream
 * maturity, not a veto. `emulated` means the library supplies an honest
 * fallback and reports degradation on the resolved pool.
 *
 * @example Gate the one Android (classic and Next-Gen) format-specific hard failure
 * ```ts
 * const capabilities = getAdCapabilities();
 * if (
 *   capabilities.fullscreenPreloadFormats[AdFormat.REWARDED_INTERSTITIAL] !==
 *   'unavailable'
 * ) {
 *   await AdPools.create(
 *     AdPoolPresets.fullscreen(AdFormat.REWARDED_INTERSTITIAL, adUnitId),
 *   );
 * }
 * ```
 */
export declare function getAdCapabilities(): AdCapabilities;
//# sourceMappingURL=getAdCapabilities.d.ts.map