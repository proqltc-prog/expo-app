export declare enum GAMAdEventType {
    /**
     * An event fired when the ad received Ad Manager specific app event.
     *
     * The app event contains a `name` and `data`. `data` could be undefined.
     *
     * #### Example
     *
     * ```js
     * import { GAMAdEventType } from 'react-native-google-mobile-ads';
     *
     * interstitialAd.addAdEventListener(GAMAdEventType.APP_EVENT, ({ name, data }) => {
     *   console.log(`Received app event: ${name} with data: ${data}`);
     * });
     * ```
     */
    APP_EVENT = "app_event"
}
//# sourceMappingURL=GAMAdEventType.d.ts.map