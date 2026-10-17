import type { AdError } from '../types/AdError';
import type { MultiFormatAdConfig, MultiFormatAdHandle, MultiFormatAdRequestOptions, MultiFormatCustomNativeAdConfig, MultiFormatCustomNativeAdHandle, MultiFormatCustomNativeAdRequestOptions } from '../types/MultiFormatAd';
import type { ResponseInfo } from '../types/ResponseInfo';
/**
 * One AdLoader / GADAdLoader request that may return native and/or GAM banner,
 * and optionally a Google Ad Manager custom native ad (`customNativeFormatIds`).
 *
 * Multi-format means several formats compete for one ad. It is not multi-count:
 * `requestCount` stays 1 in v1.
 *
 * @example
 * ```ts
 * const request = MultiFormatAdRequest.create({
 *   adUnitId: gamUnitId,
 *   requestOptions: MultiFormatAdPresets.nativeOrBanner([
 *     BannerAdSize.MEDIUM_RECTANGLE,
 *   ]),
 * });
 * const { ads, errors, responseInfo } = await request.load();
 * const handle = ads[0];
 * if (handle && !handle.isStaleByPolicy()) {
 *   renderWinner(handle);
 * }
 * console.log(errors.map(error => error.reason), responseInfo?.responseId);
 * ```
 */
export declare class MultiFormatAdRequest<THandle extends MultiFormatAdHandle | MultiFormatCustomNativeAdHandle = MultiFormatAdHandle> {
    readonly adUnitId: string;
    readonly options: MultiFormatAdRequestOptions & Partial<Pick<MultiFormatCustomNativeAdRequestOptions, 'customNativeFormatIds' | 'customNativeClickHandling'>>;
    private destroyed;
    private ownedHandleIds;
    private ownedHandleExpiryClearers;
    private readonly bridgeOptions;
    private constructor();
    /**
     * Builds a request from one config object, the same object
     * `useMultiFormatAd` accepts, mirroring how `AdPools.create` takes a single
     * `AdPoolConfig`.
     *
     * Throws synchronously when the config cannot be honored without dropping a
     * format or inventing an API (empty formats, banner without sizes, illegal
     * sizes, AdMob unit + banner, requestCount ≠ 1).
     *
     * A config with `customNativeFormatIds` (`MultiFormatCustomNativeAdConfig`) returns a request
     * whose handles may also be `format: 'customNative'`; every other config keeps the
     * native / banner `MultiFormatAdHandle` type.
     */
    static create(config: MultiFormatCustomNativeAdConfig): MultiFormatAdRequest<MultiFormatAdHandle | MultiFormatCustomNativeAdHandle>;
    static create(config: MultiFormatAdConfig): MultiFormatAdRequest;
    /**
     * Imperative load. The caller owns every returned handle: `destroy()` it, and
     * evaluate `isStaleByPolicy()` before rendering, since a handle can cross the
     * configured window between load and render. The policy timer lives on the
     * handle; subscribe with `onStaleByPolicy` while holding if needed.
     *
     * Resolves the raw triple rather than a `MultiFormatLoadResult`, so there is
     * no `status` word on this path: both arrays empty is a clean no-fill, a
     * non-empty `errors` with a handle is the partial case, and a non-empty
     * `errors` with no handle is a failure. `responseInfo` is the ad server's
     * record of the response and is populated even on a clean no-fill, because a
     * response record is not a failure and so does not belong in `errors`.
     */
    load(): Promise<{
        ads: THandle[];
        errors: AdError[];
        responseInfo: ResponseInfo | null;
    }>;
    destroy(): void;
}
//# sourceMappingURL=MultiFormatAdRequest.d.ts.map