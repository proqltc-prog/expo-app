import { NativeAdEventType } from '../../NativeAdEventType';
import { NativeAdImage, NativeAdPaidEventPayload, NativeAdProps, NativeMediaContent } from '../../specs/modules/NativeGoogleMobileAdsNativeModule';
import { NativeAdRequestOptions } from '../../types';
import type { ResponseInfo } from '../../types/ResponseInfo';
type NativeAdListenerPayload<EventType extends NativeAdEventType> = EventType extends NativeAdEventType.PAID ? NativeAdPaidEventPayload : never;
/**
 * A class for loading Native Ads.
 */
export declare class NativeAd {
    readonly adUnitId: string;
    readonly responseId: string;
    /**
     * Snapshot of the loaded ad's response info, or null before load / after destroy.
     * Additive; top-level `responseId` remains the registry key.
     */
    readonly responseInfo: ResponseInfo | null;
    readonly advertiser: string | null;
    readonly body: string;
    readonly callToAction: string;
    readonly headline: string;
    readonly price: string | null;
    readonly store: string | null;
    readonly starRating: number | null;
    readonly icon: NativeAdImage | null;
    readonly images: Array<NativeAdImage> | null;
    readonly mediaContent: NativeMediaContent | null;
    readonly extras: Record<string, unknown> | null;
    private nativeEventSubscription;
    private eventEmitter;
    private destroyed;
    private constructor();
    private onNativeAdEvent;
    addAdEventListener<EventType extends NativeAdEventType>(type: EventType, listener: (payload: NativeAdListenerPayload<EventType>) => void): import("react-native").EmitterSubscription;
    removeAllAdEventListeners(): void;
    destroy(): void;
    /**
     * Creates a new NativeAd instance.
     *
     * #### Example
     *
     * ```js
     * import { NativeAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
     *
     * const nativeAd = await NativeAd.createForAdRequest(TestIds.NATIVE, {
     *   requestAgent: 'CoolAds',
     * });
     * ```
     *
     * @param adUnitId The Ad Unit ID for the Native Ad. You can find this on your Google Mobile Ads dashboard.
     * @param requestOptions Optional RequestOptions used to load the ad.
     */
    static createForAdRequest(adUnitId: string, requestOptions?: NativeAdRequestOptions): Promise<NativeAd>;
    /**
     * Hydrate a NativeAd from an already-loaded native payload (multi-format path).
     * Does not issue a second network request. Package-internal.
     */
    static fromLoadedProps(adUnitId: string, props: NativeAdProps): NativeAd;
}
export {};
//# sourceMappingURL=NativeAd.d.ts.map