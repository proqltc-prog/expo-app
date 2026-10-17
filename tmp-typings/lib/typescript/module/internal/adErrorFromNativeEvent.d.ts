import type { AdError, AdErrorReason } from '../types/AdError';
import type { ResponseInfo } from '../types/ResponseInfo';
type NativeErrorEvent = {
    code: string;
    message: string;
    responseInfo?: ResponseInfo | null;
    responseInfoJson?: string;
    reason?: string;
    phase?: 'load' | 'show';
};
/**
 * Map legacy wire `code` values onto the v17 `reason` vocabulary.
 * Banner Android historically emitted `error-code-no-fill`; fullscreen emits `no-fill`.
 */
export declare function reasonFromNativeCode(code: string | undefined): AdErrorReason;
export declare function parseResponseInfoPayload<T = ResponseInfo>(source: {
    responseInfo?: T | null;
    responseInfoJson?: string | null;
} | null | undefined): T | undefined;
/**
 * Build `Error & AdErrorPayload` from a native error event.
 * Load-path defaults `phase: 'load'` so no-fill is distinct from show failures
 * (no `SHOW_FAILED` event — show failures use ERROR with phase show when wired).
 */
export declare function adErrorFromNativeEvent(errorEvent: NativeErrorEvent, namespace: string, phase?: 'load' | 'show'): AdError;
export {};
//# sourceMappingURL=adErrorFromNativeEvent.d.ts.map