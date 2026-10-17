import { AdExpiry, AdStalenessWindowSource } from '../types/AdExpiry';
export type CreateAdExpiryOptions = {
    observedAt: number | null;
    /** Publisher-configured window; when omitted, guidance defaults apply. */
    stalenessWindowMillis?: number;
    /**
     * Format family for guidance defaults. App open uses four hours; everything
     * else uses one hour. Ignored when `stalenessWindowMillis` is set.
     */
    format?: 'app_open' | 'other';
    /** Injectable clock for tests. Defaults to `Date.now`. */
    now?: () => number;
};
export type AdExpiryHandle = AdExpiry & {
    /** Clears timers and listeners. Safe to call more than once. */
    clear(): void;
};
/**
 * Resolve the applied staleness window and its source tag.
 *
 * Matches inventory-expiry Option 1: configured wins; otherwise guidance
 * defaults (4h app open / 1h other).
 */
export declare function resolveStalenessWindow(options: {
    stalenessWindowMillis?: number;
    format?: 'app_open' | 'other';
}): {
    stalenessWindowMillis: number;
    stalenessWindowSource: AdStalenessWindowSource;
};
/**
 * Publisher-owned staleness policy timer for held inventory.
 *
 * Used by pooled / multi-format handles (and tests). Edge semantics match
 * the public `AdExpiry` type.
 */
export declare function createAdExpiry(options: CreateAdExpiryOptions): AdExpiryHandle;
//# sourceMappingURL=adExpiry.d.ts.map