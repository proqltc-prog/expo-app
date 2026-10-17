import type { AdPool, AdPoolConfig, AdPoolsApi } from './types/AdPool';
export declare const AdPools: AdPoolsApi;
export declare function createOwnedAdPool(config: AdPoolConfig): {
    promise: Promise<AdPool>;
    abandon(pool: AdPool): void;
};
//# sourceMappingURL=AdPools.d.ts.map