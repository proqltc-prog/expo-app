import type { MultiFormatAdConfig, MultiFormatCustomNativeAdConfig, MultiFormatCustomNativeAdRequestOptions, MultiFormatAdFormat, MultiFormatAdRequestOptions } from './types/MultiFormatAd';
/**
 * Bridge-ready request options: `bannerSizes` as wire strings, custom native fields only when the
 * caller opted in with `MultiFormatCustomNativeAdConfig`.
 */
type NormalizedMultiFormatAdRequestOptions = Omit<MultiFormatAdRequestOptions, 'bannerSizes' | 'formats' | 'requestCount'> & Partial<Pick<MultiFormatCustomNativeAdRequestOptions, 'customNativeFormatIds' | 'customNativeClickHandling'>> & {
    formats: MultiFormatAdFormat[];
    bannerSizes?: string[];
    requestCount: 1;
};
/**
 * Validates and normalizes a multi-format request config.
 *
 * Hard-errors match the approved freeze: empty formats, banner without sizes,
 * illegal sizes, requestCount other than 1, banner without ad-manager, AdMob
 * unit ids when banner or custom native is requested.
 *
 * `bannerSizes` are normalized to wire strings (`BANNER`, `320x50`, …) for the
 * native bridge.
 */
export declare function validateMultiFormatAdConfig(config: MultiFormatAdConfig | MultiFormatCustomNativeAdConfig): {
    adUnitId: string;
    requestOptions: NormalizedMultiFormatAdRequestOptions;
};
export {};
//# sourceMappingURL=validateMultiFormatAdConfig.d.ts.map