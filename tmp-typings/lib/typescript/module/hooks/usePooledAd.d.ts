import type { AdError } from '../types/AdError';
import type { PollResult, PooledAd } from '../types/AdPool';
import { type UseAdPoolStatus } from './useAdPool';
/**
 * Members present on every arm, so they are callable without narrowing.
 *
 * `poll` and `release` keep the same identity for the life of the hook
 * instance, so listing them in a dependency array does not re-run the effect
 * or callback that depends on them. `poolId` is sampled when `poll` runs (ref
 * updated each render): a new string on a later render does not change `poll`'s
 * identity.
 */
type UsePooledAdResultBase = {
    poolStatus: UseAdPoolStatus;
    available: boolean;
    observedCount: number;
    poll: () => Promise<PollResult>;
    release: () => PooledAd | null;
};
/**
 * Poll-on-demand hook state, discriminated on `status`.
 */
export type UsePooledAdResult = UsePooledAdResultBase & ({
    status: 'idle';
    ad: null;
    error: null;
} | {
    status: 'polling';
    ad: PooledAd | null;
    error: null;
} | {
    status: 'filled';
    ad: PooledAd;
    error: null;
} | {
    status: 'empty';
    ad: null;
    error: null;
} | {
    status: 'timeout';
    ad: null;
    error: null;
} | {
    status: 'no-fill';
    ad: null;
    error: AdError;
} | {
    status: 'error';
    ad: null;
    error: AdError;
} | {
    status: 'stale-by-policy';
    ad: PooledAd | null;
    error: null;
} | {
    status: 'consumed';
    ad: null;
    error: null;
});
export type UsePooledAdStatus = UsePooledAdResult['status'];
/**
 * Poll-on-demand against a pool. Never polls during render.
 *
 * This hook is state-first: `poll()` updates `status`, `ad`, and `error`; do
 * not stash the returned ad in parallel state. It owns a filled ad until
 * `release()`:
 *
 * - a later poll supersedes and destroys the previous owned ad,
 * - unmount destroys owned inventory,
 * - concurrent polls coalesce per hook instance,
 * - calling `destroy()` while the hook owns the ad leaves dead inventory in
 *   hook state, so release first when ownership must move.
 *
 * `poolStatus` answers lookup/creation (`absent`, `creating`, `ready`,
 * `ready-degraded`, `error`); `status` answers polling (`polling`, `filled`,
 * `empty`, `timeout`, `no-fill`, `error`, `stale-by-policy`, `consumed`).
 * These vocabularies are intentionally separate. `consumed` fires when a
 * hook-owned pooled fullscreen ad that was shown emits `AdEventType.CLOSED`;
 * the hook then destroys it. That differs from the classic hook's `closed`,
 * which destroys nothing.
 *
 * `poll` and `release` keep stable callback identities while sampling the
 * latest `poolId`. Coalescing is per hook instance, not per pool: two
 * placements polling the same depth-1 pool can starve each other.
 *
 * A hook-owned fullscreen ad's `show()` keeps `PooledAd.show()`'s two error
 * channels: the promise rejects when a show was already requested or the
 * platform declines, and a destroyed ad (or invalid options with no show in
 * flight) throws synchronously. Unlike the fullscreen hooks' `show`, it is not
 * press-safe, so `.catch()` the promise and do not call it on a destroyed ad.
 *
 * @example Release when post-show events must outlive the hook
 * ```tsx
 * const { poll, release } = usePooledAd(poolConfig.poolId);
 *
 * const showNext = useCallback(async () => {
 *   const result = await poll();
 *   if (result.status !== 'filled' || result.ad.format !== AdFormat.INTERSTITIAL) return;
 *
 *   const ad = release();
 *   if (!ad || ad.format !== AdFormat.INTERSTITIAL || ad.isStaleByPolicy()) {
 *     ad?.destroy();
 *     return;
 *   }
 *   const off = ad.addAdEventListener(AdEventType.CLOSED, () => {
 *     off();
 *     ad.destroy();
 *   });
 *   // Just released and not destroyed, so show() can only reject here.
 *   await ad.show().catch(() => {
 *     off();
 *     ad.destroy();
 *   });
 * }, [poll, release]);
 * ```
 */
export declare function usePooledAd(poolId: string): UsePooledAdResult;
export {};
//# sourceMappingURL=usePooledAd.d.ts.map