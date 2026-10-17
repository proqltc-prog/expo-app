import type { AdError } from '../types/AdError';
import type { MultiFormatAdConfig, MultiFormatAdHandle, MultiFormatLoadResult } from '../types/MultiFormatAd';
import type { ResponseInfo } from '../types/ResponseInfo';
/**
 * Arguments to `useMultiFormatAd`: the shared request config plus its
 * automatic-load policy.
 *
 * One object, so the hook can grow new fields without a signature change, and
 * so it accepts exactly what `MultiFormatAdRequest.create` accepts.
 */
export type UseMultiFormatAdOptions = MultiFormatAdConfig & {
    /**
     * Controls **automatic** loading. Defaults to `true`.
     *
     * Set it to `false` while something the load depends on is still resolving,
     * such as consent or SDK initialization; the hook loads as soon as it flips
     * true. An explicit `load()` still works while `autoLoad` is false, and
     * samples the options current when you call it.
     *
     * While true, the hook also loads again when the request itself changes: a
     * new `adUnitId`, or different `requestOptions` contents (formats, banner
     * sizes, keywords, and the rest). A freshly allocated but content-equal
     * options object does not reload — including `MultiFormatAdPresets.*(...)`
     * called in the render body — and property order within an object is
     * ignored while array order is not. If the request changes while a load is
     * in flight, that superseded load's handles are destroyed rather than
     * published, and the latest enabled automatic request loads once after it
     * settles. If `autoLoad` is turned off before that settlement, the hook
     * returns `'idle'` while retaining the last current `responseInfo`.
     */
    autoLoad?: boolean;
};
/**
 * Members present on every arm, so they are callable without narrowing.
 *
 * `load`, `retry`, and `release` keep the same identity for the life of the
 * hook instance, the same guarantee `usePooledAd` gives. The options object is
 * sampled when `load` runs (a ref updated each render), so a fresh inline
 * object each render — including `MultiFormatAdPresets.*(...)` called in the
 * render body — does not change `load`'s identity or re-fire an effect that
 * depends only on `[load]`.
 */
type UseMultiFormatAdResultBase = {
    /**
     * The automatic-load policy the hook is acting on, after the default is
     * applied. Echoed so a permanent `'idle'` is diagnosable without putting
     * configuration inside the status union.
     */
    autoLoad: boolean;
    /**
     * The ad server's record of the most recent response, or `null` before the
     * first one. Populated on every outcome including `'no-fill'`, because a
     * response record is not a failure and so does not belong in `errors`.
     */
    responseInfo: ResponseInfo | null;
    /**
     * Issues the request and updates hook state. Never rejects. A still-current
     * load resolves a `MultiFormatLoadResult` mirroring the published hook
     * state, so the return value is optional convenience for callers that want
     * to load and render in one handler, exactly like `usePooledAd().poll()`.
     * If the request is superseded or ownership is released before settlement,
     * stale handles are destroyed and that result is not published as current
     * state. An original `'error'` or `'loaded-partial'` resolves `'error'` with
     * those errors (order and metadata preserved) and that response's
     * `responseInfo`. An original `'no-fill'`, or a discarded clean fill,
     * resolves a handle-free `'no-fill'` cleanup result carrying that
     * `responseInfo`.
     *
     * Concurrent calls coalesce onto the in-flight load, same parity as
     * `usePooledAd().poll()`, so automatic loading and a manual call in the same
     * tick — or React StrictMode in development double-invoking an effect —
     * cannot issue two network loads from this hook instance. Joiners share the
     * promise started with the options current when the flight began; after it
     * settles, the next call samples the latest arguments.
     *
     * This library performed the load, so the observed time starts at hand-off
     * and aging is only possible afterwards, while the hook holds the handles. A
     * later `load()` destroys the handles from the previous one.
     */
    load: () => Promise<MultiFormatLoadResult>;
    /**
     * Fire-and-forget `load()`, for the call site it is named after: a retry
     * button on `'error'` or `'no-fill'`. Saves consumers writing their own
     * `useCallback` wrapper just to discard the promise.
     */
    retry: () => void;
    /**
     * Hands ownership of the current handles to the caller and clears hook state
     * to `{ status: 'idle', ads: [], errors: [] }` (among the current result
     * arms), so unmount cleanup will not destroy handles someone else now owns.
     * Returns an empty array when nothing is held. The caller then owns
     * `destroy()` and the staleness check on each handle: the policy timer lives
     * on the handle, not on the hook.
     *
     * Call `release()` before you `destroy()` handles yourself. While this hook
     * still owns them, do not call `handle.destroy()`: that leaves the hook able
     * to report `loaded` / `loaded-partial` with dead inventory (same ownership
     * rule as the inner `NativeAd` on a native arm).
     *
     * Ordering is guaranteed: calling `release()` immediately after `await
     * load()` returns the handles that load just produced, without waiting for a
     * render, so the implementation tracks them in a ref alongside state.
     */
    release: () => MultiFormatAdHandle[];
};
/**
 * Multi-format hook state, discriminated on `status`.
 *
 * Narrowing mirrors `MultiFormatLoadResult` for terminal arms: a `loaded` arm
 * cannot carry errors, a `no-fill` arm cannot carry handles or errors, and an
 * `error` arm cannot carry handles. `loaded-partial` is the arm where both
 * arrays are populated. Hook-only arms are `idle`, `loading`, and
 * `stale-by-policy`.
 */
export type UseMultiFormatAdResult = UseMultiFormatAdResultBase & ({
    status: 'idle';
    ads: never[];
    errors: never[];
} | {
    status: 'loading';
    ads: MultiFormatAdHandle[];
    errors: AdError[];
} | {
    status: 'loaded';
    ads: MultiFormatAdHandle[];
    errors: never[];
} | {
    status: 'loaded-partial';
    ads: MultiFormatAdHandle[];
    errors: AdError[];
} | {
    status: 'no-fill';
    ads: never[];
    errors: never[];
} | {
    status: 'error';
    ads: never[];
    errors: AdError[];
} | {
    status: 'stale-by-policy';
    ads: MultiFormatAdHandle[];
    errors: AdError[];
});
/**
 * Status discriminant for `useMultiFormatAd`. Derived from
 * `UseMultiFormatAdResult` so the string union cannot drift from the result
 * arms.
 */
export type UseMultiFormatAdStatus = UseMultiFormatAdResult['status'];
/**
 * Multi-format request as a hook. One request, several eligible formats, one
 * winner (`requestCount` 1 in v1).
 *
 * Ownership, release ordering, never-reject load, load coalescing, and
 * `stale-by-policy` semantics match `usePooledAd`. Automatic loading, including
 * when a changed request reloads, is `UseMultiFormatAdOptions.autoLoad`.
 *
 * This hook does not require `AdPoolProvider`: one request produces one native
 * or GAM banner winner. `loaded-partial` carries both a usable handle and
 * load-scoped errors; `no-fill` carries neither handles nor errors. Narrow on
 * `status` before rendering.
 *
 * Returned callbacks have stable identity but use current arguments. With
 * automatic loading enabled, content changes to the request trigger one new
 * load; a freshly allocated content-equal options object does not. Property
 * order is ignored, array order remains significant.
 *
 * @example
 * ```tsx
 * const result = useMultiFormatAd({
 *   adUnitId: gamUnitId,
 *   requestOptions: MultiFormatAdPresets.nativeOrBanner([
 *     BannerAdSize.MEDIUM_RECTANGLE,
 *   ]),
 *   autoLoad: consentReady,
 * });
 *
 * if (result.status === 'no-fill') return <Text onPress={result.retry}>Try again</Text>;
 * if (result.status === 'error') return <Text>{result.errors[0]?.reason}</Text>;
 * if (result.status === 'stale-by-policy') return <Text onPress={result.retry}>Refresh</Text>;
 * const winner = result.ads[0];
 * return winner?.format === AdFormat.BANNER
 *   ? <MultiFormatBannerAdView handle={winner} />
 *   : winner ? <NativeAdView nativeAd={winner.ad} /> : null;
 * ```
 */
export declare function useMultiFormatAd(options: UseMultiFormatAdOptions): UseMultiFormatAdResult;
export {};
//# sourceMappingURL=useMultiFormatAd.d.ts.map