/**
 * Record that a library fullscreen ad Activity has been presented (`OPENED`).
 * Cancels any pending post-close grace window.
 */
export declare function markFullscreenAdOpened(): void;
/**
 * Record that a library fullscreen ad Activity has dismissed (`CLOSED`, or
 * `destroy()` while still presenting). When no ad remains presenting, arms a
 * short grace window so a warm foreground caused by this very dismissal is
 * still treated as "an ad is present".
 *
 * Call sites may also invoke this on a show-phase `ERROR`, but that is
 * defensive only (see the module header): such an error has no prior `OPENED`,
 * so the per-instance guard prevents any decrement.
 */
export declare function markFullscreenAdClosed(): void;
/**
 * True while a library fullscreen ad Activity is presenting, or within the
 * brief post-close grace window. Consulted before a warm-foreground app-open
 * auto-show so a return caused by a library ad dismissing does not stack a
 * second fullscreen ad.
 */
export declare function isFullscreenAdPresenting(now?: number): boolean;
/**
 * Test-only: reset the module singleton between tests.
 *
 * @internal
 */
export declare function __resetFullscreenAdPresenceForTests(): void;
//# sourceMappingURL=fullscreenAdPresence.d.ts.map