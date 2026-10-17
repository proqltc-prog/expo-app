import { MobileAdsModuleInterface } from './types/MobileAdsModule.interface';
import { RequestConfiguration } from './types/RequestConfiguration';
/** Coalesced Android GMA init; pool preload/show hard-fail without it. */
export declare function ensureMobileAdsInitialized(): Promise<void>;
declare class MobileAdsModule implements MobileAdsModuleInterface {
    constructor();
    subscribeToNativeModuleEvent(eventName: string): void;
    initialize(): Promise<import("./types").AdapterStatus[]>;
    setRequestConfiguration(requestConfiguration: RequestConfiguration): Promise<void>;
    openAdInspector(): Promise<void>;
    openDebugMenu(adUnit: string): void;
    setAppVolume(volume: number): void;
    setAppMuted(muted: boolean): void;
    setAudioSessionIsApplicationManaged(managed: boolean): void;
    registerWebView(viewTag: number): Promise<void>;
    disableMediationAdapterInitialization(): void;
    disableSdkCrashReporting(): void;
    setPublisherFirstPartyIdEnabled(enabled: boolean): Promise<void>;
    getVersion(): string;
}
export declare const MobileAds: () => MobileAdsModule;
export default MobileAds;
//# sourceMappingURL=MobileAds.d.ts.map