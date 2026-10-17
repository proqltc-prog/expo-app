import { EmulatedAdPool } from './emulatedAdPool';
import type { AdPool, AdPoolAvailability, AdPoolEvent, AdPoolResolvedConfig, PollResult } from '../types/AdPool';
import type { FullscreenAdFormat } from '../types/FullscreenAdFormat';
import type { ResponseInfo } from '../types/ResponseInfo';
/** Registered pools expose notifyDegraded for create-time loud-degrade events. */
export type RegisteredAdPool = AdPool & {
    notifyDegraded(): void;
};
/**
 * Tracks first-seen response ids so poll can set observedAt when the library
 * saw availability (Option 1 / inventory-expiry canonical).
 */
export declare class SdkManagedAdPool implements AdPool {
    readonly poolId: string;
    readonly formats: FullscreenAdFormat[];
    readonly resolved: AdPoolResolvedConfig;
    private destroyed;
    private readonly listeners;
    private readonly observedResponseIds;
    private readonly nativeSubscription;
    private readonly format;
    private readonly generation;
    private readonly pollTimeoutMillis;
    constructor(resolved: AdPoolResolvedConfig, generation: number);
    /** Emits a create-time degraded event after the pool is registered. */
    notifyDegraded(): void;
    private emit;
    getAvailability(): Promise<AdPoolAvailability>;
    peekResponseInfo(): Promise<ResponseInfo | null>;
    poll(): Promise<PollResult>;
    addListener(listener: (event: AdPoolEvent) => void): () => void;
    destroy(): void;
}
export declare function beginAdPoolCreation(poolId: string, format: FullscreenAdFormat | null, cancel: () => void, supersede: (winner: Promise<AdPool>) => void, winner: Promise<AdPool>): number;
export declare function isCurrentAdPoolCreation(poolId: string, generation: number): boolean;
export declare function completeAdPoolCreation(poolId: string, generation: number): void;
/** Notifies AdPoolProvider / hooks when the registry changes. */
type RegistryListener = () => void;
export declare function subscribeAdPoolRegistry(listener: RegistryListener): () => void;
export declare function getRegisteredAdPool(poolId: string): AdPool | null;
export declare function registerAdPool(pool: RegisteredAdPool): void;
export declare function unregisterAdPool(poolId: string): void;
export declare function destroyAllAdPools(): void;
export declare function startNativePool(resolved: AdPoolResolvedConfig, generation: number): Promise<RegisteredAdPool>;
export { EmulatedAdPool };
//# sourceMappingURL=adPoolRegistry.d.ts.map