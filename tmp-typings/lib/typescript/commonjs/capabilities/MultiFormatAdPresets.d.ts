import type { MultiFormatAdRequestOptions } from '../types/MultiFormatAd';
import type { MultiFormatBannerSize } from '../types/MultiFormatBannerSize';
/**
 * Multi-format request presets. Return plain `MultiFormatAdRequestOptions`, so
 * they drop straight into the `requestOptions` slot of a `MultiFormatAdConfig`
 * and the ad unit stays at the top level beside it.
 */
export declare const MultiFormatAdPresets: {
    readonly nativeOrBanner: (bannerSizes: MultiFormatBannerSize[]) => MultiFormatAdRequestOptions;
};
//# sourceMappingURL=MultiFormatAdPresets.d.ts.map