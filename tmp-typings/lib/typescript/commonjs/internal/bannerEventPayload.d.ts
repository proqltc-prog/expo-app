import { RevenuePrecisions } from '../common/constants';
import type { PaidResponseInfo, ResponseInfo } from '../types/ResponseInfo';
export type BannerNativeEvent = {
    type: 'onAdLoaded' | 'onSizeChange';
    width: number;
    height: number;
    responseInfo?: ResponseInfo;
    responseInfoJson?: string;
} | {
    type: 'onAdOpened' | 'onAdClosed' | 'onAdImpression' | 'onAdClicked';
} | {
    type: 'onAdFailedToLoad';
    code: string;
    message: string;
    reason?: string;
    phase?: 'load' | 'show';
    responseInfo?: ResponseInfo;
    responseInfoJson?: string;
} | {
    type: 'onAppEvent';
    name: string;
    data?: string;
} | {
    type: 'onPaid';
    currency: string;
    precision: RevenuePrecisions;
    value: number;
    valueMicros?: string | null;
    responseInfo?: PaidResponseInfo;
    responseInfoJson?: string;
};
/**
 * Pure mapping from a banner native event to the public JS handler payload.
 * Returns null when the event type has no payload (opened/closed/…).
 */
export declare function bannerEventPayload(nativeEvent: BannerNativeEvent): unknown;
//# sourceMappingURL=bannerEventPayload.d.ts.map