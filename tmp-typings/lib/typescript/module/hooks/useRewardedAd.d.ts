import type { AdHookReturns } from '../types/AdStates';
import type { RequestOptions } from '../types/RequestOptions';
import { type FullScreenAdHookOptions, type UseFullScreenAdResult } from './useFullScreenAd';
/** Options object accepted by the v17 call form of `useRewardedAd`. */
export type UseRewardedAdOptions = FullScreenAdHookOptions;
/** Result of the v17 call form, including the reward facts. */
export type UseRewardedAdResult = UseFullScreenAdResult;
/**
 * React Hook for Rewarded Ad.
 *
 * @deprecated Pass an options object instead: `useRewardedAd({ adUnitId })`.
 * The positional form is removed in v18. The options form loads on its own,
 * accepts `autoLoad`, and reports a single `status`. See the v17 migration guide.
 *
 * @param adUnitId The Ad Unit ID for the Rewarded Ad. You can find this on your Google Mobile Ads dashboard. You can destroy ad instance by setting this value to null.
 * @param requestOptions Optional RequestOptions used to load the ad.
 */
export declare function useRewardedAd(adUnitId: string | null, requestOptions?: RequestOptions): AdHookReturns;
/**
 * React Hook for Rewarded Ad.
 *
 * Loads as soon as it can, unless `autoLoad` is `false`.
 *
 * `reward` is populated twice: at load with the item the ad advertises, and
 * again when the user earns it. `earnedReward` is what tells those apart.
 *
 * ```jsx
 * const { status, show, reward, earnedReward } = useRewardedAd({
 *   adUnitId: TestIds.REWARDED,
 * });
 *
 * // Before showing: reward describes what is on offer.
 * // After earning: earnedReward is true and the grant is safe to apply.
 * ```
 */
export declare function useRewardedAd(options: UseRewardedAdOptions): UseRewardedAdResult;
//# sourceMappingURL=useRewardedAd.d.ts.map