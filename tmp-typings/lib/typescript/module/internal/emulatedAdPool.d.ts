import { AdFormat } from '../types/AdFormat';
import type { AdPool, AdPoolAvailability, AdPoolEvent, AdPoolResolvedConfig, PollResult } from '../types/AdPool';
import type { ResponseInfo } from '../types/ResponseInfo';
/**
 * Library-managed depth-1 display pool (banner / native).
 *
 * Fills via multi-format `MultiFormatAdRequest` (count 1). No backend (iOS,
 * Android classic, Android Next-Gen) has an SDK display preloader, so create always reports
 * `'pool/emulated-no-sdk-preloader'` and clamps buffer depth to 1.
 *
 * Expiry of pool-owned inventory is library-owned (Option 1): policy eviction
 * emits `expired` and does **not** unprompted forever-refill. Refill is
 * demand-gated (create + after successful poll / empty poll kick).
 */
export declare class EmulatedAdPool implements AdPool {
    readonly poolId: string;
    readonly formats: Array<AdFormat.BANNER | AdFormat.NATIVE>;
    readonly resolved: AdPoolResolvedConfig;
    private destroyed;
    private generation;
    private readonly listeners;
    private slot;
    private loadInFlight;
    private lastNoFill;
    private readonly pollTimeoutMillis;
    private readonly onDestroyed;
    private pendingDegraded;
    constructor(resolved: AdPoolResolvedConfig, onDestroyed?: () => void);
    /** Emits a create-time degraded event after the pool is registered. */
    notifyDegraded(): void;
    /** Kick the initial depth-1 fill (create is demand). */
    start(): void;
    private emit;
    private clearSlot;
    private handleAsPooledAd;
    private installSlot;
    private buildRequest;
    private ensureFilling;
    private takeSlot;
    getAvailability(): Promise<AdPoolAvailability>;
    peekResponseInfo(): Promise<ResponseInfo | null>;
    poll(): Promise<PollResult>;
    addListener(listener: (event: AdPoolEvent) => void): () => void;
    destroy(): void;
}
export declare function createEmulatedDisplayPool(resolved: AdPoolResolvedConfig, onDestroyed?: () => void): EmulatedAdPool;
//# sourceMappingURL=emulatedAdPool.d.ts.map