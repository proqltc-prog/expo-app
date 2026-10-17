/**
 * A custom hook that invokes a callback when the app transitions to the foreground.
 *
 * Fires on the React Native `AppState` `background → active` transition. Note
 * that on **Android** this transition also occurs when another Activity that
 * covered the host `ReactActivity` goes away — including the Google Mobile Ads
 * SDK's own fullscreen ad Activities (interstitial / rewarded / app-open). If
 * your callback shows a fullscreen ad, guard against stacking two ads
 * back-to-back; {@link useAppOpenAdManager} already does this for its own
 * warm-foreground auto-show.
 *
 * @param {Function} callback - The function to be called when the app has come to the foreground.
 */
export declare function useForeground(callback: () => void): void;
//# sourceMappingURL=useForeground.d.ts.map