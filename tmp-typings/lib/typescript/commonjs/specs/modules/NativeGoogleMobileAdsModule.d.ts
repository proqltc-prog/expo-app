import type { TurboModule } from 'react-native';
import type { Double, UnsafeObject } from 'react-native/Libraries/Types/CodegenTypes';
import { AdapterStatus } from '../../types';
export type NativeGoogleMobileAdsConstants = {
    sdkVersion: string;
    backend: string;
};
export interface Spec extends TurboModule {
    getConstants(): NativeGoogleMobileAdsConstants;
    initialize(): Promise<AdapterStatus[]>;
    setRequestConfiguration(requestConfiguration?: UnsafeObject): Promise<void>;
    openAdInspector(): Promise<void>;
    openDebugMenu(adUnit: string): void;
    setAppVolume(volume: number): void;
    setAppMuted(muted: boolean): void;
    setAudioSessionIsApplicationManaged(managed: boolean): void;
    registerWebView(viewTag: Double): Promise<void>;
}
declare const _default: Spec;
export default _default;
//# sourceMappingURL=NativeGoogleMobileAdsModule.d.ts.map