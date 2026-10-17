/**
 * Emits a development-only warning at most once per `key`.
 *
 * Keyed rather than unconditional because every call site here sits on a path
 * that runs repeatedly: a hook body runs on every render, and a pool can be
 * created per screen. An unkeyed warning would flood the log and get muted,
 * which defeats the point of warning at all.
 *
 * Silent in release builds.
 */
export declare function warnOnce(key: string, message: string): void;
/** Clears the dedupe set. Test-only; not part of the public surface. */
export declare function resetWarnOnce(): void;
//# sourceMappingURL=warnOnce.d.ts.map