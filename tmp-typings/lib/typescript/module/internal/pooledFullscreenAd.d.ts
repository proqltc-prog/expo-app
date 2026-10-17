import { allocateFullscreenRequestId } from './fullscreenRequestIds';
import type { AdShowOptions } from '../types/AdShowOptions';
import type { FullscreenAdFormat } from '../types/FullscreenAdFormat';
import type { PooledAd } from '../types/AdPool';
import type { ResponseInfo } from '../types/ResponseInfo';
export declare function allocatePooledAdId(): string;
export type CreatePooledFullscreenAdOptions = {
    format: FullscreenAdFormat;
    adUnitId: string;
    requestId: number;
    responseInfo: ResponseInfo | null;
    /**
     * When the library first observed this response id become available, or null
     * when never seen (SDK-managed provenance).
     */
    observedAt: number | null;
    stalenessWindowMillis?: number;
};
/**
 * Builds a fullscreen PooledAd from a native poll that already adopted the ad
 * into the format module under `requestId`.
 */
export declare function createPooledFullscreenAd(options: CreatePooledFullscreenAdOptions): Extract<PooledAd, {
    show: (opts?: AdShowOptions) => Promise<void>;
}>;
export { allocateFullscreenRequestId };
//# sourceMappingURL=pooledFullscreenAd.d.ts.map