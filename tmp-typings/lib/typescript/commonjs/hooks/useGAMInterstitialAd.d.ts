import type { AppEvent } from '../types/AppEvent';
import { type FullScreenAdHookOptions, type UseFullScreenAdResultWithoutReward } from './useFullScreenAd';
/**
 * Options object accepted by `useGAMInterstitialAd`.
 *
 * Options-form only: there is no deprecated positional overload.
 */
export type UseGAMInterstitialAdOptions = FullScreenAdHookOptions & {
    /**
     * Called when the ad receives a Google Ad Manager app event.
     *
     * Not mirrored into hook state. Changing this callback does not recreate the
     * ad instance; the latest function is used when an event arrives.
     */
    onAppEvent?: (event: AppEvent) => void;
};
/** Result of `useGAMInterstitialAd`. GAM interstitials carry no reward. */
export type UseGAMInterstitialAdResult = UseFullScreenAdResultWithoutReward;
/**
 * React Hook for Google Ad Manager Interstitial Ad.
 *
 * Loads as soon as it can, unless `autoLoad` is `false`. Read `status` for the
 * ad's current position in its lifecycle, and the fields beside it for what has
 * already happened to it. Pass `onAppEvent` for Ad Manager app events.
 *
 * #### Example
 *
 * ```jsx
 * const { status, show } = useGAMInterstitialAd({
 *   adUnitId: TestIds.GAM_INTERSTITIAL,
 *   autoLoad: consentReady,
 *   onAppEvent: ({ name, data }) => {
 *     console.log(name, data);
 *   },
 * });
 *
 * return <Button title="Continue" disabled={status !== 'loaded'} onPress={() => show()} />;
 * ```
 */
export declare function useGAMInterstitialAd(options: UseGAMInterstitialAdOptions): UseGAMInterstitialAdResult;
//# sourceMappingURL=useGAMInterstitialAd.d.ts.map