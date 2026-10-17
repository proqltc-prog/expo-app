import type { AdError, AdErrorReason } from './types/AdError';
import type { AdPoolConfig, AdPoolResolvedConfig } from './types/AdPool';
/** Google-selected PreloadConfiguration default when `bufferSize` is omitted. */
export declare const GOOGLE_DEFAULT_POOL_BUFFER_SIZE = 2;
/**
 * Google's documented default app-wide preload cache limit (6), the same on
 * iOS, Android classic, and Android Next-Gen.
 * Not reported on `maxManagedPoolAds` (always null: server-delivered).
 */
export declare const DOCUMENTED_APP_WIDE_POOL_CAP = 6;
/** Emulated display pools always run at depth 1 (no SDK display preloader). */
export declare const EMULATED_DISPLAY_BUFFER_SIZE = 1;
export declare function createPoolAdError(reason: AdErrorReason, message: string): AdError;
/**
 * Validates an AdPoolConfig for single-format fullscreen SDK pools and emulated
 * display (banner/native) depth-1 pools.
 *
 * Hard-errors on impossible configs (format drop, illegal mix). Loud-degrades
 * display depth > 1 and always tags display pools as emulated.
 */
export declare function validateAdPoolConfig(config: AdPoolConfig): AdPoolResolvedConfig;
//# sourceMappingURL=validateAdPoolConfig.d.ts.map