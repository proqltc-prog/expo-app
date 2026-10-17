import { AdEventType } from '../AdEventType';
import { GAMAdEventType } from '../GAMAdEventType';
import { RewardedAdEventType } from '../RewardedAdEventType';
import type { AdErrorPayload } from './AdError';
import { AppEvent } from './AppEvent';
import type { PaidEvent } from './PaidEventListener';
import { RewardedAdReward } from './RewardedAdReward';
/**
 * ERROR payloads remain Error instances at runtime (NativeError) and gain
 * additive AdErrorPayload fields (`reason`, `phase`, optional `responseInfo`).
 * Intersecting with Error keeps `(error: Error) => void` handlers assignable.
 * PAID payloads are impression-level revenue (`PaidEvent`).
 */
export type AdEventPayload<T extends AdEventType | RewardedAdEventType | GAMAdEventType = never> = T extends AdEventType.ERROR ? Error & AdErrorPayload : T extends AdEventType.PAID ? PaidEvent : T extends RewardedAdEventType ? RewardedAdReward : T extends GAMAdEventType ? AppEvent : undefined;
export type AdEventListener<T extends AdEventType | RewardedAdEventType | GAMAdEventType = never> = (payload: AdEventPayload<T>) => void;
//# sourceMappingURL=AdEventListener.d.ts.map