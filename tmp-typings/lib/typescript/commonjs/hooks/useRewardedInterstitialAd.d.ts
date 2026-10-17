import type { AdHookReturns } from '../types/AdStates';
import type { RequestOptions } from '../types/RequestOptions';
import { type FullScreenAdHookOptions, type UseFullScreenAdResult } from './useFullScreenAd';
/** Options object accepted by the v17 call form of `useRewardedInterstitialAd`. */
export type UseRewardedInterstitialAdOptions = FullScreenAdHookOptions;
/** Result of the v17 call form, including the reward facts. */
export type UseRewardedInterstitialAdResult = UseFullScreenAdResult;
/**
 * React Hook for Rewarded Interstitial Ad.
 *
 * @deprecated Pass an options object instead:
 * `useRewardedInterstitialAd({ adUnitId })`. The positional form is removed in
 * v18. The options form loads on its own, accepts `autoLoad`, and reports a
 * single `status`. See the v17 migration guide.
 *
 * @param adUnitId The Ad Unit ID for the Rewarded Interstitial Ad. You can find this on your Google Mobile Ads dashboard. You can destroy ad instance by setting this value to null.
 * @param requestOptions Optional RequestOptions used to load the ad.
 */
export declare function useRewardedInterstitialAd(adUnitId: string | null, requestOptions?: RequestOptions): AdHookReturns;
/**
 * React Hook for Rewarded Interstitial Ad.
 *
 * Loads as soon as it can, unless `autoLoad` is `false`. Same reward semantics
 * as `useRewardedAd`: `reward` describes the offer at load and the grant once
 * `earnedReward` is true.
 *
 * Neither Android backend (classic or Next-Gen) has a preload slot for this
 * format, so pool-based warming is unavailable on Android. This hook is the
 * load-on-demand path and works on both platforms.
 */
export declare function useRewardedInterstitialAd(options: UseRewardedInterstitialAdOptions): UseRewardedInterstitialAdResult;
//# sourceMappingURL=useRewardedInterstitialAd.d.ts.map