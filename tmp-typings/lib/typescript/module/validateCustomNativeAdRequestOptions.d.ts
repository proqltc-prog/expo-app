import type { CustomNativeAdRequestOptions, CustomNativeClickHandling } from './types/CustomNativeAd';
/**
 * Validates a list of Ad Manager custom native format IDs.
 *
 * IDs are returned verbatim (no trimming or case changes): they must match Ad Manager exactly.
 */
export declare function validateCustomFormatIds(value: unknown, path: string): string[];
export declare function validateCustomNativeAdRequestOptions(options: CustomNativeAdRequestOptions): CustomNativeAdRequestOptions & {
    clickHandling: CustomNativeClickHandling;
};
//# sourceMappingURL=validateCustomNativeAdRequestOptions.d.ts.map