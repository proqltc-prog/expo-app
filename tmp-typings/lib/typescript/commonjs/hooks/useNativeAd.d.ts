import { NativeAd } from '../ads/native-ad/NativeAd';
import type { AdError } from '../types/AdError';
import type { NativeAdRequestOptions } from '../types/NativeAdRequestOptions';
/**
 * Options object accepted by `useNativeAd`.
 *
 * Options-form only: there is no positional overload.
 */
export type UseNativeAdOptions = {
    /**
     * The ad unit to load.
     *
     * `null` means there is no ad unit yet, so no request is issued and `status`
     * stays `'idle'`. Useful when the unit arrives from remote config. Changing
     * this value, including to or from `null`, destroys any owned `NativeAd`.
     */
    adUnitId: string | null;
    /**
     * Request options forwarded to `NativeAd.createForAdRequest`. Changing them
     * destroys any owned `NativeAd` and, when `autoLoad` is true, loads again.
     */
    requestOptions?: NativeAdRequestOptions;
    /**
     * Controls **automatic** loading. Defaults to `true`.
     *
     * Set it to `false` to wait for something the load depends on, such as
     * consent or SDK initialization; the hook loads as soon as it flips true.
     * Turning it back off stops future automatic loads. It does not destroy the
     * ad and does not cancel a load already in flight, because neither platform
     * exposes load cancellation.
     *
     * An explicit `retry()` still works while `autoLoad` is false.
     */
    autoLoad?: boolean;
};
/**
 * Where the native ad request is right now. Exactly one value applies at a time.
 *
 * Words match the fullscreen options-form vocabulary where they apply to a
 * load-only surface: `'idle'`, `'loading'`, `'loaded'`, `'no-fill'`, `'error'`.
 * There is no `'showing'` / `'closed'` — native ads are rendered in-tree, not
 * presented as a fullscreen overlay.
 *
 * `'no-fill'` is not a failure. Load-phase `no-fill` and `mediation-no-fill`
 * both land here, matching `useFullScreenAd` / `MultiFormatAdRequest`.
 */
export type UseNativeAdStatus = 'idle' | 'loading' | 'loaded' | 'no-fill' | 'error';
type UseNativeAdResultBase = {
    /**
     * The automatic-load policy the hook is acting on, after the default is
     * applied. Echoed so `'idle'` can be interpreted against the current policy.
     */
    autoLoad: boolean;
    /**
     * Alias for an explicit load, named for the call site it is written at:
     * retrying after `'error'` or `'no-fill'`. Also used for the first load when
     * `autoLoad` is false. Automatic loading never retries on its own.
     *
     * Concurrent calls with the same request identity coalesce onto one
     * in-flight `createForAdRequest`, so StrictMode double effects do not burn
     * two ads.
     */
    retry: () => void;
    /**
     * Destroys the owned `NativeAd` (if any) and returns `status` to `'idle'`.
     * Does not issue a new request; call `retry()` to load again.
     */
    destroy: () => void;
};
type UseNativeAdOutcome = {
    [Status in UseNativeAdStatus]: {
        status: Status;
        nativeAd: Status extends 'loaded' ? NativeAd : null;
        error: Status extends 'no-fill' | 'error' ? AdError : null;
    };
}[UseNativeAdStatus];
/**
 * Result of `useNativeAd`, discriminated by `status`.
 *
 * A `'no-fill'` populates `error` because the platform delivers one. Other
 * failures use `'error'`. Every other status carries `error: null`.
 */
export type UseNativeAdResult = UseNativeAdResultBase & UseNativeAdOutcome;
/**
 * React Hook for Native Ads.
 *
 * Owns the `NativeAd` lifecycle so callers do not leak inventory when a
 * component unmounts before `createForAdRequest` resolves, or when the ad unit
 * / request identity changes. Late resolutions after cleanup destroy the
 * returned ad and never publish it.
 *
 * Loads as soon as it can, unless `autoLoad` is `false`. Read `status` for the
 * request's current position; `nativeAd` is non-null only when `status` is
 * `'loaded'`.
 *
 * #### Example
 *
 * ```jsx
 * const { status, nativeAd, retry } = useNativeAd({
 *   adUnitId: TestIds.NATIVE,
 *   autoLoad: consentReady,
 * });
 *
 * if (status === 'loaded' && nativeAd) {
 *   return <NativeAdView nativeAd={nativeAd} />;
 * }
 * if (status === 'error' || status === 'no-fill') {
 *   return <Button title="Retry" onPress={retry} />;
 * }
 * return null;
 * ```
 */
export declare function useNativeAd(options: UseNativeAdOptions): UseNativeAdResult;
export {};
//# sourceMappingURL=useNativeAd.d.ts.map