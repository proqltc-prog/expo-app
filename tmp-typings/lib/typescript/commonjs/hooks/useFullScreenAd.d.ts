import { AppOpenAd } from '../ads/AppOpenAd';
import { InterstitialAd } from '../ads/InterstitialAd';
import { RewardedAd } from '../ads/RewardedAd';
import { RewardedInterstitialAd } from '../ads/RewardedInterstitialAd';
import type { AdError } from '../types/AdError';
import { AdShowOptions } from '../types/AdShowOptions';
import { AdHookReturns } from '../types/AdStates';
import type { PaidEvent } from '../types';
import type { RequestOptions } from '../types/RequestOptions';
import type { ResponseInfo } from '../types/ResponseInfo';
import { RewardedAdReward } from '../types/RewardedAdReward';
/** Any ad the fullscreen hooks can drive. */
export type FullScreenAd = AppOpenAd | InterstitialAd | RewardedAd | RewardedInterstitialAd;
/**
 * Options object accepted by the second call form of every fullscreen ad hook.
 *
 * Passing this instead of a positional ad unit id opts into the v17 shape:
 * the hook loads on its own, `status` reports where the ad is, and separate
 * fields report what has happened to it.
 *
 * The positional form remains a manual-load compatibility shim in v17. Move
 * consent gating into `autoLoad` when adopting this form:
 *
 * @example Positional to options form
 * ```tsx
 * // Before: useInterstitialAd(unit), then call load() from an effect.
 * const { status, show, load } = useInterstitialAd({
 *   adUnitId: unit,
 *   autoLoad: consentReady,
 * });
 *
 * // Automatic loading is once per identity. Warm another ad only when another
 * // impression is plausible; `load` has stable identity.
 * useEffect(() => {
 *   if (status === 'closed') load();
 * }, [status, load]);
 * ```
 */
export type FullScreenAdHookOptions = {
    /**
     * The ad unit to load.
     *
     * `null` means there is no ad unit yet, so no ad instance is created and
     * `status` stays `'idle'`. Useful when the unit arrives from remote config.
     * Changing this value, including to or from `null`, replaces the underlying
     * ad instance and therefore destroys the previous one.
     */
    adUnitId: string | null;
    /**
     * Request options forwarded to the underlying `createForAdRequest`.
     * Changing them replaces and destroys the previous ad instance.
     */
    requestOptions?: RequestOptions;
    /**
     * Controls **automatic** loading. Defaults to `true`.
     *
     * Set it to `false` to wait for something the load depends on, such as
     * consent or SDK initialization; the hook loads as soon as it flips true.
     * Turning it back off stops future automatic loads. It does not destroy the
     * ad and does not cancel a load already in flight, because neither platform
     * exposes load cancellation.
     *
     * An explicit `load()` or `retry()` still works while `autoLoad` is false.
     */
    autoLoad?: boolean;
};
/**
 * Where the ad is right now. Exactly one value applies at a time.
 *
 * These words mirror the surface this hook observes, the `AdEventType`
 * lifecycle, the same way `UsePooledAdStatus` mirrors `PollResult` and
 * `UseMultiFormatAdStatus` mirrors `MultiFormatLoadResult`. They are not
 * synonyms across hooks: `'closed'` here is the dismissal of a shown ad and
 * does **not** destroy anything, whereas `usePooledAd`'s `'consumed'` fires
 * when the shown ad closes and the hook destroys the spent ad.
 *
 * `'no-fill'` is not a failure. Load-phase `no-fill` and `mediation-no-fill`
 * both land here, matching `MultiFormatAdRequest`. Show-phase failures stay
 * `'error'` even when the reason looks like inventory.
 */
export type UseFullScreenAdStatus = 'idle' | 'loading' | 'loaded' | 'showing' | 'closed' | 'no-fill' | 'error';
/**
 * Result of the options call form.
 *
 * Two kinds of member, on purpose. `status` answers **where this ad is right
 * now** and is mutually exclusive. The fields below it answer **what has
 * happened to this ad** and accumulate, because those facts overlap: a user
 * can click an ad and then dismiss it, and a paid event can arrive at any
 * point. Collapsing both questions into one word would throw information away.
 *
 * Every accumulating field resets when the next `load()` starts, when
 * `adUnitId` or `requestOptions` changes, and when options-form `destroy()`
 * returns the hook to `'idle'`.
 */
type UseFullScreenAdResultBase = {
    /**
     * The automatic-load policy the hook is acting on, after the default is
     * applied.
     *
     * Echoed so `'idle'` can be interpreted against the current policy.
     * `autoLoad: false` means automatic loading is off. After options-form
     * `destroy()`, status remains `'idle'` even when this is true, until an
     * explicit `load()` or `retry()`.
     */
    autoLoad: boolean;
    /** Whether the user clicked this ad. Stays true after dismissal. */
    clicked: boolean;
    /** Whether this ad recorded an impression. */
    impression: boolean;
    /** Payload of the last impression-level revenue event for this ad. */
    revenue: PaidEvent | null;
    /** Response metadata captured when this ad loaded. */
    responseInfo: ResponseInfo | null;
    /**
     * The reward item. Populated at load with what the ad advertises, and
     * populated again when the user earns it. Read `earnedReward` to tell those
     * apart.
     */
    reward: RewardedAdReward | null;
    /** Whether the user earned the reward. */
    earnedReward: boolean;
    /**
     * Loads the ad and moves `status` to `'loading'`.
     *
     * `load`, `retry`, `show`, and `destroy` keep the same identity for the hook
     * lifetime. They sample the latest ad instance when called, so identity or
     * request changes do not leave event handlers calling a retired instance.
     *
     * Concurrent calls coalesce, so an automatic load and a manual one in the
     * same tick issue a single request. That is what keeps React StrictMode's
     * double-invoked effects from burning two ads in development.
     *
     * Stable callback identity does not freeze arguments: the callback samples
     * the latest ad instance. It is safe in dependency arrays, and handlers do
     * not retain a retired instance after `adUnitId` or request options change.
     *
     * Returns `void` deliberately: this hook never transfers ownership, so a
     * promise could only hand back what the next render already carries.
     */
    load: () => void;
    /**
     * Shows a loaded ad. Press-safe: unsafe presses are a no-op. Absorbs BOTH
     * failure channels of `MobileAd.show()` — the synchronous throw (destroyed /
     * invalid options) and the promise rejection (not loaded / already requested
     * / platform decline) — so neither escapes an `onPress`. This path
     * synthesizes no hook state; an `AdError` appears only if an ad event
     * arrives. The imperative `MobileAd.show()` keeps that two-channel contract
     * for direct callers (see its source).
     */
    show: (showOptions?: AdShowOptions) => void;
    /**
     * Destroys the current native ad.
     *
     * Options form: also creates a fresh instance with the same current
     * `adUnitId` and `requestOptions` (no instance while `adUnitId` is `null`)
     * and returns `status` to `'idle'`. `destroy()` itself does not load. When
     * `autoLoad` is true, the replacement is still not loaded automatically;
     * a later explicit `load()` or `retry()` loads it.
     *
     * Positional arguments and `useFullScreenAd(ad)` keep their existing
     * ownership: they destroy the current instance and do not create a
     * replacement.
     */
    destroy: () => void;
    /**
     * Alias for `load`, named for the call site it is written at: retrying after
     * `'error'` or `'no-fill'`. Automatic loading never retries on its own,
     * because an unprompted retry loop is a request storm.
     */
    retry: () => void;
};
type UseFullScreenAdOutcome = {
    [Status in UseFullScreenAdStatus]: {
        status: Status;
        error: Status extends 'no-fill' | 'error' ? AdError : null;
    };
}[UseFullScreenAdStatus];
/**
 * The options-form result, discriminated by `status`.
 *
 * A `'no-fill'` populates `error` because the platform delivers one, and its
 * `responseInfo.responseId` identifies the empty response. Other failures use
 * `'error'`. Every other status carries `error: null`.
 */
export type UseFullScreenAdResult = UseFullScreenAdResultBase & UseFullScreenAdOutcome;
/** Runtime and type shape for fullscreen formats that cannot carry rewards. */
export type UseFullScreenAdResultWithoutReward = Omit<UseFullScreenAdResultBase, 'reward' | 'earnedReward'> & UseFullScreenAdOutcome;
/**
 * Shared body for the four fullscreen hooks: normalize the arguments, own one
 * ad instance, run one lifecycle, and map the result to the requested shape.
 */
export declare function useFullScreenAdForm(hookName: string, createAd: (adUnitId: string, requestOptions: RequestOptions) => FullScreenAd, idOrOptions: string | null | FullScreenAdHookOptions, requestOptions: RequestOptions, includeRewardFields: true): AdHookReturns | UseFullScreenAdResult;
export declare function useFullScreenAdForm(hookName: string, createAd: (adUnitId: string, requestOptions: RequestOptions) => FullScreenAd, idOrOptions: string | null | FullScreenAdHookOptions, requestOptions: RequestOptions, includeRewardFields: false): Omit<AdHookReturns, 'reward' | 'isEarnedReward'> | UseFullScreenAdResultWithoutReward;
/**
 * Drives an ad instance the caller already created.
 *
 * Internal to the four fullscreen hooks. Kept for the imperative-instance case
 * and returns the legacy shape.
 */
export declare function useFullScreenAd(ad: FullScreenAd | null): AdHookReturns;
export {};
//# sourceMappingURL=useFullScreenAd.d.ts.map