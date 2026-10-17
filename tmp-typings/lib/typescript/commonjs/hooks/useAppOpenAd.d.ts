import type { AdHookReturns } from '../types/AdStates';
import type { RequestOptions } from '../types/RequestOptions';
import { type FullScreenAdHookOptions, type UseFullScreenAdResultWithoutReward } from './useFullScreenAd';
/** Options object accepted by the v17 call form of `useAppOpenAd`. */
export type UseAppOpenAdOptions = FullScreenAdHookOptions;
/** Result of the v17 call form. App open ads carry no reward. */
export type UseAppOpenAdResult = UseFullScreenAdResultWithoutReward;
/**
 * React Hook for App Open Ad.
 *
 * @deprecated Pass an options object instead: `useAppOpenAd({ adUnitId })`.
 * The positional form is removed in v18. The options form loads on its own,
 * accepts `autoLoad`, and reports a single `status`. See the v17 migration guide.
 *
 * @param adUnitId The Ad Unit ID for the App Open Ad. You can find this on your Google Mobile Ads dashboard. You can destroy ad instance by setting this value to null.
 * @param requestOptions Optional RequestOptions used to load the ad.
 */
export declare function useAppOpenAd(adUnitId: string | null, requestOptions?: RequestOptions): Omit<AdHookReturns, 'reward' | 'isEarnedReward'>;
/**
 * React Hook for App Open Ad.
 *
 * Loads as soon as it can, unless `autoLoad` is `false`. App open ads are
 * usually conditional on something, so `autoLoad` is the field to reach for:
 *
 * ```jsx
 * const { status, show } = useAppOpenAd({
 *   adUnitId: TestIds.APP_OPEN,
 *   autoLoad: consentReady && !isFirstRun,
 * });
 * ```
 */
export declare function useAppOpenAd(options: UseAppOpenAdOptions): UseAppOpenAdResult;
//# sourceMappingURL=useAppOpenAd.d.ts.map