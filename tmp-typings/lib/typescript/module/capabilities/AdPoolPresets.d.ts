import type { AdPoolConfig, AdPoolPresetOverrides, DisplayPoolId, FullscreenPoolId } from '../types/AdPool';
import type { FullscreenAdFormat } from '../types/FullscreenAdFormat';
import { AdFormat } from '../types/AdFormat';
type DisplayPresetConfig<TAdUnitId extends string> = Omit<AdPoolConfig, 'poolId' | 'formats' | 'adUnitId'> & {
    poolId: DisplayPoolId<TAdUnitId>;
    formats: [AdFormat.NATIVE, AdFormat.BANNER];
    adUnitId: TAdUnitId;
};
type FullscreenPresetConfig<TFormat extends FullscreenAdFormat, TAdUnitId extends string> = Omit<AdPoolConfig, 'poolId' | 'formats' | 'adUnitId'> & {
    poolId: FullscreenPoolId<TFormat, TAdUnitId>;
    formats: [TFormat];
    adUnitId: TAdUnitId;
};
type DisplayPresetConfigCustomId<TAdUnitId extends string> = Omit<AdPoolConfig, 'formats' | 'adUnitId'> & {
    formats: [AdFormat.NATIVE, AdFormat.BANNER];
    adUnitId: TAdUnitId;
};
type FullscreenPresetConfigCustomId<TFormat extends FullscreenAdFormat, TAdUnitId extends string> = Omit<AdPoolConfig, 'formats' | 'adUnitId'> & {
    formats: [TFormat];
    adUnitId: TAdUnitId;
};
/**
 * Fullscreen buffer sized for this backend.
 *
 * Rewarded interstitial is accepted in the type for cross-platform presets,
 * but `AdPools.create` hard-errors on both Android backends (classic and
 * Next-Gen) when
 * `fullscreenPreloadFormats[REWARDED_INTERSTITIAL]` is `unavailable` (reason
 * `'pool/format-preload-unsupported'`). Check that capability before create,
 * or catch the error.
 *
 * Default `bufferSize: 1`. Google recommends 2 per preload ID; pass
 * `{ bufferSize: 2 }` to ask for that depth. The app-wide cap that depth
 * competes for is server-delivered (`maxManagedPoolAds` reports `null`).
 * Google's documented default for that app-wide cap is **6** on iOS, Android
 * classic, and Android Next-Gen; do not invent a number on the capability
 * field.
 * Depth 1 stays the default so create succeeds under a tight app-wide cap;
 * publishers that want Google's recommended depth opt in explicitly.
 *
 * Takes the same `AdPoolPresetOverrides` bag as `display`, including
 * `stalenessWindowMillis`. Pass request options as `{ requestOptions }`.
 * `formats` and `adUnitId` are not overridable: those come from the
 * positional parameters.
 */
declare function fullscreen<TFormat extends FullscreenAdFormat, TAdUnitId extends string>(format: TFormat, adUnitId: TAdUnitId, options: AdPoolPresetOverrides & {
    poolId: string;
}): FullscreenPresetConfigCustomId<TFormat, TAdUnitId>;
declare function fullscreen<TFormat extends FullscreenAdFormat, TAdUnitId extends string>(format: TFormat, adUnitId: TAdUnitId, options?: AdPoolPresetOverrides): FullscreenPresetConfig<TFormat, TAdUnitId>;
/**
 * Display pool (native + banner). Resolves to an emulated depth-1 pool
 * where no SDK preloader exists (`'pool/emulated-no-sdk-preloader'`).
 *
 * Defaults `adServer: 'ad-manager'` because the preset formats always include
 * banner (GAM-only). Override buffer, request options, banner sizes, or
 * `poolId` via `AdPoolPresetOverrides`. Pass a GAM unit id — AdMob
 * `ca-app-pub-…` units hard-error when banner is requested.
 */
declare function display<TAdUnitId extends string>(adUnitId: TAdUnitId, options: AdPoolPresetOverrides & {
    poolId: string;
}): DisplayPresetConfigCustomId<TAdUnitId>;
declare function display<TAdUnitId extends string>(adUnitId: TAdUnitId, options?: AdPoolPresetOverrides): DisplayPresetConfig<TAdUnitId>;
/**
 * Backend-aware pool config presets. Return plain AdPoolConfig objects;
 * AdPools.create validates them the same as hand-written config.
 *
 * Default `poolId` values are template literals (`display-${unit}`,
 * `fullscreen-${format}-${unit}`). Pass that same `poolId` (or the config
 * object) into `useAdPool` / `usePooledAd` so provider and consumer share one
 * typed id rather than hand-retyping the template.
 */
export declare const AdPoolPresets: {
    readonly fullscreen: typeof fullscreen;
    readonly display: typeof display;
};
export {};
//# sourceMappingURL=AdPoolPresets.d.ts.map