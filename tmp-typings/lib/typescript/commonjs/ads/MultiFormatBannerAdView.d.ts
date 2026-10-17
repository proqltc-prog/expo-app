import React from 'react';
import type { ViewProps } from 'react-native';
import { AdFormat } from '../types/AdFormat';
import type { MultiFormatAdHandle } from '../types/MultiFormatAd';
export type MultiFormatBannerAdHandle = Extract<MultiFormatAdHandle, {
    format: AdFormat.BANNER;
}>;
export type MultiFormatBannerAdViewProps = ViewProps & {
    /**
     * Banner handle from `MultiFormatAdRequest.load()` / `useMultiFormatAd`.
     * Attach-only: must not issue a second ad request.
     * Typed as banner-only: non-banner handles are a compile-time error.
     *
     * The `AdFormat.BANNER` arm of `PooledAd` is structurally identical, so a
     * polled banner can be passed here directly. Both arms carry `AdIdentity`,
     * `AdExpiry`, and a provenance tag.
     */
    handle: MultiFormatBannerAdHandle;
};
/**
 * Renders a multi-format request banner handle.
 *
 * Attach-only: the handle already owns the loaded inventory. Pass the handle
 * once; double-attach is rejected by the hooks that own destruction.
 */
export declare function MultiFormatBannerAdView({ handle, style, ...viewProps }: MultiFormatBannerAdViewProps): React.JSX.Element;
//# sourceMappingURL=MultiFormatBannerAdView.d.ts.map