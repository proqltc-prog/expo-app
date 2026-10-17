import * as React from 'react';
import type { AdPoolConfig } from '../types/AdPool';
export type AdPoolProviderProps = {
    /**
     * Pool configs to own for the provider lifetime (typically from
     * AdPoolPresets).
     *
     * Reconciled by `poolId`, not by array identity: the provider creates pools
     * for ids that appear, destroys pools for ids that disappear, and leaves
     * existing pools untouched when only the array identity changed. A forgotten
     * `useMemo` therefore cannot tear down and recreate native pools every
     * render. `useMemo` is an optimization here, never a correctness
     * requirement.
     *
     * Reusing a `poolId` with a different config replaces that pool, because the
     * id is the identity.
     */
    pools: AdPoolConfig[];
    /**
     * When `false`, stops *future* pool creates; never destroys, cancels, or
     * unregisters already-created pools. Mirrors hook `autoLoad`: set it
     * `false` while something create depends on is still resolving (typically
     * consent), then flip `true` to resume creates. Default `true`.
     */
    enabled?: boolean;
    children: React.ReactNode;
};
/**
 * Declarative pool ownership. Creates pools for the configs it is given and
 * destroys them on unmount, reconciling by `poolId` on every render rather
 * than by array identity.
 *
 * Renders `children` unchanged and keeps no React state: it is not a context
 * provider, so it never subscribes to the pool registry. Consumers read pool
 * state through `useAdPool` / `usePooledAd`, which subscribe individually; a
 * registry subscription here would re-render the whole subtree every time any
 * pool registered or was destroyed.
 *
 * The provider owns pools, not ads already handed to consumers:
 *
 * 1. Pass configs with stable `poolId` values.
 * 2. Descendants use that same id with `useAdPool` or `usePooledAd`.
 * 3. Consumers still poll on demand, then render or show the returned ad.
 *
 * A new `pools` array with unchanged ids/configs does not recreate native
 * pools; `useMemo` is an optimization, not a correctness requirement.
 *
 * Creating a pool initializes the SDK on Android and starts preloading, so
 * pass `enabled={consentReady}` until consent is resolved. `enabled={false}`
 * stops future creates only; it never tears down existing pools.
 *
 * @example
 * ```tsx
 * const pool = AdPoolPresets.display(gamUnitId, {
 *   bannerSizes: [BannerAdSize.MEDIUM_RECTANGLE],
 * });
 *
 * function Placement() {
 *   const { status, ad, poll } = usePooledAd(pool.poolId);
 *   return (
 *     <>
 *       <Button title="Load placement" disabled={status === 'polling'} onPress={() => void poll()} />
 *       {ad?.format === AdFormat.BANNER ? <MultiFormatBannerAdView handle={ad} /> : null}
 *     </>
 *   );
 * }
 *
 * <AdPoolProvider pools={[pool]} enabled={consentReady}>
 *   <Placement />
 * </AdPoolProvider>;
 * ```
 */
export declare function AdPoolProvider(props: AdPoolProviderProps): React.ReactElement;
//# sourceMappingURL=AdPoolProvider.d.ts.map