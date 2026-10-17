import { ConfigPlugin } from '@expo/config-plugins';
type PluginParameters = {
    androidSdk?: 'classic' | 'legacy' | 'nextgen';
    androidAppId?: string;
    iosAppId?: string;
    delayAppMeasurementInit?: boolean;
    optimizeInitialization?: boolean;
    optimizeAdLoading?: boolean;
    skAdNetworkItems?: string[];
    userTrackingUsageDescription?: string;
};
/** Keys accepted by the core Expo config plugin. Unknown keys are warned, not applied. */
export declare const KNOWN_PLUGIN_PARAMETER_KEYS: readonly ["androidSdk", "androidAppId", "iosAppId", "delayAppMeasurementInit", "optimizeInitialization", "optimizeAdLoading", "skAdNetworkItems", "userTrackingUsageDescription"];
/**
 * Warn when Expo plugin options include keys the core plugin does not apply.
 * Exported for unit tests.
 */
export declare function warnUnknownPluginParameters(params: Record<string, unknown> | undefined): void;
export declare const setAndroidSdkGradleProperties: (properties: Array<{
    type: string;
    key?: string;
    value?: string;
}>, androidSdk: NonNullable<PluginParameters["androidSdk"]>) => {
    type: string;
    key?: string;
    value?: string;
}[];
export declare const withAndroidSdk: ConfigPlugin<PluginParameters['androidSdk']>;
declare const withReactNativeGoogleMobileAds: ConfigPlugin<PluginParameters>;
export default withReactNativeGoogleMobileAds;
