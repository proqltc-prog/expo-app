import type { RequestOptions } from '../types/RequestOptions';
/**
 * Options for {@link useAppOpenAdManager}.
 *
 * Options-form only: there is no positional overload. Keep {@link useAppOpenAd}
 * for one-shot load/show; this hook owns Google's AppOpenAdManager lifecycle
 * (preload, 4-hour freshness, warm-foreground show, reload after close).
 */
export type UseAppOpenAdManagerOptions = {
    /**
     * The ad unit to manage.
     *
     * `null` means there is no unit yet, so no request is issued and `status`
     * stays `'idle'`. Changing this value destroys any owned `AppOpenAd`.
     */
    adUnitId: string | null;
    /**
     * Request options forwarded to `AppOpenAd.createForAdRequest`. Changing them
     * destroys any owned ad and, when `autoLoad` is true, loads again.
     */
    requestOptions?: RequestOptions;
    /**
     * Master switch for issuing ad requests, on every path. Defaults to `true`.
     *
     * While `false` — set it so until consent / SDK init is ready — **no** path
     * issues a load: not the automatic preload, not a warm foreground, not
     * {@link UseAppOpenAdManagerResult.showAdIfAvailable}, and not a post-close
     * reload. Warm foreground and `showAdIfAvailable` still *show* an ad that is
     * already held and fresh, but they never *start* a request while it is
     * `false`. Flip it to `true` once consent is resolved to begin preloading.
     */
    autoLoad?: boolean;
};
/**
 * Where the managed app-open ad is right now. Vocabulary matches the
 * fullscreen options-form hooks where applicable.
 */
export type UseAppOpenAdManagerStatus = 'idle' | 'loading' | 'loaded' | 'showing' | 'closed' | 'no-fill' | 'error';
/**
 * Result of {@link useAppOpenAdManager}.
 *
 * - `status` — current lifecycle position.
 * - `showAdIfAvailable` — Google's show-if-ready entry point (call from a cold
 *   start loading screen; warm foreground is handled by the hook).
 * - `isShowing` — mirrors the sample `isShowingAd` guard: true from the show
 *   request until the ad closes or fails to show. Warm-foreground ads overlay
 *   the running app, so do not swap the app tree out because of it.
 */
export type UseAppOpenAdManagerResult = {
    status: UseAppOpenAdManagerStatus;
    showAdIfAvailable: () => void;
    isShowing: boolean;
};
/**
 * App-open **manager** hook aligned with Google's `AppOpenAdManager` sample and
 * app-open guidance.
 *
 * Behaviour:
 * - Preloads via manual `AppOpenAd.createForAdRequest` + `load()` (cross-backend).
 * - Treats inventory as invalid more than four hours after load
 *   (`AdStalenessGuidanceMillis.APP_OPEN`).
 * - Auto-shows on **warm** foreground only, via {@link useForeground}
 *   (background → active). Does **not** auto-show on the very first cold start
 *   — call `showAdIfAvailable()` from your loading screen for that path.
 * - On Android a foreground return caused by another library
 *   fullscreen ad Activity (interstitial / rewarded / app-open) dismissing does
 *   **not** trigger the warm-foreground auto-show, so two fullscreen ads never
 *   stack back-to-back. A real home / app-switcher return still shows. iOS
 *   does not background the app for these ads.
 * - Guards with `isShowing`; reloads after `CLOSED` and show-phase errors
 *   while `autoLoad` is not `false`.
 *
 * #### Consent
 *
 * While `autoLoad` is `false`, no path starts an ad request, so keep it
 * `false` until consent is resolved; an ad already held can still show.
 * Passing `adUnitId: null` (or not mounting the hook) is the strongest gate: it
 * prevents every load and destroys any held ad.
 *
 * #### Inventory source
 *
 * Every backend uses `AppOpenAd.createForAdRequest`. Android Next-Gen also
 * exposes SDK-managed app-open preload (`AppOpenAdPreloader` / `AdPools`
 * fullscreen app-open); composing this manager with that preloader is not yet
 * supported and is not required for a correct manager.
 *
 * #### Example
 *
 * ```jsx
 * const { status, showAdIfAvailable, isShowing } = useAppOpenAdManager({
 *   adUnitId: TestIds.APP_OPEN,
 *   autoLoad: consentReady,
 * });
 *
 * // Cold start loading screen (after the first launch, if you follow Google's
 * // "don't show on the very first app start" guidance yourself). Offer once,
 * // as soon as assets are ready, and never wait on consent: if consent is
 * // unresolved, skip the offer and continue.
 * const coldStartOffered = useRef(false);
 * useEffect(() => {
 *   if (!assetsReady || coldStartOffered.current) {
 *     return;
 *   }
 *   coldStartOffered.current = true;
 *   if (consentReady) {
 *     showAdIfAvailable();
 *   }
 * }, [assetsReady, consentReady, showAdIfAvailable]);
 * // Hold a loading screen only for this cold-start pass. Keep the app tree
 * // mounted while a warm-foreground ad shows.
 * ```
 */
export declare function useAppOpenAdManager(options: UseAppOpenAdManagerOptions): UseAppOpenAdManagerResult;
//# sourceMappingURL=useAppOpenAdManager.d.ts.map