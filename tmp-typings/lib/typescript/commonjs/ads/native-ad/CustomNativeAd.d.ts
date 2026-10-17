import { NativeAdEventType } from '../../NativeAdEventType';
import { CustomNativeAdProps, NativeAdPaidEventPayload, NativeMediaContent } from '../../specs/modules/NativeGoogleMobileAdsNativeModule';
import type { CustomNativeAdImage, CustomNativeAdRequestOptions, CustomNativeAsset, CustomNativeClickEventPayload, CustomNativeClickHandling } from '../../types/CustomNativeAd';
import type { ResponseInfo } from '../../types/ResponseInfo';
type CustomNativeAdListenerPayload<EventType extends NativeAdEventType> = EventType extends NativeAdEventType.PAID ? NativeAdPaidEventPayload : EventType extends NativeAdEventType.CUSTOM_CLICK ? CustomNativeClickEventPayload : never;
/**
 * A Google Ad Manager custom native ad (custom native ad format).
 *
 * Unlike `NativeAd`, a custom native ad has no system-defined assets and is not rendered with
 * `NativeAdView`: read its assets by their exact Ad Manager names and build the UI yourself. You
 * must call `recordImpression()` when the ad is shown and `performClick(assetName)` when the user
 * taps it; the SDK does not track views for custom native ads.
 */
export declare class CustomNativeAd {
    readonly adUnitId: string;
    /** Library registry key. Stable for the lifetime of this ad. */
    readonly adId: string;
    /** SDK response id, or null when the backend does not expose one (classic Android). */
    readonly responseId: string | null;
    readonly responseInfo: ResponseInfo | null;
    /** The Ad Manager custom native format ID that served this ad. */
    readonly customFormatId: string;
    /** Every asset name the creative carries, verbatim (case-sensitive). */
    readonly availableAssetNames: ReadonlyArray<string>;
    /** Text and image assets keyed by their exact Ad Manager name. */
    readonly assets: Readonly<Record<string, CustomNativeAsset>>;
    /** Video asset description, or null when the creative has no media content. */
    readonly mediaContent: NativeMediaContent | null;
    readonly clickHandling: CustomNativeClickHandling;
    private nativeEventSubscription;
    private eventEmitter;
    private destroyed;
    private constructor();
    private onNativeAdEvent;
    /**
     * Returns the text asset named `assetName` (exact, case-sensitive), or null when the creative
     * has no such text asset.
     */
    getText(assetName: string): string | null;
    /**
     * Returns the image asset named `assetName` (exact, case-sensitive), or null when the creative
     * has no such image asset.
     */
    getImage(assetName: string): CustomNativeAdImage | null;
    /**
     * Returns the asset named `assetName` (exact, case-sensitive), or null when missing.
     */
    getAsset(assetName: string): CustomNativeAsset | null;
    /**
     * Records an impression. Call once the ad is visible; the SDK drops repeats for the same ad.
     */
    recordImpression(): void;
    /**
     * Reports a click on `assetName` to Google Ad Manager. The library never navigates.
     *
     * With `clickHandling: 'app'` the SDK records the click and calls the custom click handler
     * instead of navigating, which emits `NativeAdEventType.CUSTOM_CLICK`. Navigate however the app
     * prefers once this resolves (deep link, router, in-app browser, …).
     *
     * With `clickHandling: 'sdk'` the SDK navigates to the creative's own click-through.
     *
     * Resolves once the SDK has been told about the click. Rejects when the ad is unknown to native
     * (for example after `destroy()`).
     */
    performClick(assetName: string): Promise<void>;
    addAdEventListener<EventType extends NativeAdEventType>(type: EventType, listener: (payload: CustomNativeAdListenerPayload<EventType>) => void): import("react-native").EmitterSubscription;
    removeAllAdEventListeners(): void;
    destroy(): void;
    /**
     * Loads a Google Ad Manager custom native ad.
     *
     * #### Example
     *
     * ```js
     * import { CustomNativeAd, NativeAdEventType } from 'react-native-google-mobile-ads';
     *
     * const ad = await CustomNativeAd.createForAdRequest('/1234/carousel', {
     *   customFormatIds: ['12345678'],
     * });
     * const cta = ad.getText('Calltoaction');
     * const image = ad.getImage('Secondaryimage');
     * ad.recordImpression();
     * // on tap: report the click, then navigate however the app prefers
     * await ad.performClick('Calltoaction');
     * openInAppBrowser(ad.getText('Clickurl'));
     * ```
     *
     * @param adUnitId Google Ad Manager ad unit ID.
     * @param requestOptions Request options; `customFormatIds` is required.
     */
    static createForAdRequest(adUnitId: string, requestOptions: CustomNativeAdRequestOptions): Promise<CustomNativeAd>;
    /**
     * Hydrate from an already-loaded native payload (multi-format path). Package-internal.
     */
    static fromLoadedProps(adUnitId: string, props: CustomNativeAdProps, clickHandling: CustomNativeClickHandling): CustomNativeAd;
}
export {};
//# sourceMappingURL=CustomNativeAd.d.ts.map